import { describe, expect, test } from "bun:test";
import { isAuthorized } from "./middleware";

const SECRET = "a-sufficiently-long-secret";

describe("isAuthorized", () => {
  test("accepts the exact bearer token", () => {
    expect(isAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  test("rejects a wrong token", () => {
    expect(isAuthorized("Bearer wrong-secret-value-here", SECRET)).toBe(false);
  });

  test("rejects a missing header", () => {
    expect(isAuthorized(null, SECRET)).toBe(false);
  });

  test("rejects a token without the Bearer prefix", () => {
    expect(isAuthorized(SECRET, SECRET)).toBe(false);
  });

  test("rejects a token of a different length", () => {
    // The constant-time compare requires equal lengths; this must not throw.
    expect(isAuthorized("Bearer short", SECRET)).toBe(false);
  });

  test("rejects an empty string", () => {
    expect(isAuthorized("", SECRET)).toBe(false);
  });
});
