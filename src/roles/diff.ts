import type { RankKey } from "../contracts/ranks";
import type { RoleConfig } from "./config";

export interface RoleDiffInput {
  config: RoleConfig;
  currentRoleIds: readonly string[];
  isPro: boolean;
  rank: RankKey;
}

export type RoleDiff =
  | { error: string; ok: false }
  | { ok: true; toAdd: string[]; toRemove: string[] };

const ENV_HINT_BY_RANK: Record<RankKey, string> = {
  BEGINNER: "DISCORD_ROLE_BEGINNER",
  CHAMPION: "DISCORD_ROLE_CHAMPION",
  EXPERT: "DISCORD_ROLE_EXPERT",
  GRANDMASTER: "DISCORD_ROLE_GRANDMASTER",
  IMMORTAL: "DISCORD_ROLE_IMMORTAL",
  LEGEND: "DISCORD_ROLE_LEGEND",
  MASTER: "DISCORD_ROLE_MASTER",
  NEW: "DISCORD_ROLE_NEW",
  RISING: "DISCORD_ROLE_RISING",
};

/**
 * Decides which roles to add and remove for a member.
 *
 * The only roles ever removed are ones the configuration marks as managed, so
 * a member's unrelated roles are structurally safe. `isPro` is authoritative:
 * false means the premium role is removed if present.
 */
export function computeRoleDiff(input: RoleDiffInput): RoleDiff {
  const { config, currentRoleIds, isPro, rank } = input;

  const rankRoleId = config.rankRoleIds[rank];

  if (!rankRoleId) {
    return {
      error: `No Discord role is configured for rank ${rank}. Set ${ENV_HINT_BY_RANK[rank]}.`,
      ok: false,
    };
  }

  if (isPro && !config.premiumRoleId) {
    return {
      error:
        "Premium was requested but no premium role is configured. Set DISCORD_ROLE_PREMIUM.",
      ok: false,
    };
  }

  const desired = new Set<string>([rankRoleId]);
  if (isPro && config.premiumRoleId) {
    desired.add(config.premiumRoleId);
  }

  const managed = new Set(config.managedRoleIds());
  const current = new Set(currentRoleIds);

  const toAdd = [...desired].filter((id) => !current.has(id));
  const toRemove = [...current].filter(
    (id) => managed.has(id) && !desired.has(id)
  );

  return { ok: true, toAdd, toRemove };
}
