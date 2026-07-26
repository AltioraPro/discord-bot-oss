import { describe, expect, test } from "bun:test";
import { parseEnv } from "./env";

const CHANNEL_A = "123456789012345678";
const CHANNEL_B = "234567890123456789";
const GUILD = "345678901234567890";

// Hoisted so the regex literals are compiled once rather than per assertion.
const MENTIONS_API_SECRET = /API_SECRET/;
const MENTIONS_APP_URL = /APP_URL/;
const MENTIONS_BOT_TOKEN = /DISCORD_BOT_TOKEN/;
const MENTIONS_CHANNEL_IDS = /DEEPWORK_VOICE_CHANNEL_IDS/;

function validSource(): Record<string, string | undefined> {
  return {
    DEEPWORK_VOICE_CHANNEL_IDS: `${CHANNEL_A},${CHANNEL_B}`,
    DISCORD_BOT_TOKEN: "a-discord-bot-token",
    DISCORD_GUILD_ID: GUILD,
    WEBHOOK_SECRET: "a-sufficiently-long-secret",
  };
}

describe("parseEnv", () => {
  test("accepts a minimal valid configuration", () => {
    const env = parseEnv(validSource());

    expect(env.DISCORD_BOT_TOKEN).toBe("a-discord-bot-token");
    expect(env.DISCORD_GUILD_ID).toBe(GUILD);
  });

  test("splits and trims the deepwork channel list", () => {
    const env = parseEnv({
      ...validSource(),
      DEEPWORK_VOICE_CHANNEL_IDS: ` ${CHANNEL_A} , ${CHANNEL_B} `,
    });

    expect(env.DEEPWORK_VOICE_CHANNEL_IDS).toEqual([CHANNEL_A, CHANNEL_B]);
  });

  test("defaults the bot port to 3001", () => {
    expect(parseEnv(validSource()).BOT_PORT).toBe(3001);
  });

  test("coerces the bot port from a string", () => {
    const env = parseEnv({ ...validSource(), BOT_PORT: "8080" });

    expect(env.BOT_PORT).toBe(8080);
  });

  test("treats absent backend configuration as degraded mode, not an error", () => {
    const env = parseEnv(validSource());

    expect(env.APP_URL).toBeUndefined();
    expect(env.API_SECRET).toBeUndefined();
  });

  test("accepts a complete backend configuration", () => {
    const env = parseEnv({
      ...validSource(),
      API_SECRET: "an-api-secret",
      APP_URL: "https://altiora.pro",
    });

    expect(env.APP_URL).toBe("https://altiora.pro");
  });

  test("treats blank optional values as absent", () => {
    // This is the shape of a .env copied from .env.example with only the
    // required fields filled in — the flow the README documents.
    const env = parseEnv({
      ...validSource(),
      API_SECRET: "",
      APP_URL: "",
      OAUTH_REDIRECT_URL: "",
    });

    expect(env.APP_URL).toBeUndefined();
    expect(env.API_SECRET).toBeUndefined();
    expect(env.OAUTH_REDIRECT_URL).toBeUndefined();
  });

  test("falls back to defaults when a defaulted value is blank", () => {
    const env = parseEnv({
      ...validSource(),
      BOT_PORT: "",
      LOG_LEVEL: "",
      NODE_ENV: "",
    });

    expect(env.BOT_PORT).toBe(3001);
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.NODE_ENV).toBe("development");
  });

  test("still rejects a blank required value", () => {
    expect(() =>
      parseEnv({ ...validSource(), DISCORD_BOT_TOKEN: "  " })
    ).toThrow(MENTIONS_BOT_TOKEN);
  });

  test("rejects APP_URL without API_SECRET", () => {
    expect(() =>
      parseEnv({ ...validSource(), APP_URL: "https://altiora.pro" })
    ).toThrow(MENTIONS_API_SECRET);
  });

  test("rejects API_SECRET without APP_URL", () => {
    expect(() =>
      parseEnv({ ...validSource(), API_SECRET: "an-api-secret" })
    ).toThrow(MENTIONS_APP_URL);
  });

  test("rejects a missing bot token", () => {
    const source = validSource();
    source.DISCORD_BOT_TOKEN = undefined;

    expect(() => parseEnv(source)).toThrow(MENTIONS_BOT_TOKEN);
  });

  test("rejects a channel id that is not a snowflake", () => {
    expect(() =>
      parseEnv({
        ...validSource(),
        DEEPWORK_VOICE_CHANNEL_IDS: "not-a-snowflake",
      })
    ).toThrow(MENTIONS_CHANNEL_IDS);
  });

  test("rejects an empty channel list", () => {
    expect(() =>
      parseEnv({ ...validSource(), DEEPWORK_VOICE_CHANNEL_IDS: "" })
    ).toThrow(MENTIONS_CHANNEL_IDS);
  });

  test("reports every invalid variable at once, not just the first", () => {
    let message = "";
    try {
      parseEnv({ DISCORD_BOT_TOKEN: "", DISCORD_GUILD_ID: "nope" });
    } catch (error) {
      ({ message } = error as Error);
    }

    expect(message).toContain("DISCORD_BOT_TOKEN");
    expect(message).toContain("DISCORD_GUILD_ID");
    expect(message).toContain("DEEPWORK_VOICE_CHANNEL_IDS");
    expect(message).toContain("WEBHOOK_SECRET");
  });
});
