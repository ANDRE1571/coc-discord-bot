import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import * as accountsRepository from '../database/repositories/accountsRepository';
import { LinkedAccount } from '../database/repositories/accountsRepository';
import { getPlayer } from '../services/clash.service';
import { Player } from '../services/clash.types';
import { baseEmbed, errorEmbed } from '../utils/embeds';
import { createLogger } from '../utils/logger';
import { Command } from '../utils/types';

const logger = createLogger('AccountsCommand');

function formatAccountLine(account: LinkedAccount, player: Player | null): string {
  const badges = [account.isPrimary ? '⭐' : null, account.isFavorite ? '💛' : null]
    .filter(Boolean)
    .join(' ');
  const prefix = badges ? `${badges} ` : '';
  const label = account.nickname ?? account.playerTag;

  if (!player) {
    return `${prefix}**${label}** (\`${account.playerTag}\`) — _live data unavailable_`;
  }

  return (
    `${prefix}**${player.name}** (\`${account.playerTag}\`) — ` +
    `TH${player.townHallLevel} · ${player.trophies}🏆 · ${player.league?.name ?? 'Unranked'}`
  );
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('accounts')
    .setDescription('List all of your linked Clash of Clans accounts.'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const accounts = accountsRepository.listAccounts(interaction.user.id);

    if (accounts.length === 0) {
      await interaction.reply({
        embeds: [errorEmbed("You haven't linked any accounts yet. Use `/link` to add one.")],
      });
      return;
    }

    await interaction.deferReply();

    const results = await Promise.allSettled(
      accounts.map((account) => getPlayer(account.playerTag)),
    );

    const lines = accounts.map((account, index) => {
      const result = results[index];
      if (result.status === 'fulfilled') {
        return formatAccountLine(account, result.value);
      }
      logger.warn(`Failed to fetch live data for ${account.playerTag}:`, result.reason);
      return formatAccountLine(account, null);
    });

    const embed = baseEmbed(`👤 ${interaction.user.username}'s Accounts`)
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: '⭐ primary · 💛 favorite' });

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
