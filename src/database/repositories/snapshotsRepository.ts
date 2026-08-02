import { getDatabase } from '../db';
import { Player } from '../../services/clash.types';

export interface PlayerSnapshot {
  discordUserId: string;
  playerTag: string;
  townHallLevel: number;
  expLevel: number;
  trophies: number;
  bestTrophies: number;
  warStars: number;
  attackWins: number;
  defenseWins: number;
  donations: number;
  donationsReceived: number;
  capturedAt: number;
}

interface PlayerSnapshotRow {
  discord_user_id: string;
  player_tag: string;
  town_hall_level: number;
  exp_level: number;
  trophies: number;
  best_trophies: number;
  war_stars: number;
  attack_wins: number;
  defense_wins: number;
  donations: number;
  donations_received: number;
  captured_at: number;
}

function toDomain(row: PlayerSnapshotRow): PlayerSnapshot {
  return {
    discordUserId: row.discord_user_id,
    playerTag: row.player_tag,
    townHallLevel: row.town_hall_level,
    expLevel: row.exp_level,
    trophies: row.trophies,
    bestTrophies: row.best_trophies,
    warStars: row.war_stars,
    attackWins: row.attack_wins,
    defenseWins: row.defense_wins,
    donations: row.donations,
    donationsReceived: row.donations_received,
    capturedAt: row.captured_at,
  };
}

/** Returns the most recently saved snapshot for a user+tag, or null if none exists yet. */
export function getLatestSnapshot(discordUserId: string, playerTag: string): PlayerSnapshot | null {
  const db = getDatabase();
  const row = db
    .prepare(`SELECT * FROM player_snapshots WHERE discord_user_id = ? AND player_tag = ?`)
    .get(discordUserId, playerTag) as unknown as PlayerSnapshotRow | undefined;
  return row ? toDomain(row) : null;
}

/**
 * Saves (or overwrites) the snapshot for a user+tag with the player's
 * current stats. One snapshot is kept per user+tag — each call replaces
 * the previous baseline.
 */
export function saveSnapshot(discordUserId: string, playerTag: string, player: Player): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO player_snapshots
      (discord_user_id, player_tag, town_hall_level, exp_level, trophies, best_trophies,
       war_stars, attack_wins, defense_wins, donations, donations_received, captured_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (discord_user_id, player_tag) DO UPDATE SET
       town_hall_level = excluded.town_hall_level,
       exp_level = excluded.exp_level,
       trophies = excluded.trophies,
       best_trophies = excluded.best_trophies,
       war_stars = excluded.war_stars,
       attack_wins = excluded.attack_wins,
       defense_wins = excluded.defense_wins,
       donations = excluded.donations,
       donations_received = excluded.donations_received,
       captured_at = excluded.captured_at`,
  ).run(
    discordUserId,
    playerTag,
    player.townHallLevel,
    player.expLevel,
    player.trophies,
    player.bestTrophies,
    player.warStars,
    player.attackWins,
    player.defenseWins,
    player.donations,
    player.donationsReceived,
    Date.now(),
  );
}
