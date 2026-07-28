import { describe, expect, test } from "bun:test";
import { parseEnv } from "../config/env";
import { roleConfig } from "./config";

const NEW_ROLE = "111111111111111111";
const CHAMPION_ROLE = "222222222222222222";
const PREMIUM_ROLE = "333333333333333333";

function envWith(
  overrides: Record<string, string | undefined>
): ReturnType<typeof parseEnv> {
  return parseEnv({
    DEEPWORK_VOICE_CHANNEL_IDS: "123456789012345678",
    DISCORD_BOT_TOKEN: "a-discord-bot-token",
    DISCORD_GUILD_ID: "345678901234567890",
    WEBHOOK_SECRET: "a-sufficiently-long-secret",
    ...overrides,
  });
}

describe("roleConfig", () => {
  test("maps configured ranks to their role ids", () => {
    const config = roleConfig(
      envWith({
        DISCORD_ROLE_CHAMPION: CHAMPION_ROLE,
        DISCORD_ROLE_NEW: NEW_ROLE,
      })
    );

    expect(config.rankRoleIds.NEW).toBe(NEW_ROLE);
    expect(config.rankRoleIds.CHAMPION).toBe(CHAMPION_ROLE);
  });

  test("leaves unconfigured ranks undefined", () => {
    const config = roleConfig(envWith({}));

    expect(config.rankRoleIds.IMMORTAL).toBeUndefined();
    expect(config.premiumRoleId).toBeUndefined();
  });

  test("exposes the premium role", () => {
    const config = roleConfig(envWith({ DISCORD_ROLE_PREMIUM: PREMIUM_ROLE }));

    expect(config.premiumRoleId).toBe(PREMIUM_ROLE);
  });

  test("managed roles are every configured rank id plus premium", () => {
    const config = roleConfig(
      envWith({
        DISCORD_ROLE_CHAMPION: CHAMPION_ROLE,
        DISCORD_ROLE_NEW: NEW_ROLE,
        DISCORD_ROLE_PREMIUM: PREMIUM_ROLE,
      })
    );

    expect(
      [...config.managedRoleIds()].sort((a, b) => a.localeCompare(b))
    ).toEqual(
      [NEW_ROLE, CHAMPION_ROLE, PREMIUM_ROLE].sort((a, b) => a.localeCompare(b))
    );
  });

  test("managed roles are empty when nothing is configured", () => {
    expect(roleConfig(envWith({})).managedRoleIds()).toEqual([]);
  });
});
