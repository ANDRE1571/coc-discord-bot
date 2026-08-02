import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import * as accountsRepository from '../database/repositories/accountsRepository';
import { errorEmbed, successEmbed } from '../utils/embeds';
import { validateTag } from '../utils/tagValidation';
import { Command } from '../utils/types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Unlink a previously linked Clash of Clans account.')
    .addStringOption((option) =>
      option
        .setName('player_tag')
        .setDescription("The linked account's tag, e.g. #ABC123XY")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const rawTag = interaction.options.getString('player_tag', true);
    const validation = validateTag(rawTag);

    if (!validation.valid) {
      await interaction.reply({ embeds: [errorEmbed(validation.error ?? 'Invalid tag.')] });
      return;
    }

    const existing = accountsRepository.findAccount(interaction.user.id, validation.normalizedTag);
    if (!existing) {
      await interaction.reply({
        embeds: [errorEmbed(`You don't have \`${validation.normalizedTag}\` linked.`)],
      });
      return;
    }

    accountsRepository.unlinkAccount(interaction.user.id, validation.normalizedTag);

    const remaining = accountsRepository.listAccounts(interaction.user.id);
    const newPrimaryNote =
      existing.isPrimary && remaining.length > 0
        ? `\n⭐ **${remaining[0].nickname ?? remaining[0].playerTag}** is now your primary account.`
        : '';

    await interaction.reply({
      embeds: [
        successEmbed(
          '✅ Account Unlinked',
          `Unlinked \`${validation.normalizedTag}\`.${newPrimaryNote}`,
        ),
      ],
    });
  },
};

export default command;
