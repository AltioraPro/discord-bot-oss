# Contributing

Thanks for considering a contribution.

## Language

Everything committed to this repository is in **English**: code, comments,
documentation, log output, error messages, commit messages, and strings shown
to Discord users. This is not negotiable — it is what keeps the project
readable to everyone.

## Scope

This is the Community Edition: deepwork sessions and role sync. Features that
belong to Altiora's private production bot — slash commands, moderation,
reminders, GitHub integration, admin APIs — are out of scope and will be
declined, however well implemented.

This repository has no database. Pull requests adding `drizzle-orm`,
`@neondatabase/serverless` or any direct persistence layer will be declined.
Persistence belongs behind the oRPC backend contract.

## Setup

```bash
bun install
cp .env.example .env
```

## Before you push

```bash
bun run check
```

This runs the linter, the type checker and the tests — the same command CI
runs. If it passes locally it passes in CI.

Use `bun run format` to autofix most lint and formatting issues.

## Branches

Name your branch by its type:

`feat/…` · `fix/…` · `chore/…` · `docs/…` · `ci/…` · `refactor/…` · `test/…`

One pull request, one subject.

## Commits and pull request titles

Pull requests are **squash merged**, so the pull request title becomes the
commit message on `main` and feeds the changelog. The title must follow
[Conventional Commits](https://www.conventionalcommits.org/) and is validated
by CI:

```text
feat: add deepwork session store
fix: stop check-in timer after a member leaves the channel
docs: document the backend contract
```

Allowed types: `feat`, `fix`, `chore`, `docs`, `ci`, `refactor`, `test`,
`perf`, `build`, `revert`. The subject starts with a lowercase letter.

Your individual commits inside the branch are not validated — work however you
like, the squash collapses them.

## Tests

New behaviour comes with a test. Tests live next to the code as `*.test.ts`,
or in `test/` when they cover repository-level concerns.

## Configuration

`src/config/env.ts` is the only file permitted to read `process.env`. When you
add a variable, add it to the Zod schema **and** to `.env.example` — a test
enforces that the two never drift apart.

Never hardcode a Discord id. They come from configuration.
