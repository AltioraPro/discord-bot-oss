import { describe, expect, test } from "bun:test";
import { dueActions, type SchedulerConfig } from "./scheduler";
import type { Session } from "./store";

const USER = "123456789012345678";
const OTHER_USER = "876543210987654321";
const CHANNEL = "111111111111111111";

const MINUTE = 60_000;
const START = 1_000_000;

const CONFIG: SchedulerConfig = {
  checkInIntervalMs: 30 * MINUTE,
  checkInTimeoutMs: 5 * MINUTE,
};

function session(overrides: Partial<Session> = {}): Session {
  return {
    channelId: CHANNEL,
    checkInPendingSince: null,
    lastSeenAt: START,
    plannedMinutes: 60,
    startedAt: START,
    status: "active",
    userId: USER,
    ...overrides,
  };
}

describe("dueActions", () => {
  test("does nothing for a session that just started", () => {
    expect(dueActions([session()], START, CONFIG)).toEqual([]);
  });

  test("does nothing before the check-in interval elapses", () => {
    const now = START + 29 * MINUTE;

    expect(dueActions([session()], now, CONFIG)).toEqual([]);
  });

  test("sends a check-in once the interval elapses", () => {
    const now = START + 30 * MINUTE;

    expect(dueActions([session()], now, CONFIG)).toEqual([
      { type: "send-check-in", userId: USER },
    ]);
  });

  test("does not send a second check-in while one is pending", () => {
    const pending = session({ checkInPendingSince: START + 30 * MINUTE });
    const now = START + 33 * MINUTE;

    expect(dueActions([pending], now, CONFIG)).toEqual([]);
  });

  test("times out a check-in that goes unanswered", () => {
    const pending = session({ checkInPendingSince: START + 30 * MINUTE });
    const now = START + 35 * MINUTE;

    expect(dueActions([pending], now, CONFIG)).toEqual([
      { type: "timeout", userId: USER },
    ]);
  });

  test("measures the check-in interval from the last confirmation", () => {
    // The member answered at minute 30, so the next check-in is due at 60.
    // The planned length is four hours so that completion does not fire first
    // and mask what this test is about.
    const confirmed = session({
      lastSeenAt: START + 30 * MINUTE,
      plannedMinutes: 240,
    });

    expect(dueActions([confirmed], START + 55 * MINUTE, CONFIG)).toEqual([]);
    expect(dueActions([confirmed], START + 60 * MINUTE, CONFIG)).toEqual([
      { type: "send-check-in", userId: USER },
    ]);
  });

  test("completes a session once its planned length elapses", () => {
    const now = START + 60 * MINUTE;

    expect(dueActions([session()], now, CONFIG)).toEqual([
      { type: "complete", userId: USER },
    ]);
  });

  test("completing wins over an unanswered check-in", () => {
    // Reaching the planned end is a success and should not be recorded as an
    // abandonment just because a check-in was outstanding at the time.
    const pending = session({
      checkInPendingSince: START + 50 * MINUTE,
      plannedMinutes: 60,
    });
    const now = START + 60 * MINUTE;

    expect(dueActions([pending], now, CONFIG)).toEqual([
      { type: "complete", userId: USER },
    ]);
  });

  test("never completes a session with no planned length", () => {
    const endless = session({ plannedMinutes: null, status: "active" });
    const now = START + 10_000 * MINUTE;

    expect(dueActions([endless], now, CONFIG)).not.toContainEqual({
      type: "complete",
      userId: USER,
    });
  });

  test("applies the default length when configuring drags on", () => {
    const configuring = session({
      plannedMinutes: null,
      status: "configuring",
    });

    expect(dueActions([configuring], START + 4 * MINUTE, CONFIG)).toEqual([]);
    expect(dueActions([configuring], START + 5 * MINUTE, CONFIG)).toEqual([
      { type: "apply-default-duration", userId: USER },
    ]);
  });

  test("never checks in on a session that is still configuring", () => {
    const configuring = session({
      plannedMinutes: null,
      status: "configuring",
    });
    const now = START + 45 * MINUTE;

    expect(dueActions([configuring], now, CONFIG)).toEqual([
      { type: "apply-default-duration", userId: USER },
    ]);
  });

  test("reports one action per session, for several members at once", () => {
    const due = session({ lastSeenAt: START });
    const finished = session({
      plannedMinutes: 30,
      userId: OTHER_USER,
    });
    const now = START + 30 * MINUTE;

    expect(dueActions([due, finished], now, CONFIG)).toEqual([
      { type: "send-check-in", userId: USER },
      { type: "complete", userId: OTHER_USER },
    ]);
  });

  test("returns nothing when there are no sessions", () => {
    expect(dueActions([], START, CONFIG)).toEqual([]);
  });
});
