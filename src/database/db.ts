import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config/env';
import { createLogger } from '../utils/logger';

const logger = createLogger('Database');

const SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS linked_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_user_id TEXT NOT NULL,
    player_tag TEXT NOT NULL,
    nickname TEXT,
    is_primary INTEGER NOT NULL DEFAULT 0,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    linked_at INTEGER NOT NULL,
    UNIQUE (discord_user_id, player_tag)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_linked_accounts_user
    ON linked_accounts (discord_user_id)`,
  `CREATE TABLE IF NOT EXISTS player_snapshots (
    discord_user_id TEXT NOT NULL,
    player_tag TEXT NOT NULL,
    town_hall_level INTEGER NOT NULL,
    exp_level INTEGER NOT NULL,
    trophies INTEGER NOT NULL,
    best_trophies INTEGER NOT NULL,
    war_stars INTEGER NOT NULL,
    attack_wins INTEGER NOT NULL,
    defense_wins INTEGER NOT NULL,
    donations INTEGER NOT NULL,
    donations_received INTEGER NOT NULL,
    captured_at INTEGER NOT NULL,
    PRIMARY KEY (discord_user_id, player_tag)
  )`,
  `CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_user_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    guild_id TEXT,
    message TEXT NOT NULL,
    remind_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    sent INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_reminders_due
    ON reminders (sent, remind_at)`,
  `CREATE INDEX IF NOT EXISTS idx_reminders_user
    ON reminders (discord_user_id)`,
];

function ensureDatabaseDirectory(databasePath: string): void {
  const directory = path.dirname(databasePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function createConnection(): DatabaseSync {
  ensureDatabaseDirectory(config.databasePath);
  const connection = new DatabaseSync(config.databasePath);
  connection.exec('PRAGMA journal_mode = WAL;');
  connection.exec('PRAGMA foreign_keys = ON;');
  return connection;
}

let connection: DatabaseSync | undefined;

/**
 * Returns the singleton SQLite connection, opening and migrating it on
 * first access.
 */
export function getDatabase(): DatabaseSync {
  if (!connection) {
    connection = createConnection();
    logger.info(`Opened SQLite database at ${config.databasePath}`);
  }
  return connection;
}

/** Runs all schema migrations. Safe to call multiple times (idempotent DDL). */
export function migrate(): void {
  const db = getDatabase();
  for (const statement of SCHEMA_STATEMENTS) {
    db.exec(statement);
  }
  logger.info('Database schema is up to date.');
}

/** Closes the database connection, if open. Call during graceful shutdown. */
export function closeDatabase(): void {
  if (connection) {
    connection.close();
    connection = undefined;
    logger.info('Database connection closed.');
  }
}
