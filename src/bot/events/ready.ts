import { Events } from "discord.js";
import { loadEnv } from "../../config/env";
import { logger } from "../../lib/logger";
import { defineEvent } from "./types";

export const readyHandler = defineEvent({
  handle(client) {
    const env = loadEnv();
    const guild = client.guilds.cache.get(env.DISCORD_GUILD_ID);

    if (!guild) {
      logger.error(
        "The bot is not a member of the configured guild. Check DISCORD_GUILD_ID, and make sure the bot has been invited to that server.",
        { guildId: env.DISCORD_GUILD_ID }
      );
      process.exit(1);
    }

    logger.info("Connected to Discord", {
      botTag: client.user.tag,
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount,
    });
  },
  // Never the string "ready": in discord.js 14.27 this event is "clientReady",
  // and a wrong literal binds a handler that never fires and never errors.
  name: Events.ClientReady,
  once: true,
});
