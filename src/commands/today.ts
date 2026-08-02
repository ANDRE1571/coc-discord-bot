import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import * as accountsRepository from '../database/repositories/accountsRepository';
import * as remindersRepository from '../database/repositories/remindersRepository';
import { ClashApiError, getCurrentWar, getPlayer } from '../services/clash.service';
import { CurrentWar } from '../services/clash.types';
import { baseEmbed, relativeTimestamp } from '../utils/embeds';
import { createLogger } from '../utils/logger';
import { parseCocTimestamp } from '../utils/time';
import { Command } from '../utils/types';

const logger = createLogger('TodayCommand');
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function formatWarStatus(war: CurrentWar): string {
  if (war.state === 'notInWar') {
    return 'Not currently in a war.';
  }

  const opponentName = war.opponent.name ?? 'Unknown opponent';
  const scoreLine = `${war.clan.stars ?? 0}⭐ (${war.clan.destructionPercentage ?? 0}%) vs ` +
    `${war.opponent.stars ?? 0}⭐ (${war.opponent.destructionPercentage ?? 0}%)`;

  if (war.state === 'preparation') {
    const startTime = parseCocTimestamp(war.startTime);
    const startsNote = startTime ? ` Battle day starts ${relativeTimestamp(startTime.getTime())}.` : '';
    return `⚔️ **Preparation day** vs **${opponentName}**.${startsNote}`;
  }

  if (war.state === 'inWar') {
    const endTime = parseCocTimestamp(war.endTime);
    const endsNote = endTime ? ` Ends ${relativeTimestamp(endTime.getTime())}.` : '';
    return `⚔️ **Battle day** vs **${opponentName}** — ${scoreLine}.${endsNote}`;
  }

  return `🏁 **War ended** vs **${opponentName}** — ${scoreLine}.`;
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('today')
    .setDescription("Your daily brief: clan war status and today's reminders."),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const embed = baseEmbed(`📅 Today's Brief`);
    const primary = accountsRepository.getPrimaryAccount(interaction.user.id);

    if (primary) {
      try {
        const player = await getPlayer(primary.playerTag);
        const playerLabel = primary.nickname ?? player.name;

        if (player.clan) {
          embed.addFields({
            name: `👤 ${playerLabel}`,
            value: `TH${player.townHallLevel} · ${player.trophies}🏆 · Clan: **${player.clan.name}**`,
            inline: false,
          });

          try {
            const war = await getCurrentWar(player.clan.tag);
            embed.addFields({ name: '⚔️ War Status', value: formatWarStatus(war), inline: false });
          } catch (warError) {
            if (warError instanceof ClashApiError && warError.statusCode === 403) {
              embed.addFields({
                name: '⚔️ War Status',
                value: "This clan's war log is private.",
                inline: false,
              });
            } else {
              logger.warn(`Failed to fetch current war for clan ${player.clan.tag}:`, warError);
              embed.addFields({
                name: '⚔️ War Status',
                value: 'Unable to fetch war status right now.',
                inline: false,
              });
            }
          }
        } else {
          embed.addFields({
            name: `👤 ${playerLabel}`,
            value: `TH${player.townHallLevel} · ${player.trophies}🏆 · Not currently in a clan.`,
            inline: false,
          });
        }
      } catch (playerError) {
        logger.warn(`Failed to fetch primary account ${primary.playerTag}:`, playerError);
        embed.addFields({
          name: '👤 Account',
          value: 'Unable to fetch your linked account right now.',
          inline: false,
        });
      }
    } else {
      embed.addFields({
        name: '👤 Account',
        value: 'No linked account — use `/link` to see your clan and war status here.',
        inline: false,
      });
    }

    const upcomingToday = remindersRepository.listRemindersDueSoonForUser(
      interaction.user.id,
      Date.now() + ONE_DAY_MS,
    );

    embed.addFields({
      name: '⏰ Reminders (next 24h)',
      value:
        upcomingToday.length === 0
          ? 'None — use `/reminder create` to set one.'
          : upcomingToday
              .map((r) => `**#${r.id}** ${relativeTimestamp(r.remindAt)} — ${r.message}`)
              .join('\n'),
      inline: false,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
