import type { Client } from "discord.js";
import { createDiscordClient } from "./bot/client";
import { describeStartupError } from "./bot/errors";
import { registerEvents } from "./bot/events";
import { type Env, loadEnv } from "./config/env";
import { startDeepworkRuntime } from "./deepwork/runtime";
import { configureLogger, logger } from "./lib/logger";

/**
 * A misconfiguration is not a crash, so it should not read like one.
 *
 * Letting `loadEnv` throw uncaught makes Bun print the message buried in a
 * stack trace through the bundle, which reads as a bug in the bot rather than
 * as an instruction to the operator.
 */
function loadEnvOrExit(): Env {
  try {
    return loadEnv();
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

const env = loadEnvOrExit();

configureLogger({
  json: env.NODE_ENV === "production",
  level: env.LOG_LEVEL,
});

const client = createDiscordClient();

registerEvents(client);

const stopDeepworkRuntime = startDeepworkRuntime(client);

let shuttingDown = false;

async function shutdown(signal: string, target: Client): Promise<void> {
  if (shuttingDown) {
    // A second signal means the operator is out of patience. Honour it.
    process.exit(1);
  }

  shuttingDown = true;
  logger.info("Shutting down", { signal });

  stopDeepworkRuntime();
  await target.destroy();

  logger.info("Disconnected from Discord");
  process.exit(0);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    shutdown(signal, client).catch((error: unknown) => {
      logger.error("Shutdown failed", { reason: String(error) });
      process.exit(1);
    });
  });
}

process.on("unhandledRejection", (reason) => {
  // A long lived process that swallows these keeps running in an unknown state.
  logger.error("Unhandled promise rejection", { reason: String(reason) });
  process.exit(1);
});

try {
  await client.login(env.DISCORD_BOT_TOKEN);
} catch (error) {
  logger.error(describeStartupError(error));
  process.exit(1);
}
