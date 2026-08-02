import { getDatabase } from '../db';

export interface Reminder {
  id: number;
  discordUserId: string;
  channelId: string;
  guildId: string | null;
  message: string;
  remindAt: number;
  createdAt: number;
  sent: boolean;
}

interface ReminderRow {
  id: number;
  discord_user_id: string;
  channel_id: string;
  guild_id: string | null;
  message: string;
  remind_at: number;
  created_at: number;
  sent: number;
}

function toDomain(row: ReminderRow): Reminder {
  return {
    id: row.id,
    discordUserId: row.discord_user_id,
    channelId: row.channel_id,
    guildId: row.guild_id,
    message: row.message,
    remindAt: row.remind_at,
    createdAt: row.created_at,
    sent: row.sent === 1,
  };
}

export interface CreateReminderInput {
  discordUserId: string;
  channelId: string;
  guildId: string | null;
  message: string;
  remindAt: number;
}

/** Creates a new reminder and returns it. */
export function createReminder(input: CreateReminderInput): Reminder {
  const db = getDatabase();
  const createdAt = Date.now();

  const result = db
    .prepare(
      `INSERT INTO reminders (discord_user_id, channel_id, guild_id, message, remind_at, created_at, sent)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
    )
    .run(input.discordUserId, input.channelId, input.guildId, input.message, input.remindAt, createdAt);

  const id = Number(result.lastInsertRowid);
  return {
    id,
    discordUserId: input.discordUserId,
    channelId: input.channelId,
    guildId: input.guildId,
    message: input.message,
    remindAt: input.remindAt,
    createdAt,
    sent: false,
  };
}

/** Returns a user's upcoming (unsent) reminders, soonest first. */
export function listUpcomingRemindersForUser(discordUserId: string): Reminder[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT * FROM reminders WHERE discord_user_id = ? AND sent = 0 ORDER BY remind_at ASC`,
    )
    .all(discordUserId) as unknown as ReminderRow[];
  return rows.map(toDomain);
}

/** Returns a user's unsent reminders due at or before `beforeTimestamp` (defaults to now + 24h). */
export function listRemindersDueSoonForUser(
  discordUserId: string,
  beforeTimestamp: number,
): Reminder[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT * FROM reminders
       WHERE discord_user_id = ? AND sent = 0 AND remind_at <= ?
       ORDER BY remind_at ASC`,
    )
    .all(discordUserId, beforeTimestamp) as unknown as ReminderRow[];
  return rows.map(toDomain);
}

/** Returns every unsent reminder whose `remind_at` has passed — used by the scheduler. */
export function listDueReminders(now: number): Reminder[] {
  const db = getDatabase();
  const rows = db
    .prepare(`SELECT * FROM reminders WHERE sent = 0 AND remind_at <= ? ORDER BY remind_at ASC`)
    .all(now) as unknown as ReminderRow[];
  return rows.map(toDomain);
}

/** Marks a reminder as sent so the scheduler won't re-deliver it. */
export function markReminderSent(id: number): void {
  const db = getDatabase();
  db.prepare(`UPDATE reminders SET sent = 1 WHERE id = ?`).run(id);
}

/** Cancels (deletes) a user's own reminder by id. Returns false if not found or not owned by them. */
export function cancelReminder(discordUserId: string, reminderId: number): boolean {
  const db = getDatabase();
  const result = db
    .prepare(`DELETE FROM reminders WHERE id = ? AND discord_user_id = ?`)
    .run(reminderId, discordUserId);
  return Number(result.changes) > 0;
}
