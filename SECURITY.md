# Security Policy

## Reporting a vulnerability

Do not open a public issue for a security problem.

Report it privately through GitHub Security Advisories:
<https://github.com/AltioraPro/discord-bot-oss/security/advisories/new>

Please include what the issue is, how to reproduce it, and what an attacker
could achieve. You will get an acknowledgement within a few days.

## Scope

This repository is the Community Edition of the Altiora Discord bot. Findings
about the bot Altiora runs in production, or about altiora.pro, belong to
Altiora's own disclosure process rather than here.

## Supported versions

Only the latest release receives fixes. This project is pre-1.0 and does not
maintain release branches.

## Self-hosting notes

`WEBHOOK_SECRET` authenticates every inbound call. Treat it as a credential:
generate it randomly, never commit it, and rotate it if it is exposed. The
same applies to `DISCORD_BOT_TOKEN` and `API_SECRET`.
