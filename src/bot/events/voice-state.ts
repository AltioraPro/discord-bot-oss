import { Events } from "discord.js";
import { loadEnv } from "../../config/env";
import { sessions } from "../../deepwork/store";
import { classifyVoiceChange } from "../../deepwork/transitions";
import { logger } from "../../lib/logger";
import { defineEvent } from "./types";

const MS_PER_MINUTE = 60_000;

export const voiceStateHandler = defineEvent({
  handle(oldState, newState) {
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

    if (transition.type === "ignored") {
      logger.debug("Voice change ignored", { reason: transition.reason });
      return;
    }

    if (transition.type === "joined") {
      sessions.start(transition.userId, transition.channelId);
      logger.info("Deepwork session started", {
        active: sessions.size(),
        channelId: transition.channelId,
        userId: transition.userId,
      });
      return;
    }

    if (transition.type === "moved") {
      sessions.move(transition.userId, transition.to);
      logger.info("Deepwork session moved", {
        from: transition.from,
        to: transition.to,
        userId: transition.userId,
      });
      return;
    }

    const ended = sessions.end(transition.userId);

    if (!ended) {
      // The bot was started while the member was already connected, so no
      // session was ever opened for them. Not an error.
      logger.debug("Left a deepwork room without an open session", {
        userId: transition.userId,
      });
      return;
    }

    logger.info("Deepwork session ended", {
      active: sessions.size(),
      channelId: ended.channelId,
      durationMinutes: Math.round(ended.durationMs / MS_PER_MINUTE),
      userId: ended.userId,
    });
  },
  name: Events.VoiceStateUpdate,
});
