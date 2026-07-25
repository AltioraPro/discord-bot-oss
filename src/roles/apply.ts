import type { Client } from "discord.js";
import type { RankKey } from "../contracts/ranks";
import { logger } from "../lib/logger";
import type { RoleConfig } from "./config";
import { computeRoleDiff } from "./diff";

export interface RoleSyncRequest {
  discordId: string;
  isPro: boolean;
  rank: RankKey;
}

export interface RoleSyncResult {
  discordId: string;
  error?: string;
  success: boolean;
}

/**
 * Builds a function that applies one rank sync to Discord.
 *
 * Every failure is caught and returned rather than thrown, so a batch never
 * collapses on one bad member. Messages name the likely cause so an operator
 * can act on them.
 */
export function createRoleApplier(
  client: Client,
  guildId: string,
  config: RoleConfig
): (request: RoleSyncRequest) => Promise<RoleSyncResult> {
  return async ({ discordId, isPro, rank }) => {
    try {
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(discordId);

      const diff = computeRoleDiff({
        config,
        currentRoleIds: [...member.roles.cache.keys()],
        isPro,
        rank,
      });

      if (!diff.ok) {
        return { discordId, error: diff.error, success: false };
      }

      if (diff.toAdd.length > 0) {
        await member.roles.add(diff.toAdd, "Rank sync");
      }
      if (diff.toRemove.length > 0) {
        await member.roles.remove(diff.toRemove, "Rank sync");
      }

      logger.info("Applied a rank sync", {
        added: diff.toAdd.length,
        discordId,
        rank,
        removed: diff.toRemove.length,
      });

      return { discordId, success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("Rank sync failed", { discordId, reason: message });
      return {
        discordId,
        error: `Could not sync ${discordId}: ${message}. Check the member is in the guild and the bot has Manage Roles above the target roles.`,
        success: false,
      };
    }
  };
}
