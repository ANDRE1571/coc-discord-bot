import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import * as accountsRepository from '../database/repositories/accountsRepository';
import { errorEmbed, successEmbed } from '../utils/embeds';
import { validateTag } from '../utils/tagValidation';
import { Command } from '../utils/types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('favorite')
    .setDescription('Toggle the favorite bookmark on one of your linked accounts.')
    .addStringOption((option) =>
      option
        .setName('player_tag')
        .setDescription('The tag of one of your linked accounts')
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const rawTag = interaction.options.getString('player_tag', true);
    const validation = validateTag(rawTag);

    if (!validation.valid) {
      await interaction.reply({ embeds: [errorEmbed(validation.error ?? 'Invalid tag.')] });
      return;
    }

    const account = accountsRepository.findAccount(interaction.user.id, validation.normalizedTag);
    if (!account) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            `You don't have \`${validation.normalizedTag}\` linked. Use \`/link\` to add it first.`,
          ),
        ],
      });
      return;
    }

    const nextState = !account.isFavorite;
    accountsRepository.setFavorite(interaction.user.id, validation.normalizedTag, nextState);

    const label = account.nickname ?? validation.normalizedTag;
    await interaction.reply({
      embeds: [
        successEmbed(
          nextState ? '💛 Added to Favorites' : '☑️ Removed from Favorites',
          nextState
            ? `**${label}** is now marked as a favorite.`
            : `**${label}** is no longer marked as a favorite.`,
        ),
      ],
    });
  },
};

export default command;
