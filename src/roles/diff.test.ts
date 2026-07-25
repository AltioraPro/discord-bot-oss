import { describe, expect, test } from "bun:test";
import type { RoleConfig } from "./config";
import { computeRoleDiff } from "./diff";

const NEW_ROLE = "100000000000000000";
const CHAMPION_ROLE = "200000000000000000";
const IMMORTAL_ROLE = "300000000000000000";
const PREMIUM_ROLE = "400000000000000000";
const MODERATOR_ROLE = "900000000000000000";

function config(): RoleConfig {
  const rankRoleIds = {
    BEGINNER: undefined,
    CHAMPION: CHAMPION_ROLE,
    EXPERT: undefined,
    GRANDMASTER: undefined,
    IMMORTAL: IMMORTAL_ROLE,
    LEGEND: undefined,
    MASTER: undefined,
    NEW: NEW_ROLE,
    RISING: undefined,
  };
  return {
    managedRoleIds: () => [
      NEW_ROLE,
      CHAMPION_ROLE,
      IMMORTAL_ROLE,
      PREMIUM_ROLE,
    ],
    premiumRoleId: PREMIUM_ROLE,
    rankRoleIds,
  };
}

describe("computeRoleDiff", () => {
  test("adds the rank role to a member who has none", () => {
    const diff = computeRoleDiff({
      config: config(),
      currentRoleIds: [],
      isPro: false,
      rank: "CHAMPION",
    });

    expect(diff).toEqual({ ok: true, toAdd: [CHAMPION_ROLE], toRemove: [] });
  });

  test("replaces the old rank role with the new one", () => {
    const diff = computeRoleDiff({
      config: config(),
      currentRoleIds: [NEW_ROLE],
      isPro: false,
      rank: "CHAMPION",
    });

    expect(diff).toEqual({
      ok: true,
      toAdd: [CHAMPION_ROLE],
      toRemove: [NEW_ROLE],
    });
  });

  test("adds premium when the member becomes pro", () => {
    const diff = computeRoleDiff({
      config: config(),
      currentRoleIds: [CHAMPION_ROLE],
      isPro: true,
      rank: "CHAMPION",
    });

    expect(diff).toEqual({ ok: true, toAdd: [PREMIUM_ROLE], toRemove: [] });
  });

  test("removes premium when the member is no longer pro", () => {
    const diff = computeRoleDiff({
      config: config(),
      currentRoleIds: [CHAMPION_ROLE, PREMIUM_ROLE],
      isPro: false,
      rank: "CHAMPION",
    });

    expect(diff).toEqual({ ok: true, toAdd: [], toRemove: [PREMIUM_ROLE] });
  });

  test("never touches a role the bot does not manage", () => {
    const diff = computeRoleDiff({
      config: config(),
      currentRoleIds: [NEW_ROLE, MODERATOR_ROLE],
      isPro: false,
      rank: "CHAMPION",
    });

    expect(diff).toEqual({
      ok: true,
      toAdd: [CHAMPION_ROLE],
      toRemove: [NEW_ROLE],
    });
  });

  test("yields an empty diff when the member is already correct", () => {
    const diff = computeRoleDiff({
      config: config(),
      currentRoleIds: [CHAMPION_ROLE, PREMIUM_ROLE, MODERATOR_ROLE],
      isPro: true,
      rank: "CHAMPION",
    });

    expect(diff).toEqual({ ok: true, toAdd: [], toRemove: [] });
  });

  test("heals a member who drifted into two rank roles", () => {
    const diff = computeRoleDiff({
      config: config(),
      currentRoleIds: [NEW_ROLE, IMMORTAL_ROLE],
      isPro: false,
      rank: "CHAMPION",
    });

    expect(diff.ok).toBe(true);
    if (diff.ok) {
      expect(diff.toAdd).toEqual([CHAMPION_ROLE]);
      expect([...diff.toRemove].sort((a, b) => a.localeCompare(b))).toEqual(
        [NEW_ROLE, IMMORTAL_ROLE].sort((a, b) => a.localeCompare(b))
      );
    }
  });

  test("fails when the requested rank has no configured role", () => {
    const diff = computeRoleDiff({
      config: config(),
      currentRoleIds: [],
      isPro: false,
      rank: "LEGEND",
    });

    expect(diff.ok).toBe(false);
    if (!diff.ok) {
      expect(diff.error).toContain("DISCORD_ROLE_LEGEND");
    }
  });

  test("fails when premium is requested but not configured", () => {
    const noPremium: RoleConfig = {
      ...config(),
      managedRoleIds: () => [CHAMPION_ROLE],
      premiumRoleId: undefined,
    };

    const diff = computeRoleDiff({
      config: noPremium,
      currentRoleIds: [],
      isPro: true,
      rank: "CHAMPION",
    });

    expect(diff.ok).toBe(false);
    if (!diff.ok) {
      expect(diff.error).toContain("DISCORD_ROLE_PREMIUM");
    }
  });
});
