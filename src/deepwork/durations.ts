/** Session lengths offered in the direct message, in minutes. */
export const DURATION_CHOICES_MINUTES = [60, 120, 180, 240] as const;

export const CUSTOM_IDS = {
  cancel: "deepwork_cancel",
  end: "deepwork_end",
  stillWorking: "deepwork_still_working",
} as const;

export type DeepworkClick =
  | { kind: "cancel" }
  | { kind: "duration"; minutes: number }
  | { kind: "end" }
  | { kind: "still-working" };

const DURATION_ID = /^deepwork_(\d+)min$/;

export function durationCustomId(minutes: number): string {
  return `deepwork_${minutes}min`;
}

function isOfferedDuration(minutes: number): boolean {
  return DURATION_CHOICES_MINUTES.some((choice) => choice === minutes);
}

/**
 * Reads a button identifier, or returns null when it is not ours.
 *
 * Custom ids travel through the client and can be forged, so a duration is
 * only accepted when it is one the bot actually offers. Trusting the number
 * here would let anyone open a session of arbitrary length.
 */
export function parseDeepworkCustomId(customId: string): DeepworkClick | null {
  if (customId === CUSTOM_IDS.cancel) {
    return { kind: "cancel" };
  }

  if (customId === CUSTOM_IDS.stillWorking) {
    return { kind: "still-working" };
  }

  if (customId === CUSTOM_IDS.end) {
    return { kind: "end" };
  }

  const match = DURATION_ID.exec(customId);

  if (!match?.[1]) {
    return null;
  }

  const minutes = Number(match[1]);

  return isOfferedDuration(minutes) ? { kind: "duration", minutes } : null;
}
