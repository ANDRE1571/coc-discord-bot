/**
 * Type definitions for the subset of the official Clash of Clans API
 * (https://developer.clashofclans.com) consumed by this bot.
 *
 * These are intentionally scoped to the fields actually used/returned by
 * the endpoints this service calls (`/players/{tag}`, `/clans/{tag}`,
 * `/clans/{tag}/currentwar`). Extend as new fields are needed.
 */

export interface BadgeUrls {
  small: string;
  large: string;
  medium?: string;
}

export interface IconUrls {
  small: string;
  tiny?: string;
  medium?: string;
}

export interface League {
  id: number;
  name: string;
  iconUrls: IconUrls;
}

export interface PlayerClanRef {
  tag: string;
  name: string;
  clanLevel: number;
  badgeUrls: BadgeUrls;
}

export interface PlayerLabel {
  id: number;
  name: string;
  iconUrls: IconUrls;
}

export interface PlayerAchievement {
  name: string;
  stars: number;
  value: number;
  target: number;
  info: string;
  completionInfo: string | null;
  village: 'home' | 'builderBase';
}

export interface PlayerTroopOrSpell {
  name: string;
  level: number;
  maxLevel: number;
  village: 'home' | 'builderBase';
  superTroopIsActive?: boolean;
}

/** Response shape for GET /players/{playerTag} */
export interface Player {
  tag: string;
  name: string;
  townHallLevel: number;
  townHallWeaponLevel?: number;
  expLevel: number;
  trophies: number;
  bestTrophies: number;
  warStars: number;
  attackWins: number;
  defenseWins: number;
  builderHallLevel?: number;
  versionTrophies?: number;
  bestVersionTrophies?: number;
  role?: string;
  donations: number;
  donationsReceived: number;
  clanCapitalContributions?: number;
  league?: League;
  builderBaseLeague?: { id: number; name: string };
  clan?: PlayerClanRef;
  labels?: PlayerLabel[];
  achievements?: PlayerAchievement[];
  troops?: PlayerTroopOrSpell[];
  heroes?: PlayerTroopOrSpell[];
  spells?: PlayerTroopOrSpell[];
}

export type WarFrequency =
  | 'unknown'
  | 'always'
  | 'moreThanOncePerWeek'
  | 'oncePerWeek'
  | 'lessThanOncePerWeek'
  | 'never'
  | 'any';

export interface ClanLabel {
  id: number;
  name: string;
  iconUrls: IconUrls;
}

export interface ClanWarLeague {
  id: number;
  name: string;
}

export interface ClanMemberList {
  tag: string;
  name: string;
  role: string;
  expLevel: number;
  league?: League;
  trophies: number;
  builderBaseTrophies?: number;
  clanRank: number;
  previousClanRank: number;
  donations: number;
  donationsReceived: number;
}

/** Response shape for GET /clans/{clanTag} */
export interface Clan {
  tag: string;
  name: string;
  type: 'open' | 'inviteOnly' | 'closed';
  description: string;
  badgeUrls: BadgeUrls;
  clanLevel: number;
  clanPoints: number;
  clanBuilderBasePoints?: number;
  clanCapitalPoints?: number;
  capitalLeague?: { id: number; name: string };
  requiredTrophies: number;
  requiredBuilderBaseTrophies?: number;
  requiredTownhallLevel?: number;
  warFrequency: WarFrequency;
  warWinStreak: number;
  warWins: number;
  warTies?: number;
  warLosses?: number;
  isWarLogPublic: boolean;
  warLeague?: ClanWarLeague;
  members: number;
  labels?: ClanLabel[];
  location?: { id: number; name: string; isCountry: boolean; countryCode?: string };
  memberList?: ClanMemberList[];
}

export type WarState = 'notInWar' | 'preparation' | 'inWar' | 'warEnded';

export interface WarAttack {
  attackerTag: string;
  defenderTag: string;
  stars: number;
  destructionPercentage: number;
  order: number;
  duration: number;
}

export interface WarClanMember {
  tag: string;
  name: string;
  townhallLevel: number;
  mapPosition: number;
  attacks?: WarAttack[];
  opponentAttacks: number;
  bestOpponentAttack?: WarAttack;
}

export interface WarClan {
  tag?: string;
  name?: string;
  badgeUrls?: BadgeUrls;
  clanLevel?: number;
  attacks?: number;
  stars: number;
  destructionPercentage: number;
  members?: WarClanMember[];
}

/** Response shape for GET /clans/{clanTag}/currentwar */
export interface CurrentWar {
  state: WarState;
  teamSize: number;
  attacksPerMember?: number;
  preparationStartTime?: string;
  startTime?: string;
  endTime?: string;
  clan: WarClan;
  opponent: WarClan;
}

/** Error payload shape returned by the Clash of Clans API on non-2xx responses. */
export interface ClashApiErrorPayload {
  reason: string;
  message?: string;
}
