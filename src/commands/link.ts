import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import * as accountsRepository from '../database/repositories/accountsRepository';
import { getPlayer } from '../services/clash.service';
import { resolveClashErrorMessage } from '../utils/clashErrors';
import { errorEmbed, successEmbed } from '../utils/embeds';
import { createLogger } from '../utils/logger';
import { validateTag } from '../utils/tagValidation';
import { Command } from '../utils/types';

const logger = createLogger('LinkCommand');
const MAX_NICKNAME_LENGTH = 32;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link a Clash of Clans account to your Discord profile.')
    .addStringOption((option) =>
      option
        .setName('player_tag')
        .setDescription("The player's tag, e.g. #ABC123XY")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('nickname')
        .setDescription('An optional label for this account (defaults to the in-game name).')
        .setMaxLength(MAX_NICKNAME_LENGTH)
        .setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const rawTag = interaction.options.getString('player_tag', true);
    const nickname = interaction.options.getString('nickname', false);
    const validation = validateTag(rawTag);

    if (!validation.valid) {
      await interaction.reply({ embeds: [errorEmbed(validation.error ?? 'Invalid tag.')] });
      return;
    }

    const alreadyLinked = accountsRepository.findAccount(interaction.user.id, validation.normalizedTag);
    if (alreadyLinked) {
      await interaction.reply({
        embeds: [errorEmbed(`You've already linked \`${validation.normalizedTag}\`.`)],
      });
      return;
    }

    await interaction.deferReply();

    try {
      const player = await getPlayer(validation.normalizedTag);
      const wasFirstAccount = accountsRepository.countAccounts(interaction.user.id) === 0;

      const account = accountsRepository.linkAccount(
        interaction.user.id,
        validation.normalizedTag,
        nickname,
      );

      const label = account.nickname ?? player.name;
      const primaryNote = wasFirstAccount
        ? '\n⭐ Set as your primary account since it\'s your first linked account.'
        : '\nUse `/switch` to make this your primary account.';

      await interaction.editReply({
        embeds: [
          successEmbed(
            '✅ Account Linked',
            `Linked **${label}** (\`${player.tag}\`) — TH${player.townHallLevel}, ${player.trophies} trophies.${primaryNote}`,
          ),
        ],
      });
    } catch (error) {
      logger.error(`Failed to link account "${validation.normalizedTag}":`, error);
      await interaction.editReply({ embeds: [errorEmbed(resolveClashErrorMessage(error, 'player'))] });
    }
  },
};

export default command;
