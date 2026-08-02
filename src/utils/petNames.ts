/**
 * The Clash of Clans API returns hero pets inside the same `troops` array
 * as regular troops and siege machines, with no distinguishing field. This
 * is the known set of pet names (Pet House unlocks) used to separate them
 * out for the `/pets` command.
 */
const HOME_VILLAGE_PET_NAMES = new Set<string>([
  'L.A.S.S.I',
  'Electro Owl',
  'Mighty Yak',
  'Unicorn',
  'Frosty',
  'Diggy',
  'Poison Lizard',
  'Phoenix',
  'Spirit Fox',
  'Angry Jelly',
  'Sneezy',
]);

export function isPet(troopName: string): boolean {
  return HOME_VILLAGE_PET_NAMES.has(troopName);
}

/**
 * Siege machines also live in the `troops` array. Recognized so `/troops`
 * can exclude them from the regular troop list and `/pets` never confuses
 * them with pets.
 */
const SIEGE_MACHINE_NAMES = new Set<string>([
  'Wall Wrecker',
  'Battle Blimp',
  'Stone Slammer',
  'Siege Barracks',
  'Log Launcher',
  'Flame Flinger',
  'Battle Drill',
  'Troop Launcher',
]);

export function isSiegeMachine(troopName: string): boolean {
  return SIEGE_MACHINE_NAMES.has(troopName);
}
