/**
 * A session waits in `configuring` until the member picks a length, then runs
 * as `active`. Nothing else observes a session, so there is no state for the
 * ways it can finish: ending removes it and reports how long it ran.
 */
export type SessionStatus = "active" | "configuring";

export interface Session {
  channelId: string;
  /**
   * When the pending check-in was sent, or null when none is awaiting an
   * answer. Explicitly nullable rather than optional so that clearing it is a
   * plain assignment.
   */
  checkInPendingSince: number | null;
  /** Last moment the member was known to be working. Epoch milliseconds. */
  lastSeenAt: number;
  /** Chosen session length, or null while still configuring. */
  plannedMinutes: number | null;
  /** Epoch milliseconds. */
  startedAt: number;
  status: SessionStatus;
  userId: string;
}

export interface EndedSession extends Session {
  durationMs: number;
  /** Epoch milliseconds. */
  endedAt: number;
}

export interface SessionStore {
  /** Records the chosen length and starts the session running. */
  activate: (userId: string, plannedMinutes: number) => Session | undefined;
  /** Every session currently running, in insertion order. */
  active: () => Session[];
  /** Notes that a check-in was sent and is awaiting an answer. */
  checkInSent: (userId: string) => Session | undefined;
  /** Clears a pending check-in after the member confirms they are working. */
  confirmWorking: (userId: string) => Session | undefined;
  end: (userId: string) => EndedSession | undefined;
  get: (userId: string) => Session | undefined;
  /** Follows a member to another deepwork room, preserving the start time. */
  move: (userId: string, channelId: string) => Session | undefined;
  size: () => number;
  start: (userId: string, channelId: string) => Session;
}

/**
 * Tracks who is currently in a deepwork room, and how their session is going.
 *
 * Sessions live in memory only. Restarting the bot forgets them, which is the
 * documented behaviour of the community edition: durable storage belongs to
 * the external backend, not to this process.
 *
 * The clock is injected so elapsed time can be exercised without waiting.
 */
export function createSessionStore(now: () => number = Date.now): SessionStore {
  const sessions = new Map<string, Session>();

  function update(
    userId: string,
    change: (session: Session) => Session
  ): Session | undefined {
    const session = sessions.get(userId);

    if (!session) {
      return;
    }

    const updated = change(session);
    sessions.set(userId, updated);

    return updated;
  }

  return {
    activate: (userId, plannedMinutes) =>
      update(userId, (session) => ({
        ...session,
        checkInPendingSince: null,
        lastSeenAt: now(),
        plannedMinutes,
        status: "active",
      })),
    active: () => [...sessions.values()],

    checkInSent: (userId) =>
      update(userId, (session) => ({
        ...session,
        checkInPendingSince: now(),
      })),

    confirmWorking: (userId) =>
      update(userId, (session) => ({
        ...session,
        checkInPendingSince: null,
        lastSeenAt: now(),
      })),

    end: (userId) => {
      const session = sessions.get(userId);

      if (!session) {
        return;
      }

      sessions.delete(userId);
      const endedAt = now();

      return {
        ...session,
        durationMs: endedAt - session.startedAt,
        endedAt,
      };
    },

    get: (userId) => sessions.get(userId),

    // startedAt is deliberately untouched: moving between deepwork rooms
    // continues the same session rather than beginning a new one.
    move: (userId, channelId) =>
      update(userId, (session) => ({ ...session, channelId })),

    size: () => sessions.size,

    start: (userId, channelId) => {
      // Overwrites any existing session. Reaching that state means a `left`
      // transition was missed, and a restarted timer is safer than one that
      // silently counts an absence as focus time.
      const startedAt = now();
      const session: Session = {
        channelId,
        checkInPendingSince: null,
        lastSeenAt: startedAt,
        plannedMinutes: null,
        startedAt,
        status: "configuring",
        userId,
      };
      sessions.set(userId, session);

      return session;
    },
  };
}

/** The process-wide store of running deepwork sessions. */
export const sessions = createSessionStore();
