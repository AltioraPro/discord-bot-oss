import { Client, GatewayIntentBits } from "discord.js";

/**
 * Builds the Discord client. Pure: it opens no connection, so importing this
 * module has no side effects.
 *
 * Of these intents only GuildMembers is privileged and needs enabling in the
 * Discord Developer Portal, as "Server Members Intent". GuildVoiceStates is
 * not privileged, despite what its capability suggests.
 */
export function createDiscordClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });
}
