import { describe, expect, test } from "bun:test";
import {
  CUSTOM_IDS,
  DURATION_CHOICES_MINUTES,
  durationCustomId,
  parseDeepworkCustomId,
} from "./durations";

describe("durationCustomId", () => {
  test("builds the documented shape", () => {
    expect(durationCustomId(60)).toBe("deepwork_60min");
    expect(durationCustomId(240)).toBe("deepwork_240min");
  });

  test("round trips every offered choice", () => {
    for (const minutes of DURATION_CHOICES_MINUTES) {
      expect(parseDeepworkCustomId(durationCustomId(minutes))).toEqual({
        kind: "duration",
        minutes,
      });
    }
  });
});

describe("parseDeepworkCustomId", () => {
  test("recognises the cancel button", () => {
    expect(parseDeepworkCustomId(CUSTOM_IDS.cancel)).toEqual({
      kind: "cancel",
    });
  });

  test("recognises the still working button", () => {
    expect(parseDeepworkCustomId(CUSTOM_IDS.stillWorking)).toEqual({
      kind: "still-working",
    });
  });

  test("recognises the end button", () => {
    expect(parseDeepworkCustomId(CUSTOM_IDS.end)).toEqual({ kind: "end" });
  });

  test("ignores identifiers belonging to other features", () => {
    expect(parseDeepworkCustomId("roles_sync_now")).toBeNull();
    expect(parseDeepworkCustomId("")).toBeNull();
  });

  test("rejects a duration that was never offered", () => {
    // Custom ids arrive from the client and can be forged. Only the durations
    // the bot actually offers are accepted.
    expect(parseDeepworkCustomId("deepwork_9999min")).toBeNull();
    expect(parseDeepworkCustomId("deepwork_0min")).toBeNull();
  });

  test("rejects a malformed duration identifier", () => {
    expect(parseDeepworkCustomId("deepwork_min")).toBeNull();
    expect(parseDeepworkCustomId("deepwork_abcmin")).toBeNull();
    expect(parseDeepworkCustomId("deepwork_60")).toBeNull();
    expect(parseDeepworkCustomId("deepwork_-60min")).toBeNull();
  });
});
