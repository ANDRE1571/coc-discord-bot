import { getDatabase } from '../db';

export interface LinkedAccount {
  id: number;
  discordUserId: string;
  playerTag: string;
  nickname: string | null;
  isPrimary: boolean;
  isFavorite: boolean;
  linkedAt: number;
}

interface LinkedAccountRow {
  id: number;
  discord_user_id: string;
  player_tag: string;
  nickname: string | null;
  is_primary: number;
  is_favorite: number;
  linked_at: number;
}

function toDomain(row: LinkedAccountRow): LinkedAccount {
  return {
    id: row.id,
    discordUserId: row.discord_user_id,
    playerTag: row.player_tag,
    nickname: row.nickname,
    isPrimary: row.is_primary === 1,
    isFavorite: row.is_favorite === 1,
    linkedAt: row.linked_at,
  };
}

/** Returns every account a Discord user has linked, most recently linked first. */
export function listAccounts(discordUserId: string): LinkedAccount[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT * FROM linked_accounts WHERE discord_user_id = ? ORDER BY linked_at DESC`,
    )
    .all(discordUserId) as unknown as LinkedAccountRow[];
  return rows.map(toDomain);
}

/** Returns a specific linked account for a user by tag, or null if not linked. */
export function findAccount(discordUserId: string, playerTag: string): LinkedAccount | null {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT * FROM linked_accounts WHERE discord_user_id = ? AND player_tag = ?`)
    .get(discordUserId, playerTag) as unknown as LinkedAccountRow | undefined;
  return row ? toDomain(row) : null;
}

/** Returns a user's primary (default) account, or null if none is set. */
export function getPrimaryAccount(discordUserId: string): LinkedAccount | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT * FROM linked_accounts WHERE discord_user_id = ? AND is_primary = 1 LIMIT 1`,
    )
    .get(discordUserId) as unknown as LinkedAccountRow | undefined;
  return row ? toDomain(row) : null;
}

export function countAccounts(discordUserId: string): number {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM linked_accounts WHERE discord_user_id = ?`)
    .get(discordUserId) as unknown as { count: number };
  return row.count;
}

/**
 * Links a new account for a user. The very first account a user links is
 * automatically made primary. Throws if the tag is already linked by this
 * user (enforced by the underlying UNIQUE constraint).
 */
export function linkAccount(
  discordUserId: string,
  playerTag: string,
  nickname: string | null,
): LinkedAccount {
  const db = getDatabase();
  const isFirstAccount = countAccounts(discordUserId) === 0;

  db.prepare(
    `INSERT INTO linked_accounts
      (discord_user_id, player_tag, nickname, is_primary, is_favorite, linked_at)
     VALUES (?, ?, ?, ?, 0, ?)`,
  ).run(discordUserId, playerTag, nickname, isFirstAccount ? 1 : 0, Date.now());

  const created = findAccount(discordUserId, playerTag);
  if (!created) {
    throw new Error('Failed to read back newly linked account.');
  }
  return created;
}

/**
 * Unlinks an account. If it was the primary account and other accounts
 * remain, the most recently linked remaining account is promoted to
 * primary automatically.
 */
export function unlinkAccount(discordUserId: string, playerTag: string): boolean {
  const db = getDatabase();
  const existing = findAccount(discordUserId, playerTag);
  if (!existing) {
    return false;
  }

  db.prepare(`DELETE FROM linked_accounts WHERE discord_user_id = ? AND player_tag = ?`).run(
    discordUserId,
    playerTag,
  );

  if (existing.isPrimary) {
    const remaining = listAccounts(discordUserId);
    if (remaining.length > 0) {
      setPrimaryAccount(discordUserId, remaining[0].playerTag);
    }
  }

  return true;
}

/** Sets the given (already-linked) account as the user's primary account. */
export function setPrimaryAccount(discordUserId: string, playerTag: string): boolean {
  const db = getDatabase();
  const existing = findAccount(discordUserId, playerTag);
  if (!existing) {
    return false;
  }

  db.prepare(`UPDATE linked_accounts SET is_primary = 0 WHERE discord_user_id = ?`).run(
    discordUserId,
  );
  db.prepare(
    `UPDATE linked_accounts SET is_primary = 1 WHERE discord_user_id = ? AND player_tag = ?`,
  ).run(discordUserId, playerTag);

  return true;
}

/** Sets or clears the favorite bookmark on an already-linked account. */
export function setFavorite(
  discordUserId: string,
  playerTag: string,
  isFavorite: boolean,
): boolean {
  const db = getDatabase();
  const existing = findAccount(discordUserId, playerTag);
  if (!existing) {
    return false;
  }

  db.prepare(
    `UPDATE linked_accounts SET is_favorite = ? WHERE discord_user_id = ? AND player_tag = ?`,
  ).run(isFavorite ? 1 : 0, discordUserId, playerTag);

  return true;
}
