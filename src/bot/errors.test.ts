import { describe, expect, test } from "bun:test";
import { DiscordjsErrorCodes } from "discord.js";
import { describeStartupError } from "./errors";

/**
 * These tests feed plain Error objects to a pure string mapping. Nothing about
 * discord.js is mocked — the shapes below were captured from real failures.
 */

const MENTIONS_TOKEN_VARIABLE = /DISCORD_BOT_TOKEN/;
const MENTIONS_MEMBERS_INTENT = /Server Members Intent/;

function withCode(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

describe("describeStartupError", () => {
  test("points at the token variable when the token is rejected", () => {
    // Captured from a real login with a malformed token.
    const error = withCode(
      DiscordjsErrorCodes.TokenInvalid,
      "An invalid token was provided."
    );

    expect(describeStartupError(error)).toMatch(MENTIONS_TOKEN_VARIABLE);
  });

  test("points at the token variable when the token is missing", () => {
    const error = withCode(DiscordjsErrorCodes.TokenMissing, "no token");

    expect(describeStartupError(error)).toMatch(MENTIONS_TOKEN_VARIABLE);
  });

  test("names the intent checkbox for a plain gateway rejection", () => {
    // The real shape: a bare Error with no code, carrying the gateway close
    // reason. Verified by running with Server Members Intent disabled.
    const error = new Error("Used disallowed intents");

    expect(describeStartupError(error)).toMatch(MENTIONS_MEMBERS_INTENT);
  });

  test("names the intent checkbox when discord.js does supply a code", () => {
    const error = withCode(
      DiscordjsErrorCodes.DisallowedIntents,
      "Privileged intent provided is not enabled or whitelisted."
    );

    expect(describeStartupError(error)).toMatch(MENTIONS_MEMBERS_INTENT);
  });

  test("passes an unrecognised error through unchanged", () => {
    expect(describeStartupError(new Error("connect ETIMEDOUT"))).toBe(
      "connect ETIMEDOUT"
    );
  });

  test("stringifies a non-error value", () => {
    expect(describeStartupError("something odd")).toBe("something odd");
  });
});
