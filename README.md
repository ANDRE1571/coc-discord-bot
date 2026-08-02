# CoC Discord Bot

A production-ready, scalable Discord bot built with **Node.js 22**, **TypeScript**, and **discord.js v14**, backed by the official **Clash of Clans API** and local **SQLite** persistence.

This project is a pure Discord bot — no website, dashboard, Docker, Prisma, PostgreSQL, or Express.

## Tech Stack

- Node.js 22
- TypeScript
- discord.js v14
- Axios
- SQLite (via Node's built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html) module — no native build step, no extra dependency)
- dotenv
- ESLint
- Prettier

## Project Structure

```
src/
  commands/     Slash command definitions (one file per command)
  events/       Discord gateway event handlers (one file per event)
  services/     Core services: client factory, command/event loaders, Clash API client, reminder scheduler
  database/     SQLite connection, schema migrations, and repositories
  utils/        Shared utilities: logger, embeds, validation, time parsing, shared types
  config/       Environment/configuration loader
  index.ts      Bot entry point / bootstrap
  deploy-commands.ts   Slash command registration script
```

### Architecture overview

**Core**
- **`config/env.ts`** — loads and validates environment variables via `dotenv`. Fails fast if required variables are missing.
- **`utils/logger.ts`** — a minimal leveled logger (`debug`/`info`/`warn`/`error`) scoped per module.
- **`utils/fileLoader.ts`** — recursively discovers command/event module files.
- **`utils/types.ts`** — shared `Command`, `BotEvent`, and `ExtendedClient` type contracts.
- **`services/client.ts`** — creates the `discord.js` `Client` with the minimal required Gateway Intents.
- **`services/commandHandler.ts`** / **`services/eventHandler.ts`** — auto-discover and register everything in `commands/` and `events/`.
- **`events/ready.ts`**, **`events/interactionCreate.ts`** — startup log + command dispatch with centralized error handling.
- **`deploy-commands.ts`** — registers slash commands with Discord (guild-scoped for fast iteration, or global).

**Clash of Clans API**
- **`services/clash.service.ts`** — Axios-based client (`getPlayer`, `getClan`, `getCurrentWar`) with automatic retry + rate-limit handling and a typed `ClashApiError`.
- **`services/clash.types.ts`** — TypeScript types for the API responses.
- **`utils/tagValidation.ts`** — validates/normalizes player & clan tags against Supercell's tag character set before ever hitting the network.

**Persistence (SQLite)**
- **`database/db.ts`** — opens the SQLite connection (via `node:sqlite`) and runs idempotent schema migrations on startup.
- **`database/repositories/accountsRepository.ts`** — CRUD for linked accounts (one Discord user ↔ many Clash accounts, one primary, any number favorited).
- **`database/repositories/remindersRepository.ts`** — CRUD + due-reminder queries for scheduled reminders.
- **`database/repositories/snapshotsRepository.ts`** — stores one stat "snapshot" per user+account, used to compute deltas for `/progress`.

**Shared embed/formatting helpers**
- **`utils/embeds.ts`** — brand colors, a base embed builder, error/success embed builders, a text progress bar renderer, Discord timestamp helpers, and a field-length chunker (keeps troop/spell lists under Discord's 1024-char field limit).
- **`utils/playerEmbeds.ts`** — the actual embed layouts for profile/heroes/troops/spells/pets/stats, shared by every command that renders player data.
- **`utils/clashErrors.ts`** — maps a `ClashApiError` (404 / 403 / 429 / other) into a consistent, friendly message used everywhere the API is called.
- **`utils/simplePlayerCommand.ts`** — a small factory that builds the common "validate tag → fetch player → render embed → handle errors" command shape, used by `/heroes`, `/troops`, `/spells`, `/pets`, and `/stats` so that flow isn't duplicated five times.
- **`utils/petNames.ts`** — the Clash of Clans API returns hero pets and siege machines inside the same `troops` array as regular troops; this classifies them so `/troops` and `/pets` show the right things.
- **`utils/time.ts`** — parses reminder durations (`30m`, `2h`, `1d12h`, or a plain number of minutes) and the Clash API's compact timestamp format.

**Background jobs**
- **`services/reminderScheduler.ts`** — polls SQLite every `REMINDER_CHECK_INTERVAL_MS` for due reminders and delivers them (channel message, falling back to a DM if the channel is no longer reachable).

This structure means adding a new command or event is just "drop a file in the right folder" — no manual registration wiring required.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable                     | Required | Description                                                                 |
|-------------------------------|:--------:|-------------------------------------------------------------------------------|
| `DISCORD_TOKEN`               | Yes      | Your bot's token from the Discord Developer Portal.                          |
| `DISCORD_CLIENT_ID`           | Yes      | Your application's Client ID.                                                |
| `DISCORD_GUILD_ID`            | No       | A guild ID for instant, guild-scoped command registration during development. Leave empty for global registration (can take up to 1 hour to propagate). |
| `LOG_LEVEL`                   | No       | One of `debug`, `info`, `warn`, `error`. Defaults to `info`.                  |
| `COC_API_KEY`                 | Yes      | Clash of Clans API token from [developer.clashofclans.com](https://developer.clashofclans.com), bound to this bot's public IP. |
| `DATABASE_PATH`               | No       | Path to the SQLite file. Defaults to `./data/bot.sqlite`.                    |
| `REMINDER_CHECK_INTERVAL_MS`  | No       | How often the reminder scheduler polls for due reminders. Defaults to `30000` (30s). |

### 3. Build

```bash
npm run build
```

### 4. Register slash commands

Registers all 18 commands with Discord.

```bash
npm run register
```

For live development without a build step: `npm run register:dev`

### 5. Run the bot

```bash
npm start
```

For live development without a build step: `npm run dev`

> **Note:** `node:sqlite` is still marked experimental by Node.js, so you'll see a one-time `ExperimentalWarning: SQLite is an experimental feature` line in the logs on startup. This is expected and harmless — it does not affect functionality. Node.js **22.13.0+** is required for `node:sqlite` to work without an extra CLI flag (see `engines` in `package.json`).

## Available Scripts

| Script                | Description                                              |
|------------------------|-----------------------------------------------------------|
| `npm run build`        | Compiles TypeScript to `dist/`.                           |
| `npm start`             | Runs the compiled bot from `dist/`.                        |
| `npm run dev`           | Runs the bot directly from TypeScript source with hot reload. |
| `npm run register`      | Registers slash commands (compiled).                       |
| `npm run register:dev`  | Registers slash commands (from TypeScript source).         |
| `npm run lint`          | Lints the codebase with ESLint.                             |
| `npm run lint:fix`      | Lints and auto-fixes issues.                                |
| `npm run format`        | Formats the codebase with Prettier.                         |
| `npm run format:check`  | Checks formatting without writing changes.                  |

## Commands

### Player lookup (any tag, no linking required)

| Command | Description |
|---|---|
| `/profile player_tag:<tag>` | Name, Town Hall, XP, league, trophies, best trophies, clan, war stars, heroes. |
| `/heroes player_tag:<tag>` | Every home-village hero with a level progress bar. |
| `/troops player_tag:<tag>` | Every home-village troop and level (pets/siege machines excluded). |
| `/spells player_tag:<tag>` | Every home-village spell and level. |
| `/pets player_tag:<tag>` | Every hero pet and level progress bar. |
| `/stats player_tag:<tag>` | Deeper stats: attack/defense wins, donations, capital contributions, achievement totals. |
| `/progress [player_tag]` | Compares current stats to your last `/progress` check for that account and shows deltas (▲/▼). Defaults to your primary linked account if `player_tag` is omitted. |

### Account linking

| Command | Description |
|---|---|
| `/link player_tag:<tag> [nickname]` | Links a Clash account to your Discord account. Your first linked account becomes primary automatically. |
| `/unlink player_tag:<tag>` | Unlinks an account. If it was primary, the next most-recently-linked account is promoted automatically. |
| `/accounts` | Lists all accounts you've linked, with live Town Hall/trophy data, primary (⭐) and favorite (💛) markers. |
| `/switch player_tag:<tag>` | Changes which linked account is primary (used by `/me`, `/today`, `/progress`). |
| `/favorite player_tag:<tag>` | Toggles a favorite bookmark on a linked account. |
| `/me` | Shows the profile embed for your primary linked account. |

### Utilities

| Command | Description |
|---|---|
| `/reminder create message:<text> in:<duration>` | Schedules a reminder (e.g. `in:30m`, `in:2h`, `in:1d12h`). |
| `/reminder list` | Lists your upcoming reminders with IDs. |
| `/reminder cancel reminder_id:<id>` | Cancels a reminder you created. |
| `/today` | Daily brief: your primary account's clan & current war status, plus reminders due in the next 24h. |

### General

| Command | Description |
|---|---|
| `/ping` | Replies with "Pong!" plus roundtrip and websocket latency. |
| `/help` | Lists every command, grouped by category. |
| `/about` | Bot version, Node.js/discord.js versions, latency, uptime, guild count. |

## Tag validation

Every command that accepts a `player_tag` runs it through `utils/tagValidation.ts` first: it normalizes casing, ensures a single leading `#`, and checks the result only contains Supercell's restricted tag alphabet (`0289PYLQGRJCUV`). Malformed tags are rejected immediately with a clear error message — no wasted API call.

## Clash of Clans API client

`src/services/clash.service.ts` wraps the official [Clash of Clans API](https://developer.clashofclans.com) with Axios:

```ts
import { getPlayer, getClan, getCurrentWar } from './services/clash.service';

const player = await getPlayer('#ABC123');   // '#' is optional, casing is normalized
const clan = await getClan('#DEF456');
const war = await getCurrentWar('#DEF456');
```

- **Retry**: network errors and `408/429/500/502/503/504` responses are retried automatically (3 attempts by default) with exponential backoff and jitter.
- **Rate limit handling**: on a `429` (or a `Retry-After`-bearing `503`), the client waits for the server-specified duration before retrying instead of guessing.
- **Errors**: any non-retryable or retry-exhausted failure throws a `ClashApiError` (`message`, `statusCode`, `reason`, `isRateLimited`), mapped to a friendly message by `utils/clashErrors.ts` everywhere it's caught.

## Persistence & data model

Local SQLite database (`node:sqlite`, no external dependency), three tables, created automatically on first run:

- **`linked_accounts`** — `discord_user_id`, `player_tag`, `nickname`, `is_primary`, `is_favorite`, `linked_at`. One row per Discord user × linked Clash account.
- **`player_snapshots`** — one row per Discord user × tracked tag, overwritten on every `/progress` call, used to compute deltas.
- **`reminders`** — `discord_user_id`, `channel_id`, `guild_id`, `message`, `remind_at`, `sent`. Polled by the background scheduler.

## Reminders

`/reminder create` stores a row in SQLite; a background interval (`services/reminderScheduler.ts`, controlled by `REMINDER_CHECK_INTERVAL_MS`) checks for due reminders, marks them sent, and delivers them by messaging the original channel (mentioning the user) or, if that channel is no longer reachable, DMing the user directly.

## Adding a new command

1. Create a new file in `src/commands/`, e.g. `src/commands/hello.ts`.
2. Default-export an object matching the `Command` interface (`data` + `execute`), or use `utils/simplePlayerCommand.ts` if it's a single-tag player lookup.
3. Run `npm run register` (or `register:dev`) to publish it to Discord.

No other file needs to change — the command handler discovers it automatically at startup.

## Adding a new event

1. Create a new file in `src/events/`, e.g. `src/events/guildMemberAdd.ts`.
2. Default-export an object matching the `BotEvent` interface (`name`, optional `once`, and `execute`).

The event handler discovers and binds it automatically at startup.

## Required Bot Permissions & Intents

This bot only needs the `Guilds` Gateway Intent (sufficient for slash command interactions and sending messages/DMs for reminders). If you add features that require message content, guild members, presences, etc., update the intents list in `src/services/client.ts` and enable the corresponding privileged intents in the Discord Developer Portal.

## License

MIT
