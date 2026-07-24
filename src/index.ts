import type { Client } from "discord.js";
import { createDiscordClient } from "./bot/client";
import { describeStartupError } from "./bot/errors";
import { registerEvents } from "./bot/events";
import { loadEnv } from "./config/env";
import { configureLogger, logger } from "./lib/logger";

const env = loadEnv();

configureLogger({
  json: env.NODE_ENV === "production",
  level: env.LOG_LEVEL,
});

const client = createDiscordClient();

registerEvents(client);

let shuttingDown = false;

async function shutdown(signal: string, target: Client): Promise<void> {
  if (shuttingDown) {
    // A second signal means the operator is out of patience. Honour it.
    process.exit(1);
  }

  shuttingDown = true;
  logger.info("Shutting down", { signal });

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
