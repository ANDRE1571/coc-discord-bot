import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { getPlayer } from '../services/clash.service';
import { resolveClashErrorMessage } from '../utils/clashErrors';
import { errorEmbed } from '../utils/embeds';
import { createLogger } from '../utils/logger';
import { buildProfileEmbed } from '../utils/playerEmbeds';
import { validateTag } from '../utils/tagValidation';
import { Command } from '../utils/types';

const logger = createLogger('ProfileCommand');

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription("Look up a Clash of Clans player's profile.")
    .addStringOption((option) =>
      option
        .setName('player_tag')
        .setDescription("The player's tag, e.g. #ABC123XY")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const rawTag = interaction.options.getString('player_tag', true);
    const validation = validateTag(rawTag);

    if (!validation.valid) {
      await interaction.reply({ embeds: [errorEmbed(validation.error ?? 'Invalid tag.')] });
      return;
    }

    await interaction.deferReply();

    try {
      const player = await getPlayer(validation.normalizedTag);
      await interaction.editReply({ embeds: [buildProfileEmbed(player)] });
    } catch (error) {
      logger.error(`Failed to fetch player profile for tag "${validation.normalizedTag}":`, error);
      await interaction.editReply({ embeds: [errorEmbed(resolveClashErrorMessage(error, 'player'))] });
    }
  },
};

export default command;
