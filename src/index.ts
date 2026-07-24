import { loadEnv } from "./config/env";
import { configureLogger, logger } from "./lib/logger";

const env = loadEnv();

configureLogger({
  json: env.NODE_ENV === "production",
  level: env.LOG_LEVEL,
});

logger.info("Altiora Deepwork bot starting", {
  botPort: env.BOT_PORT,
  guildId: env.DISCORD_GUILD_ID,
});
