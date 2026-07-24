import { beforeEach, describe, expect, test } from "bun:test";
import { createSessionStore, type SessionStore } from "./store";

const CHANNEL_A = "111111111111111111";
const CHANNEL_B = "222222222222222222";
const USER = "123456789012345678";
const OTHER_USER = "876543210987654321";

const MINUTE = 60_000;
const START = 1_000_000;

let clock = 0;
let store: SessionStore;

beforeEach(() => {
  clock = START;
  store = createSessionStore(() => clock);
});

describe("starting a session", () => {
  test("starts with no active sessions", () => {
    expect(store.size()).toBe(0);
    expect(store.get(USER)).toBeUndefined();
  });

  test("a new session waits for a duration to be chosen", () => {
    expect(store.start(USER, CHANNEL_A)).toEqual({
      channelId: CHANNEL_A,
      checkInPendingSince: null,
      lastSeenAt: START,
      plannedMinutes: null,
      startedAt: START,
      status: "configuring",
      userId: USER,
    });
    expect(store.size()).toBe(1);
  });

  test("keeps sessions separate per user", () => {
    store.start(USER, CHANNEL_A);
    store.start(OTHER_USER, CHANNEL_B);

    expect(store.size()).toBe(2);
    expect(store.get(OTHER_USER)?.channelId).toBe(CHANNEL_B);
  });

  test("lists the active sessions in insertion order", () => {
    store.start(USER, CHANNEL_A);
    store.start(OTHER_USER, CHANNEL_B);

    expect(store.active().map((session) => session.userId)).toEqual([
      USER,
      OTHER_USER,
    ]);
  });

  test("restarts the timer when a session is started twice", () => {
    // Reaching here means a `left` transition was missed. Restarting is safer
    // than reporting a duration that silently includes an absence.
    store.start(USER, CHANNEL_A);
    clock += 30 * MINUTE;
    store.start(USER, CHANNEL_B);
    clock += 2 * MINUTE;

    const ended = store.end(USER);

    expect(ended?.durationMs).toBe(2 * MINUTE);
    expect(ended?.channelId).toBe(CHANNEL_B);
  });
});

describe("activating a session", () => {
  test("records the chosen length and starts running", () => {
    store.start(USER, CHANNEL_A);
    clock += 3 * MINUTE;

    expect(store.activate(USER, 120)).toMatchObject({
      lastSeenAt: START + 3 * MINUTE,
      plannedMinutes: 120,
      status: "active",
    });
  });

  test("activating keeps the original start time", () => {
    store.start(USER, CHANNEL_A);
    clock += 3 * MINUTE;
    store.activate(USER, 60);

    expect(store.get(USER)?.startedAt).toBe(START);
  });

  test("returns undefined for an unknown session", () => {
    expect(store.activate(USER, 60)).toBeUndefined();
  });
});

describe("check-ins", () => {
  test("records when a check-in was sent", () => {
    store.start(USER, CHANNEL_A);
    store.activate(USER, 60);
    clock += 30 * MINUTE;

    expect(store.checkInSent(USER)?.checkInPendingSince).toBe(
      START + 30 * MINUTE
    );
  });

  test("confirming clears the pending check-in and refreshes last seen", () => {
    store.start(USER, CHANNEL_A);
    store.activate(USER, 60);
    clock += 30 * MINUTE;
    store.checkInSent(USER);
    clock += 2 * MINUTE;

    expect(store.confirmWorking(USER)).toMatchObject({
      checkInPendingSince: null,
      lastSeenAt: START + 32 * MINUTE,
    });
  });

  test("activating clears a pending check-in", () => {
    store.start(USER, CHANNEL_A);
    store.checkInSent(USER);

    expect(store.activate(USER, 60)?.checkInPendingSince).toBeNull();
  });

  test("returns undefined for unknown sessions", () => {
    expect(store.checkInSent(USER)).toBeUndefined();
    expect(store.confirmWorking(USER)).toBeUndefined();
  });
});

describe("moving and ending", () => {
  test("moving preserves the start time so the timer keeps running", () => {
    store.start(USER, CHANNEL_A);
    clock += 10 * MINUTE;

    expect(store.move(USER, CHANNEL_B)).toMatchObject({
      channelId: CHANNEL_B,
      startedAt: START,
    });
  });

  test("a moved session still reports the full duration when it ends", () => {
    store.start(USER, CHANNEL_A);
    clock += 10 * MINUTE;
    store.move(USER, CHANNEL_B);
    clock += 5 * MINUTE;

    expect(store.end(USER)?.durationMs).toBe(15 * MINUTE);
  });

  test("returns the elapsed duration when a session ends", () => {
    store.start(USER, CHANNEL_A);
    clock += 25 * MINUTE;

    expect(store.end(USER)).toMatchObject({
      channelId: CHANNEL_A,
      durationMs: 25 * MINUTE,
      endedAt: START + 25 * MINUTE,
      startedAt: START,
      userId: USER,
    });
  });

  test("removes the session once it has ended", () => {
    store.start(USER, CHANNEL_A);
    store.end(USER);

    expect(store.size()).toBe(0);
    expect(store.get(USER)).toBeUndefined();
  });

  test("returns undefined for unknown sessions", () => {
    expect(store.end(USER)).toBeUndefined();
    expect(store.move(USER, CHANNEL_B)).toBeUndefined();
    expect(store.size()).toBe(0);
  });
});
