import { Events } from "discord.js";
import { loadEnv } from "../../config/env";
import { beginSession, finishSession } from "../../deepwork/runtime";
import { sessions } from "../../deepwork/store";
import { classifyVoiceChange } from "../../deepwork/transitions";
import { logger } from "../../lib/logger";
import { defineEvent } from "./types";

export const voiceStateHandler = defineEvent({
  async handle(oldState, newState) {
    const env = loadEnv();

    // Everything below the classifier works on plain strings. This handler
    // does nothing but read them off the discord.js objects.
    const transition = classifyVoiceChange({
      deepworkChannels: env.DEEPWORK_VOICE_CHANNEL_IDS,
      from: oldState.channelId,
      isBot: newState.member?.user.bot ?? false,
      to: newState.channelId,
      userId: newState.id,
    });

    switch (transition.type) {
      case "ignored":
        logger.debug("Voice change ignored", { reason: transition.reason });
        break;

      case "joined":
        await beginSession(
          newState.client,
          transition.userId,
          transition.channelId
        );
        break;

      case "moved":
        sessions.move(transition.userId, transition.to);
        logger.info("Deepwork session moved", {
          from: transition.from,
          to: transition.to,
          userId: transition.userId,
        });
        break;

      default:
        await finishSession(newState.client, transition.userId, "ended");
    }
  },
  name: Events.VoiceStateUpdate,
});
