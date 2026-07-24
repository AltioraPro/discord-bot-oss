import { loadEnv } from './config/env';

const env = loadEnv();

console.log(
  `[INFO] Altiora Deepwork bot starting on port ${env.BOT_PORT} for guild ${env.DISCORD_GUILD_ID}`
);
