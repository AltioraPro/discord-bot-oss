export interface Session {
  channelId: string;
  /** Epoch milliseconds. */
  startedAt: number;
  userId: string;
}

export interface EndedSession extends Session {
  durationMs: number;
  /** Epoch milliseconds. */
  endedAt: number;
}

export interface SessionStore {
  /** Every session currently running, in insertion order. */
  active: () => Session[];
  /** Ends a session and reports how long it ran. Undefined if none existed. */
  end: (userId: string) => EndedSession | undefined;
  get: (userId: string) => Session | undefined;
  /** Follows a member to another deepwork room, preserving the start time. */
  move: (userId: string, channelId: string) => Session | undefined;
  size: () => number;
  start: (userId: string, channelId: string) => Session;
}

/**
 * Tracks who is currently in a deepwork room, and since when.
 *
 * Sessions live in memory only. Restarting the bot forgets them, which is the
 * documented behaviour of the community edition: durable storage belongs to
 * the external backend, not to this process.
 *
 * The clock is injected so elapsed time can be exercised without waiting.
 */
export function createSessionStore(now: () => number = Date.now): SessionStore {
  const sessions = new Map<string, Session>();

  return {
    active: () => [...sessions.values()],

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

    move: (userId, channelId) => {
      const session = sessions.get(userId);

      if (!session) {
        return;
      }

      // startedAt is deliberately untouched: moving between deepwork rooms
      // continues the same session rather than beginning a new one.
      const moved: Session = { ...session, channelId };
      sessions.set(userId, moved);

      return moved;
    },

    size: () => sessions.size,

    start: (userId, channelId) => {
      // Overwrites any existing session. Reaching that state means a `left`
      // transition was missed, and a restarted timer is safer than one that
      // silently counts an absence as focus time.
      const session: Session = { channelId, startedAt: now(), userId };
      sessions.set(userId, session);

      return session;
    },
  };
}

/** The process-wide store of running deepwork sessions. */
export const sessions = createSessionStore();
