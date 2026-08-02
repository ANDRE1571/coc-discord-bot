import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import * as accountsRepository from '../database/repositories/accountsRepository';
import { getPlayer } from '../services/clash.service';
import { resolveClashErrorMessage } from '../utils/clashErrors';
import { errorEmbed } from '../utils/embeds';
import { createLogger } from '../utils/logger';
import { buildProfileEmbed } from '../utils/playerEmbeds';
import { Command } from '../utils/types';

const logger = createLogger('MeCommand');

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('me')
    .setDescription("Show your primary linked account's profile."),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const primary = accountsRepository.getPrimaryAccount(interaction.user.id);

    if (!primary) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            "You don't have a linked account yet. Use `/link player_tag:<tag>` to link one.",
          ),
        ],
      });
      return;
    }

    await interaction.deferReply();

    try {
      const player = await getPlayer(primary.playerTag);
      await interaction.editReply({ embeds: [buildProfileEmbed(player)] });
    } catch (error) {
      logger.error(`Failed to fetch primary account "${primary.playerTag}":`, error);
      await interaction.editReply({ embeds: [errorEmbed(resolveClashErrorMessage(error, 'player'))] });
    }
  },
};

export default command;
