import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(import.meta.dir, "..", "src");

/** Every TypeScript source file under src/, as repository-relative paths. */
function sourceFiles(directory: string = SRC): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);

    if (statSync(full).isDirectory()) {
      found.push(...sourceFiles(full));
      continue;
    }

    if (entry.endsWith(".ts")) {
      found.push(relative(SRC, full).replaceAll("\\", "/"));
    }
  }

  return found;
}

function filesMatching(pattern: RegExp, exclude: string[]): string[] {
  return sourceFiles()
    .filter((file) => !exclude.includes(file))
    .filter((file) => pattern.test(readFileSync(join(SRC, file), "utf8")));
}

const CONSOLE_CALL = /\bconsole\s*\./;
const PROCESS_ENV = /\bprocess\s*\.\s*env\b/;
const DISCORD_IMPORT = /from\s+["']discord\.js["']/;

describe("architectural boundaries", () => {
  test("console is only called inside the logger", () => {
    expect(filesMatching(CONSOLE_CALL, ["lib/logger.ts"])).toEqual([]);
  });

  test("process.env is only read inside the environment module", () => {
    expect(filesMatching(PROCESS_ENV, ["config/env.ts"])).toEqual([]);
  });

  test("pure modules never import discord.js", () => {
    const offenders = filesMatching(DISCORD_IMPORT, []).filter(
      (file) =>
        file.startsWith("lib/") ||
        file.startsWith("config/") ||
        file.startsWith("contracts/") ||
        file === "roles/config.ts" ||
        file === "roles/diff.ts" ||
        file === "orpc/middleware.ts"
    );

    expect(offenders).toEqual([]);
  });
});
