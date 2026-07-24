import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { ENV_KEYS } from "../src/config/env";

function declaredKeys(): string[] {
  const contents = readFileSync(`${import.meta.dir}/../.env.example`, "utf8");

  return contents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => line.split("=")[0]?.trim())
    .filter((key): key is string => Boolean(key));
}

describe(".env.example", () => {
  test("documents every variable the schema declares", () => {
    const documented = new Set(declaredKeys());
    const missing = ENV_KEYS.filter((key) => !documented.has(key));

    expect(missing).toEqual([]);
  });

  test("declares no variable the schema does not know about", () => {
    const known = new Set(ENV_KEYS);
    const unknown = declaredKeys().filter((key) => !known.has(key));

    expect(unknown).toEqual([]);
  });
});
