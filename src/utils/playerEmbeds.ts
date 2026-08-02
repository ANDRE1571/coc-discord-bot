import { EmbedBuilder } from 'discord.js';
import { Player, PlayerTroopOrSpell } from '../services/clash.types';
import { baseEmbed, chunkLines, progressBar } from './embeds';
import { isPet, isSiegeMachine } from './petNames';

function formatTownHall(player: Player): string {
  const weapon = player.townHallWeaponLevel ? ` (Weapon Lv. ${player.townHallWeaponLevel})` : '';
  return `Level ${player.townHallLevel}${weapon}`;
}

function formatLeague(player: Player): string {
  return player.league?.name ?? 'Unranked';
}

function formatClan(player: Player): string {
  if (!player.clan) return 'No Clan';
  return `${player.clan.name} (${player.clan.tag})`;
}

function thumbnailFor(player: Player): string | null {
  return (
    player.league?.iconUrls?.medium ??
    player.league?.iconUrls?.small ??
    player.clan?.badgeUrls?.medium ??
    player.clan?.badgeUrls?.large ??
    null
  );
}

function formatHeroesShort(heroes: PlayerTroopOrSpell[] | undefined): string {
  const homeHeroes = (heroes ?? []).filter((hero) => hero.village === 'home');
  if (homeHeroes.length === 0) return 'None';
  return homeHeroes.map((hero) => `**${hero.name}**: ${hero.level}/${hero.maxLevel}`).join('\n');
}

/** Builds the primary player profile embed used by `/profile` and `/me`. */
export function buildProfileEmbed(player: Player): EmbedBuilder {
  const embed = baseEmbed(player.name)
    .setDescription(`\`${player.tag}\``)
    .addFields(
      { name: '🏛️ Town Hall', value: formatTownHall(player), inline: true },
      { name: '⭐ XP Level', value: `${player.expLevel}`, inline: true },
      { name: '🏆 League', value: formatLeague(player), inline: true },
      { name: '🏆 Trophies', value: `${player.trophies}`, inline: true },
      { name: '📈 Best Trophies', value: `${player.bestTrophies}`, inline: true },
      { name: '🛡️ Clan', value: formatClan(player), inline: true },
      { name: '⚔️ War Stars', value: `${player.warStars}`, inline: true },
      { name: '🦸 Heroes', value: formatHeroesShort(player.heroes), inline: false },
    );

  const thumbnail = thumbnailFor(player);
  if (thumbnail) embed.setThumbnail(thumbnail);

  return embed;
}

/** Builds the detailed hero progress embed used by `/heroes`. */
export function buildHeroesEmbed(player: Player): EmbedBuilder {
  const homeHeroes = (player.heroes ?? []).filter((hero) => hero.village === 'home');
  const embed = baseEmbed(`🦸 ${player.name}'s Heroes`).setDescription(`\`${player.tag}\``);

  if (homeHeroes.length === 0) {
    embed.addFields({ name: 'No heroes unlocked yet', value: 'Upgrade your Town Hall to unlock heroes.' });
    return embed;
  }

  for (const hero of homeHeroes) {
    embed.addFields({
      name: `${hero.name} — Lv. ${hero.level}/${hero.maxLevel}`,
      value: progressBar(hero.level, hero.maxLevel),
      inline: false,
    });
  }

  const thumbnail = thumbnailFor(player);
  if (thumbnail) embed.setThumbnail(thumbnail);

  return embed;
}

/** Builds the troop progress embed used by `/troops` (excludes pets & siege machines). */
export function buildTroopsEmbed(player: Player): EmbedBuilder {
  const troops = (player.troops ?? []).filter(
    (troop) => troop.village === 'home' && !isPet(troop.name) && !isSiegeMachine(troop.name),
  );
  const embed = baseEmbed(`⚔️ ${player.name}'s Troops`).setDescription(`\`${player.tag}\``);

  if (troops.length === 0) {
    embed.addFields({ name: 'No troops unlocked yet', value: 'Build a Barracks to start training troops.' });
    return embed;
  }

  const lines = troops.map((troop) => `**${troop.name}**: Lv. ${troop.level}/${troop.maxLevel}`);
  const chunks = chunkLines(lines);

  chunks.forEach((chunk, index) => {
    embed.addFields({
      name: chunks.length > 1 ? `Troops (${index + 1}/${chunks.length})` : 'Troops',
      value: chunk,
      inline: false,
    });
  });

  const thumbnail = thumbnailFor(player);
  if (thumbnail) embed.setThumbnail(thumbnail);

  return embed;
}

/** Builds the spell progress embed used by `/spells`. */
export function buildSpellsEmbed(player: Player): EmbedBuilder {
  const spells = (player.spells ?? []).filter((spell) => spell.village === 'home');
  const embed = baseEmbed(`🧪 ${player.name}'s Spells`).setDescription(`\`${player.tag}\``);

  if (spells.length === 0) {
    embed.addFields({ name: 'No spells unlocked yet', value: 'Build a Spell Factory to start brewing spells.' });
    return embed;
  }

  const lines = spells.map((spell) => `**${spell.name}**: Lv. ${spell.level}/${spell.maxLevel}`);
  const chunks = chunkLines(lines);

  chunks.forEach((chunk, index) => {
    embed.addFields({
      name: chunks.length > 1 ? `Spells (${index + 1}/${chunks.length})` : 'Spells',
      value: chunk,
      inline: false,
    });
  });

  const thumbnail = thumbnailFor(player);
  if (thumbnail) embed.setThumbnail(thumbnail);

  return embed;
}

/** Builds the pet progress embed used by `/pets`. */
export function buildPetsEmbed(player: Player): EmbedBuilder {
  const pets = (player.troops ?? []).filter((troop) => troop.village === 'home' && isPet(troop.name));
  const embed = baseEmbed(`🐾 ${player.name}'s Pets`).setDescription(`\`${player.tag}\``);

  if (pets.length === 0) {
    embed.addFields({ name: 'No pets unlocked yet', value: 'Build a Pet House to unlock hero pets.' });
    return embed;
  }

  for (const pet of pets) {
    embed.addFields({
      name: `${pet.name} — Lv. ${pet.level}/${pet.maxLevel}`,
      value: progressBar(pet.level, pet.maxLevel),
      inline: true,
    });
  }

  const thumbnail = thumbnailFor(player);
  if (thumbnail) embed.setThumbnail(thumbnail);

  return embed;
}

/** Builds the broader statistics embed used by `/stats`. */
export function buildStatsEmbed(player: Player): EmbedBuilder {
  const embed = baseEmbed(`📊 ${player.name}'s Stats`).setDescription(`\`${player.tag}\``);

  const achievementStars = (player.achievements ?? []).reduce((sum, a) => sum + a.stars, 0);
  const completedAchievements = (player.achievements ?? []).filter(
    (a) => a.stars >= 3 || a.value >= a.target,
  ).length;

  embed.addFields(
    { name: '🏛️ Town Hall', value: formatTownHall(player), inline: true },
    { name: '⭐ XP Level', value: `${player.expLevel}`, inline: true },
    { name: '🏆 League', value: formatLeague(player), inline: true },
    { name: '🏆 Trophies', value: `${player.trophies}`, inline: true },
    { name: '📈 Best Trophies', value: `${player.bestTrophies}`, inline: true },
    { name: '⚔️ War Stars', value: `${player.warStars}`, inline: true },
    { name: '🗡️ Attack Wins', value: `${player.attackWins}`, inline: true },
    { name: '🛡️ Defense Wins', value: `${player.defenseWins}`, inline: true },
    { name: '🛡️ Clan', value: formatClan(player), inline: true },
    { name: '🎁 Donations', value: `${player.donations}`, inline: true },
    { name: '📥 Donations Received', value: `${player.donationsReceived}`, inline: true },
    {
      name: '🏰 Capital Contributions',
      value: `${player.clanCapitalContributions ?? 0}`,
      inline: true,
    },
    {
      name: '🏅 Achievements',
      value: `${completedAchievements} completed · ${achievementStars} stars total`,
      inline: false,
    },
  );

  const thumbnail = thumbnailFor(player);
  if (thumbnail) embed.setThumbnail(thumbnail);

  return embed;
}
