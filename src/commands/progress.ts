import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import * as accountsRepository from '../database/repositories/accountsRepository';
import * as snapshotsRepository from '../database/repositories/snapshotsRepository';
import { PlayerSnapshot } from '../database/repositories/snapshotsRepository';
import { getPlayer } from '../services/clash.service';
import { Player } from '../services/clash.types';
import { resolveClashErrorMessage } from '../utils/clashErrors';
import { baseEmbed, errorEmbed, fullTimestamp } from '../utils/embeds';
import { createLogger } from '../utils/logger';
import { validateTag } from '../utils/tagValidation';
import { Command } from '../utils/types';

const logger = createLogger('ProgressCommand');

function formatDelta(current: number, previous: number | undefined): string {
  if (previous === undefined) return `${current}`;
  const delta = current - previous;
  if (delta > 0) return `${current} (▲ +${delta})`;
  if (delta < 0) return `${current} (▼ ${delta})`;
  return `${current} (–)`;
}

function buildProgressEmbed(player: Player, previous: PlayerSnapshot | null) {
  const embed = baseEmbed(`📈 ${player.name}'s Progress`).setDescription(`\`${player.tag}\``);

  embed.addFields(
    { name: '🏛️ Town Hall', value: formatDelta(player.townHallLevel, previous?.townHallLevel), inline: true },
    { name: '⭐ XP Level', value: formatDelta(player.expLevel, previous?.expLevel), inline: true },
    { name: '🏆 Trophies', value: formatDelta(player.trophies, previous?.trophies), inline: true },
    {
      name: '📈 Best Trophies',
      value: formatDelta(player.bestTrophies, previous?.bestTrophies),
      inline: true,
    },
    { name: '⚔️ War Stars', value: formatDelta(player.warStars, previous?.warStars), inline: true },
    { name: '🗡️ Attack Wins', value: formatDelta(player.attackWins, previous?.attackWins), inline: true },
    {
      name: '🛡️ Defense Wins',
      value: formatDelta(player.defenseWins, previous?.defenseWins),
      inline: true,
    },
    { name: '🎁 Donations', value: formatDelta(player.donations, previous?.donations), inline: true },
    {
      name: '📥 Donations Received',
      value: formatDelta(player.donationsReceived, previous?.donationsReceived),
      inline: true,
    },
  );

  if (previous) {
    embed.addFields({
      name: 'Compared to',
      value: fullTimestamp(previous.capturedAt),
      inline: false,
    });
  } else {
    embed.addFields({
      name: 'ℹ️ First Check-in',
      value: 'This is your first `/progress` check for this account — deltas will show next time.',
      inline: false,
    });
  }

  return embed;
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('progress')
    .setDescription('Track a player\'s progress since your last check.')
    .addStringOption((option) =>
      option
        .setName('player_tag')
        .setDescription('The player\'s tag (defaults to your primary linked account)')
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const rawTag = interaction.options.getString('player_tag', false);
    let tag: string;

    if (rawTag) {
      const validation = validateTag(rawTag);
      if (!validation.valid) {
        await interaction.reply({ embeds: [errorEmbed(validation.error ?? 'Invalid tag.')] });
        return;
      }
      tag = validation.normalizedTag;
    } else {
      const primary = accountsRepository.getPrimaryAccount(interaction.user.id);
      if (!primary) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              'Provide a `player_tag`, or link an account first with `/link` to track it by default.',
            ),
          ],
        });
        return;
      }
      tag = primary.playerTag;
    }

    await interaction.deferReply();

    try {
      const player = await getPlayer(tag);
      const previous = snapshotsRepository.getLatestSnapshot(interaction.user.id, tag);
      snapshotsRepository.saveSnapshot(interaction.user.id, tag, player);
      await interaction.editReply({ embeds: [buildProgressEmbed(player, previous)] });
    } catch (error) {
      logger.error(`Failed to fetch progress for tag "${tag}":`, error);
      await interaction.editReply({ embeds: [errorEmbed(resolveClashErrorMessage(error, 'player'))] });
    }
  },
};

export default command;
