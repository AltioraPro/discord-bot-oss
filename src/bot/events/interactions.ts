import { Events, MessageFlags } from "discord.js";
import { parseDeepworkCustomId } from "../../deepwork/durations";
import { formatMinutes } from "../../deepwork/messages";
import { finishSession } from "../../deepwork/runtime";
import { sessions } from "../../deepwork/store";
import { logger } from "../../lib/logger";
import { defineEvent } from "./types";

export const interactionHandler = defineEvent({
  async handle(interaction) {
    if (!interaction.isButton()) {
      return;
    }

    const click = parseDeepworkCustomId(interaction.customId);

    if (!click) {
      // Another feature's button, or a forged identifier. Either way not ours.
      return;
    }

    const userId = interaction.user.id;
    const session = sessions.get(userId);

    if (!session) {
      await interaction.reply({
        content: "That session is no longer running.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    switch (click.kind) {
      case "duration": {
        sessions.activate(userId, click.minutes);
        logger.info("Deepwork length chosen", {
          plannedMinutes: click.minutes,
          userId,
        });
        await interaction.reply({
          content: `Session started for ${formatMinutes(click.minutes)}. Good luck.`,
          flags: MessageFlags.Ephemeral,
        });
        break;
      }

      case "still-working": {
        sessions.confirmWorking(userId);
        logger.debug("Check-in confirmed", { userId });
        await interaction.reply({
          content: "Noted, keep going.",
          flags: MessageFlags.Ephemeral,
        });
        break;
      }

      case "cancel": {
        await interaction.reply({
          content: "Session cancelled.",
          flags: MessageFlags.Ephemeral,
        });
        await finishSession(interaction.client, userId, "cancelled");
        break;
      }

      default: {
        await interaction.reply({
          content: "Session ended.",
          flags: MessageFlags.Ephemeral,
        });
        await finishSession(interaction.client, userId, "ended");
      }
    }
  },
  name: Events.InteractionCreate,
});
