/** Why a voice state change carried no deepwork meaning. */
export type IgnoredReason = "bot" | "no-channel-change" | "outside-deepwork";

export type VoiceTransition =
  | { channelId: string; type: "joined"; userId: string }
  | { channelId: string; type: "left"; userId: string }
  | { from: string; to: string; type: "moved"; userId: string }
  | { reason: IgnoredReason; type: "ignored" };

export interface VoiceChange {
  /** Channels configured as deepwork rooms. */
  deepworkChannels: readonly string[];
  /** Channel the member was in, or null if they were not connected. */
  from: string | null;
  isBot: boolean;
  /** Channel the member is now in, or null if they disconnected. */
  to: string | null;
  userId: string;
}

/**
 * Turns a raw voice state change into the deepwork event it represents.
 *
 * Pure by design: it takes channel ids rather than discord.js objects, so the
 * rules below can be exercised without a Discord connection. The handler that
 * calls it does nothing but read three strings off the event.
 */
export function classifyVoiceChange(change: VoiceChange): VoiceTransition {
  const { deepworkChannels, from, isBot, to, userId } = change;

  if (isBot) {
    return { reason: "bot", type: "ignored" };
  }

  // voiceStateUpdate also fires when a member mutes, deafens or starts
  // streaming. Those arrive with an unchanged channel and mean nothing here.
  if (from === to) {
    return { reason: "no-channel-change", type: "ignored" };
  }

  // Carry the narrowing in the values rather than in booleans, so the branches
  // below need no casts to prove these are non-null.
  const leftRoom =
    from !== null && deepworkChannels.includes(from) ? from : null;
  const joinedRoom = to !== null && deepworkChannels.includes(to) ? to : null;

  if (leftRoom !== null && joinedRoom !== null) {
    return { from: leftRoom, to: joinedRoom, type: "moved", userId };
  }

  if (joinedRoom !== null) {
    return { channelId: joinedRoom, type: "joined", userId };
  }

  if (leftRoom !== null) {
    return { channelId: leftRoom, type: "left", userId };
  }

  return { reason: "outside-deepwork", type: "ignored" };
}
