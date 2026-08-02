import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getPlayer } from '../services/clash.service';
import { Player } from '../services/clash.types';
import { resolveClashErrorMessage } from './clashErrors';
import { errorEmbed } from './embeds';
import { createLogger } from './logger';
import { validateTag } from './tagValidation';
import { Command } from './types';

interface SimplePlayerCommandOptions {
  name: string;
  description: string;
  optionDescription?: string;
  buildEmbed: (player: Player) => EmbedBuilder;
}

/**
 * Builds a slash command that takes a single required `player_tag` option,
 * validates and resolves it via the Clash of Clans API, and renders an
 * embed built by `buildEmbed`. Shared by /heroes, /troops, /spells, /pets,
 * and /stats to avoid duplicating the validate -> fetch -> render -> error
 * handling flow five times over.
 */
export function createSimplePlayerCommand(options: SimplePlayerCommandOptions): Command {
  const logger = createLogger(`${options.name[0].toUpperCase()}${options.name.slice(1)}Command`);

  return {
    data: new SlashCommandBuilder()
      .setName(options.name)
      .setDescription(options.description)
      .addStringOption((option) =>
        option
          .setName('player_tag')
          .setDescription(options.optionDescription ?? "The player's tag, e.g. #ABC123XY")
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
        await interaction.editReply({ embeds: [options.buildEmbed(player)] });
      } catch (error) {
        logger.error(`Failed to fetch player for tag "${validation.normalizedTag}":`, error);
        await interaction.editReply({
          embeds: [errorEmbed(resolveClashErrorMessage(error, 'player'))],
        });
      }
    },
  };
}
