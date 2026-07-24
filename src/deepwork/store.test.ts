import { beforeEach, describe, expect, test } from "bun:test";
import { createSessionStore, type SessionStore } from "./store";

const CHANNEL_A = "111111111111111111";
const CHANNEL_B = "222222222222222222";
const USER = "123456789012345678";
const OTHER_USER = "876543210987654321";

const MINUTE = 60_000;

let clock = 0;
let store: SessionStore;

beforeEach(() => {
  clock = 1_000_000;
  store = createSessionStore(() => clock);
});

describe("createSessionStore", () => {
  test("starts with no active sessions", () => {
    expect(store.size()).toBe(0);
    expect(store.get(USER)).toBeUndefined();
  });

  test("records a started session", () => {
    const session = store.start(USER, CHANNEL_A);

    expect(session).toEqual({
      channelId: CHANNEL_A,
      startedAt: 1_000_000,
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

  test("returns the elapsed duration when a session ends", () => {
    store.start(USER, CHANNEL_A);
    clock += 25 * MINUTE;

    expect(store.end(USER)).toEqual({
      channelId: CHANNEL_A,
      durationMs: 25 * MINUTE,
      endedAt: 1_000_000 + 25 * MINUTE,
      startedAt: 1_000_000,
      userId: USER,
    });
  });

  test("removes the session once it has ended", () => {
    store.start(USER, CHANNEL_A);
    store.end(USER);

    expect(store.size()).toBe(0);
    expect(store.get(USER)).toBeUndefined();
  });

  test("returns undefined when ending an unknown session", () => {
    expect(store.end(USER)).toBeUndefined();
  });

  test("moving preserves the start time so the timer keeps running", () => {
    store.start(USER, CHANNEL_A);
    clock += 10 * MINUTE;
    const moved = store.move(USER, CHANNEL_B);

    expect(moved).toEqual({
      channelId: CHANNEL_B,
      startedAt: 1_000_000,
      userId: USER,
    });
  });

  test("a moved session still reports the full duration when it ends", () => {
    store.start(USER, CHANNEL_A);
    clock += 10 * MINUTE;
    store.move(USER, CHANNEL_B);
    clock += 5 * MINUTE;

    expect(store.end(USER)?.durationMs).toBe(15 * MINUTE);
  });

  test("returns undefined when moving an unknown session", () => {
    expect(store.move(USER, CHANNEL_B)).toBeUndefined();
    expect(store.size()).toBe(0);
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
    expect(store.size()).toBe(0);
  });

  test("lists the active sessions in insertion order", () => {
    store.start(USER, CHANNEL_A);
    store.start(OTHER_USER, CHANNEL_B);

    expect(store.active().map((session) => session.userId)).toEqual([
      USER,
      OTHER_USER,
    ]);
  });
});
