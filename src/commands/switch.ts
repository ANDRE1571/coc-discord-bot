import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import * as accountsRepository from '../database/repositories/accountsRepository';
import { errorEmbed, successEmbed } from '../utils/embeds';
import { validateTag } from '../utils/tagValidation';
import { Command } from '../utils/types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('switch')
    .setDescription('Switch your primary (default) linked account.')
    .addStringOption((option) =>
      option
        .setName('player_tag')
        .setDescription('The tag of one of your linked accounts to switch to')
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

    if (account.isPrimary) {
      await interaction.reply({
        embeds: [successEmbed('ℹ️ Already Primary', `\`${validation.normalizedTag}\` is already your primary account.`)],
      });
      return;
    }

    accountsRepository.setPrimaryAccount(interaction.user.id, validation.normalizedTag);

    await interaction.reply({
      embeds: [
        successEmbed(
          '✅ Primary Account Switched',
          `\`${validation.normalizedTag}\` is now your primary account. \`/me\`, \`/today\`, and \`/progress\` will use it by default.`,
        ),
      ],
    });
  },
};

export default command;
