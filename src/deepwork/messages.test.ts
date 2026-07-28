import { describe, expect, test } from "bun:test";
import { ACCENT } from "../lib/branding";
import { formatMinutes, settledPrompt } from "./messages";

describe("formatMinutes", () => {
  test("renders whole hours without a minute part", () => {
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(120)).toBe("2h");
    expect(formatMinutes(240)).toBe("4h");
  });

  test("renders less than an hour in minutes", () => {
    expect(formatMinutes(1)).toBe("1m");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(59)).toBe("59m");
  });

  test("renders hours and minutes together", () => {
    expect(formatMinutes(90)).toBe("1h 30m");
    expect(formatMinutes(155)).toBe("2h 35m");
  });

  test("rounds a fractional elapsed time to the nearest minute", () => {
    // Elapsed time is computed by dividing milliseconds, so it is rarely whole.
    expect(formatMinutes(29.4)).toBe("29m");
    expect(formatMinutes(29.6)).toBe("30m");
    expect(formatMinutes(59.7)).toBe("1h");
  });

  test("renders a session that has barely begun", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(0.2)).toBe("0m");
  });
});

describe("settledPrompt", () => {
  test("carries no components, so the buttons cannot be clicked twice", () => {
    expect(
      settledPrompt("Session cancelled", "Cancelling now.").components
    ).toEqual([]);
  });

  test("replaces the question with the outcome", () => {
    const [embed] = settledPrompt(
      "Check-in confirmed",
      "Noted, keep going."
    ).embeds;

    expect(embed.data.title).toBe("Check-in confirmed");
    expect(embed.data.description).toBe("Noted, keep going.");
  });

  test("keeps the deepwork accent so a settled prompt still looks like ours", () => {
    const [embed] = settledPrompt("Session ended", "Wrapping up now.").embeds;

    expect(embed.data.color).toBe(ACCENT);
  });
});
