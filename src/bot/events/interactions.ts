import { Events } from "discord.js";
import { parseDeepworkCustomId } from "../../deepwork/durations";
import { formatMinutes, settledPrompt } from "../../deepwork/messages";
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
      // A prompt left over from a session that already finished.
      await interaction.update(
        settledPrompt("Session ended", "That session is no longer running.")
      );
      return;
    }

    switch (click.kind) {
      case "duration": {
        sessions.activate(userId, click.minutes);
        logger.info("Deepwork length chosen", {
          plannedMinutes: click.minutes,
          userId,
        });
        await interaction.update(
          settledPrompt(
            "Deepwork session started",
            `Running for ${formatMinutes(click.minutes)}. Good luck.`
          )
        );
        break;
      }

      case "still-working": {
        sessions.confirmWorking(userId);
        logger.debug("Check-in confirmed", { userId });
        await interaction.update(
          settledPrompt("Check-in confirmed", "Noted, keep going.")
        );
        break;
      }

      // The closing summary that finishSession sends carries the outcome, so
      // these two only have to settle the prompt they were clicked on.
      case "cancel": {
        await interaction.update(
          settledPrompt("Session cancelled", "Cancelling now.")
        );
        await finishSession(interaction.client, userId, "cancelled");
        break;
      }

      default: {
        await interaction.update(
          settledPrompt("Session ending", "Wrapping up now.")
        );
        await finishSession(interaction.client, userId, "ended");
      }
    }
  },
  name: Events.InteractionCreate,
});
