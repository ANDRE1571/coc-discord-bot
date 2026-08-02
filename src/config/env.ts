import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface BotConfig {
  discordToken: string;
  clientId: string;
  guildId: string | undefined;
  logLevel: LogLevel;
  cocApiKey: string;
  databasePath: string;
  reminderCheckIntervalMs: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function resolveLogLevel(raw: string | undefined): LogLevel {
  const allowed: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  if (raw && allowed.includes(raw as LogLevel)) {
    return raw as LogLevel;
  }
  return 'info';
}

function resolvePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function loadConfig(): BotConfig {
  return {
    discordToken: requireEnv('DISCORD_TOKEN'),
    clientId: requireEnv('DISCORD_CLIENT_ID'),
    guildId: process.env.DISCORD_GUILD_ID?.trim() || undefined,
    logLevel: resolveLogLevel(process.env.LOG_LEVEL),
    cocApiKey: requireEnv('COC_API_KEY'),
    databasePath: process.env.DATABASE_PATH?.trim() || path.resolve(process.cwd(), 'data', 'bot.sqlite'),
    reminderCheckIntervalMs: resolvePositiveInt(process.env.REMINDER_CHECK_INTERVAL_MS, 30_000),
  };
}

export const config = loadConfig();
