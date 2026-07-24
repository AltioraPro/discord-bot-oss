import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';

/**
 * Returns true when git considers `path` ignored.
 * `git check-ignore -q` exits 0 for ignored paths and 1 for tracked ones.
 */
function isIgnored(path: string): boolean {
  const result = spawnSync('git', ['check-ignore', '-q', path], {
    cwd: `${import.meta.dir}/..`,
  });
  return result.status === 0;
}

describe('.gitignore', () => {
  const mustBeIgnored = [
    // Secrets. This repository is public; a mistake here is unrecoverable.
    '.env',
    '.env.production',
    '.env.local',
    'secrets.json',
    'credentials.json',
    'server.key',
    'server.pem',
    '.npmrc',
    '.netrc',

    // Build and dependency output
    'node_modules/anything',
    'dist/index.js',
    'coverage/index.html',

    // Logs
    'debug.log',

    // OS artefacts
    'Thumbs.db',
    '.DS_Store',

    // Assistant and internal planning artefacts
    '.claude/settings.local.json',
    'CLAUDE.md',
    'AGENTS.md',
    'docs/superpowers/specs/anything.md',
    'docs/superpowers/plans/anything.md',
  ];

  const mustBeTracked = [
    '.env.example',
    '.vscode/settings.json',
    '.vscode/extensions.json',
    'src/index.ts',
    'package.json',
    'bun.lock',
    'README.md',
    'Dockerfile',
  ];

  test.each(mustBeIgnored)('ignores %s', (path) => {
    expect(isIgnored(path)).toBe(true);
  });

  test.each(mustBeTracked)('does not ignore %s', (path) => {
    expect(isIgnored(path)).toBe(false);
  });
});
