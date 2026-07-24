import type { Session } from "./store";

const MS_PER_MINUTE = 60_000;

export interface SchedulerConfig {
  checkInIntervalMs: number;
  checkInTimeoutMs: number;
}

export type DeepworkAction =
  | { type: "apply-default-duration"; userId: string }
  | { type: "complete"; userId: string }
  | { type: "send-check-in"; userId: string }
  | { type: "timeout"; userId: string };

/**
 * Decides what a single session needs right now, or null for nothing.
 *
 * Precedence matters. A session that has reached its planned end is completed
 * even if a check-in was outstanding, because finishing is a success and
 * should not be recorded as an abandonment.
 */
function actionFor(
  session: Session,
  now: number,
  config: SchedulerConfig
): DeepworkAction | null {
  const { userId } = session;

  if (session.status === "configuring") {
    // The member never picked a length. Rather than leave the session hanging
    // forever, fall back to the default, exactly as when the direct message
    // could not be delivered at all.
    return now - session.startedAt >= config.checkInTimeoutMs
      ? { type: "apply-default-duration", userId }
      : null;
  }

  if (
    session.plannedMinutes !== null &&
    now - session.startedAt >= session.plannedMinutes * MS_PER_MINUTE
  ) {
    return { type: "complete", userId };
  }

  if (session.checkInPendingSince !== null) {
    return now - session.checkInPendingSince >= config.checkInTimeoutMs
      ? { type: "timeout", userId }
      : null;
  }

  return now - session.lastSeenAt >= config.checkInIntervalMs
    ? { type: "send-check-in", userId }
    : null;
}

/**
 * Everything the running sessions need at this instant.
 *
 * This is where the whole check-in cycle lives, and it is deliberately a pure
 * function of the sessions and a timestamp. The runtime supplies a real clock
 * on a tick; tests supply an arbitrary one, so a thirty minute cycle is
 * exercised without waiting thirty minutes.
 */
export function dueActions(
  sessions: readonly Session[],
  now: number,
  config: SchedulerConfig
): DeepworkAction[] {
  const actions: DeepworkAction[] = [];

  for (const session of sessions) {
    const action = actionFor(session, now, config);

    if (action) {
      actions.push(action);
    }
  }

  return actions;
}
