import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import * as remindersRepository from '../database/repositories/remindersRepository';
import { baseEmbed, errorEmbed, relativeTimestamp, successEmbed } from '../utils/embeds';
import { parseDuration } from '../utils/time';
import { Command } from '../utils/types';

const MAX_MESSAGE_LENGTH = 200;

async function handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
  const message = interaction.options.getString('message', true);
  const durationRaw = interaction.options.getString('in', true);

  const parsed = parseDuration(durationRaw);
  if (!parsed.valid) {
    await interaction.reply({ embeds: [errorEmbed(parsed.error ?? 'Invalid duration.')] });
    return;
  }

  const remindAt = Date.now() + parsed.milliseconds;

  const reminder = remindersRepository.createReminder({
    discordUserId: interaction.user.id,
    channelId: interaction.channelId,
    guildId: interaction.guildId,
    message,
    remindAt,
  });

  await interaction.reply({
    embeds: [
      successEmbed(
        '⏰ Reminder Set',
        `I'll remind you here ${relativeTimestamp(remindAt)}:\n> ${reminder.message}`,
      ).setFooter({ text: `Reminder #${reminder.id}` }),
    ],
  });
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  const reminders = remindersRepository.listUpcomingRemindersForUser(interaction.user.id);

  if (reminders.length === 0) {
    await interaction.reply({
      embeds: [errorEmbed("You don't have any upcoming reminders. Create one with `/reminder create`.")],
    });
    return;
  }

  const lines = reminders.map(
    (reminder) => `**#${reminder.id}** ${relativeTimestamp(reminder.remindAt)} — ${reminder.message}`,
  );

  const embed = baseEmbed('⏰ Your Upcoming Reminders').setDescription(lines.join('\n'));
  await interaction.reply({ embeds: [embed] });
}

async function handleCancel(interaction: ChatInputCommandInteraction): Promise<void> {
  const reminderId = interaction.options.getInteger('reminder_id', true);
  const cancelled = remindersRepository.cancelReminder(interaction.user.id, reminderId);

  if (!cancelled) {
    await interaction.reply({
      embeds: [errorEmbed(`No upcoming reminder #${reminderId} found for you.`)],
    });
    return;
  }

  await interaction.reply({
    embeds: [successEmbed('✅ Reminder Cancelled', `Reminder #${reminderId} has been cancelled.`)],
  });
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Create, list, or cancel reminders.')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a new reminder.')
        .addStringOption((option) =>
          option
            .setName('message')
            .setDescription('What should I remind you about?')
            .setMaxLength(MAX_MESSAGE_LENGTH)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('in')
            .setDescription('When, e.g. 30m, 2h, 1d12h, or a plain number of minutes')
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List your upcoming reminders.'))
    .addSubcommand((sub) =>
      sub
        .setName('cancel')
        .setDescription('Cancel one of your upcoming reminders.')
        .addIntegerOption((option) =>
          option
            .setName('reminder_id')
            .setDescription('The reminder ID shown in `/reminder list`')
            .setRequired(true),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommand) {
      case 'create':
        await handleCreate(interaction);
        return;
      case 'list':
        await handleList(interaction);
        return;
      case 'cancel':
        await handleCancel(interaction);
        return;
      default:
        await interaction.reply({ embeds: [errorEmbed('Unknown subcommand.')] });
    }
  },
};

export default command;
