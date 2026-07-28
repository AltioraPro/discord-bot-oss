import type { Env } from "../config/env";
import { RANK_KEYS, type RankKey } from "../contracts/ranks";

export interface RoleConfig {
  /** Roles the bot is allowed to add or remove: configured ranks plus premium. */
  managedRoleIds: () => string[];
  premiumRoleId: string | undefined;
  rankRoleIds: Record<RankKey, string | undefined>;
}

const ENV_KEY_BY_RANK: Record<RankKey, keyof Env> = {
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

/** Reads the role environment into a typed configuration. Pure. */
export function roleConfig(env: Env): RoleConfig {
  const rankRoleIds = Object.fromEntries(
    RANK_KEYS.map((rank) => [
      rank,
      env[ENV_KEY_BY_RANK[rank]] as string | undefined,
    ])
  ) as Record<RankKey, string | undefined>;

  const premiumRoleId = env.DISCORD_ROLE_PREMIUM;

  return {
    managedRoleIds: () =>
      [...Object.values(rankRoleIds), premiumRoleId].filter(
        (id): id is string => id !== undefined
      ),
    premiumRoleId,
    rankRoleIds,
  };
}
