import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type MessageCreateOptions,
} from "discord.js";
import {
  CUSTOM_IDS,
  DURATION_CHOICES_MINUTES,
  durationCustomId,
} from "./durations";
import type { EndedSession } from "./store";

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const ACCENT = 0x58_65_f2;

/** Renders a length as "2h", "45m" or "1h 30m". */
export function formatMinutes(minutes: number): string {
  const whole = Math.round(minutes);
  const hours = Math.floor(whole / MINUTES_PER_HOUR);
  const rest = whole % MINUTES_PER_HOUR;

  if (hours === 0) {
    return `${rest}m`;
  }

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** The prompt sent when a member joins a deepwork room. */
export function durationPrompt(): MessageCreateOptions {
  const buttons = DURATION_CHOICES_MINUTES.map((minutes) =>
    new ButtonBuilder()
      .setCustomId(durationCustomId(minutes))
      .setLabel(formatMinutes(minutes))
      .setStyle(ButtonStyle.Primary)
  );

  const cancel = new ButtonBuilder()
    .setCustomId(CUSTOM_IDS.cancel)
    .setLabel("Cancel")
    .setStyle(ButtonStyle.Secondary);

  return {
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons, cancel),
    ],
    embeds: [
      new EmbedBuilder()
        .setColor(ACCENT)
        .setTitle("Deepwork session")
        .setDescription(
          "How long are you working for? Pick a length to start your session."
        ),
    ],
  };
}

/** The periodic "are you still there" prompt. */
export function checkInPrompt(elapsedMinutes: number): MessageCreateOptions {
  return {
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(CUSTOM_IDS.stillWorking)
          .setLabel("Still working")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(CUSTOM_IDS.end)
          .setLabel("End session")
          .setStyle(ButtonStyle.Danger)
      ),
    ],
    embeds: [
      new EmbedBuilder()
        .setColor(ACCENT)
        .setTitle("Still working?")
        .setDescription(
          `You have been focused for ${formatMinutes(elapsedMinutes)}. Confirm to keep the session running.`
        ),
    ],
  };
}

/**
 * A prompt that has been answered. The outcome replaces the question and the
 * button row is dropped, so the row cannot be clicked a second time — a member
 * cannot pick a length and then cancel the same message, and a stale check-in
 * stops counting as an answer.
 */
export function settledPrompt(
  title: string,
  description: string
): {
  components: [];
  embeds: [EmbedBuilder];
} {
  return {
    components: [],
    embeds: [
      new EmbedBuilder()
        .setColor(ACCENT)
        .setTitle(title)
        .setDescription(description),
    ],
  };
}

export type SessionOutcome = "cancelled" | "completed" | "ended" | "timeout";

const OUTCOME_TITLE: Record<SessionOutcome, string> = {
  cancelled: "Session cancelled",
  completed: "Session completed",
  ended: "Session ended",
  timeout: "Session ended, no answer",
};

const OUTCOME_NOTE: Record<SessionOutcome, string> = {
  cancelled: "No time was recorded.",
  completed: "You reached the length you planned. Well done.",
  ended: "Time recorded.",
  timeout:
    "You did not answer the check-in, so the session was closed and you were disconnected from the voice channel.",
};

/** The closing summary sent however a session finishes. */
export function sessionSummary(
  session: EndedSession,
  outcome: SessionOutcome
): MessageCreateOptions {
  const embed = new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle(OUTCOME_TITLE[outcome])
    .setDescription(OUTCOME_NOTE[outcome]);

  if (outcome !== "cancelled") {
    embed.addFields({
      inline: true,
      name: "Focused time",
      value: formatMinutes(session.durationMs / MS_PER_MINUTE),
    });
  }

  return { embeds: [embed] };
}

/** Sent when the member never picked a length and the default was applied. */
export function defaultDurationNotice(minutes: number): MessageCreateOptions {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(ACCENT)
        .setTitle("Deepwork session started")
        .setDescription(
          `No length was chosen, so the session runs for ${formatMinutes(minutes)}.`
        ),
    ],
  };
}
