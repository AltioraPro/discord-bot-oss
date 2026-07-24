import { DiscordjsErrorCodes } from "discord.js";

const TOKEN_PROBLEM =
  "Discord rejected the bot token. Check DISCORD_BOT_TOKEN in your .env file: it must be the token from the Bot tab of the Discord Developer Portal, not the application's client secret.";

const INTENT_PROBLEM =
  "Discord refused a privileged intent. Open the Discord Developer Portal, select your application, open the Bot tab, and enable 'Server Members Intent' under Privileged Gateway Intents. It is the only privileged intent this bot needs.";

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return;
  }

  const { code } = error as { code: unknown };
  return typeof code === "string" ? code : undefined;
}

/**
 * Translates a startup failure into a message that names the fix.
 *
 * discord.js reports both of these cases with text that explains what happened
 * but not what to do about it, which sends operators looking in the wrong
 * place. The mapping is on error codes rather than message text, which is not
 * a stable interface.
 */
export function describeStartupError(error: unknown): string {
  const code = errorCode(error);

  if (
    code === DiscordjsErrorCodes.TokenInvalid ||
    code === DiscordjsErrorCodes.TokenMissing
  ) {
    return TOKEN_PROBLEM;
  }

  if (
    code === DiscordjsErrorCodes.DisallowedIntents ||
    code === DiscordjsErrorCodes.InvalidIntents
  ) {
    return INTENT_PROBLEM;
  }

  return error instanceof Error ? error.message : String(error);
}
