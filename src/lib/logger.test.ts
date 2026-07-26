import { describe, expect, test } from "bun:test";
import { createLogger, type LogLevel } from "./logger";

const FIXED_TIME = new Date("2026-07-24T10:00:00.000Z");

function collect(level: LogLevel, json: boolean) {
  const out: string[] = [];
  const err: string[] = [];
  const logger = createLogger({
    json,
    level,
    now: () => FIXED_TIME,
    writeErr: (line) => err.push(line),
    writeOut: (line) => out.push(line),
  });
  return { err, logger, out };
}

describe("createLogger", () => {
  test("writes a pretty line without fields", () => {
    const { logger, out } = collect("info", false);
    logger.info("Bot ready");

    expect(out).toEqual(["[INFO] Bot ready"]);
  });

  test("appends fields as key=value in pretty mode", () => {
    const { logger, out } = collect("info", false);
    logger.info("Bot ready", { guildId: "123", memberCount: 42 });

    expect(out).toEqual(["[INFO] Bot ready guildId=123 memberCount=42"]);
  });

  test("writes structured json when json is enabled", () => {
    const { logger, out } = collect("info", true);
    logger.info("Bot ready", { guildId: "123" });

    expect(JSON.parse(out[0] ?? "")).toEqual({
      guildId: "123",
      level: "info",
      message: "Bot ready",
      time: "2026-07-24T10:00:00.000Z",
    });
  });

  test("drops messages below the configured level", () => {
    const { logger, out } = collect("warn", false);
    logger.debug("dropped");
    logger.info("dropped");

    expect(out).toEqual([]);
  });

  test("sends warn and error to the error stream", () => {
    const { err, logger, out } = collect("debug", false);
    logger.warn("careful");
    logger.error("broken");

    expect(out).toEqual([]);
    expect(err).toEqual(["[WARN] careful", "[ERROR] broken"]);
  });

  test("sends debug and info to the output stream", () => {
    const { err, logger, out } = collect("debug", false);
    logger.debug("noisy");
    logger.info("normal");

    expect(err).toEqual([]);
    expect(out).toEqual(["[DEBUG] noisy", "[INFO] normal"]);
  });

  test("keeps every level when set to debug", () => {
    const { err, logger, out } = collect("debug", false);
    logger.debug("a");
    logger.info("b");
    logger.warn("c");
    logger.error("d");

    expect(out.length + err.length).toBe(4);
  });
});
