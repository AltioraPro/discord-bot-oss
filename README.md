# Altiora Discord Bot — Community Edition

> The open source Discord bot for [Altiora](https://altiora.pro) — community edition with deepwork sessions and role sync. Some features remain proprietary.

![Open Source](https://img.shields.io/badge/open%20source-yes-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Community Edition](https://img.shields.io/badge/edition-community-orange)
![Self-hosted](https://img.shields.io/badge/deployment-self--hosted-lightgrey)

**This is not the bot Altiora runs in production.** It is a deliberately reduced
edition: the deepwork core and role sync are public, the rest stays private. No
feature parity is promised between the two.

## What you get

| Feature | Community (this repo) | Altiora production (private) |
|---|---|---|
| Deepwork voice sessions and check-ins | yes | yes |
| Role sync over webhooks | yes | yes |
| Discord OAuth proxy | yes | yes |
| Slash commands | no | yes |
| Moderation tooling | no | yes |
| Goal reminders | no | yes |
| GitHub integration | no | yes |
| Centralised Discord logging | no | yes |
| Admin API | no | yes |

Self-hosting gives you deepwork and role sync. Anything else you implement
yourself, or you use the official Altiora bot.

## Status

Milestone 1. The bot connects to Discord, logs its startup state and shuts down
cleanly. Role sync and deepwork sessions land in subsequent releases — see
`CHANGELOG.md`.

Concretely: today the bot comes online in your guild and does nothing else. It
does not yet react to voice channels or synchronise roles.

## Requirements

- [Bun](https://bun.sh) 1.3.14 or newer
- A Discord application with a bot user
- Optionally, a backend exposing the oRPC contract described below

## Getting started

```bash
git clone https://github.com/AltioraPro/discord-bot-oss.git
cd discord-bot-oss
bun install
cp .env.example .env
# fill in .env, then
bun run dev
```

The bot refuses to start on an invalid configuration and prints every problem
at once rather than the first.

## Configuration

Every variable is documented in [`.env.example`](.env.example). Required:
`DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DEEPWORK_VOICE_CHANNEL_IDS`,
`WEBHOOK_SECRET`.

`APP_URL` and `API_SECRET` are optional and must be set together. Without them
the bot runs in degraded mode: deepwork sessions live in memory only and
nothing is persisted.

`LOG_LEVEL` (`debug` | `info` | `warn` | `error`, default `info`) sets the
minimum level. `NODE_ENV=production` switches logging to one JSON object per
line for log shipping; anything else prints human readable lines. Warnings and
errors go to stderr, everything else to stdout.

## Discord application setup

**Intents:** Guilds, Guild Members, Guild Voice States

Only **Server Members Intent** is privileged and must be switched on manually:
Developer Portal → your application → Bot → Privileged Gateway Intents. Guild
Voice States is not privileged despite what it does. If Server Members is left
off, the bot refuses to start with a message naming that exact checkbox.

**Permissions:** Manage Roles, Send Messages, Embed Links, Move Members

**Scope:** `bot`

## Backend contract

This repository contains no database. Persistence is delegated to an external
backend over oRPC at `{APP_URL}/api/rpc`. Altiora implements it with Next.js,
Neon and Drizzle — none of which are dependencies here.

To self-host with your own backend, implement three procedures:

- `user.lookup({ discordId })` returning `{ userId, rank?, isPro? }`
- `pomodoro.start({ userId, discordId, channelId, duration, format })` returning `{ sessionId }`
- `pomodoro.save({ userId, discordId, duration, workTime, status, endedAt })` returning `{ success }`

The authoritative shapes will live in `src/contracts/` once that module lands.

## Docker

```bash
docker build --tag discord-bot-oss .
docker run --env-file .env -p 3001:3001 discord-bot-oss
```

## Scripts

| Command | Purpose |
|---|---|
| `bun run dev` | Watch mode |
| `bun run check` | Lint, typecheck and test — what CI runs |
| `bun run format` | Autofix formatting and lint issues |
| `bun run build` | Bundle to `dist/` |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Everything in this repository is in
English, including Discord-facing strings.

## License

MIT — see [LICENSE](LICENSE).
