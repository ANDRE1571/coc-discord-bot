import { Client, EmbedBuilder, TextBasedChannel } from 'discord.js';
import { config } from '../config/env';
import * as remindersRepository from '../database/repositories/remindersRepository';
import { Reminder } from '../database/repositories/remindersRepository';
import { INFO_COLOR } from '../utils/embeds';
import { createLogger } from '../utils/logger';

const logger = createLogger('ReminderScheduler');

function buildReminderEmbed(reminder: Reminder): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(INFO_COLOR)
    .setTitle('⏰ Reminder')
    .setDescription(reminder.message)
    .setFooter({ text: `Reminder #${reminder.id}` })
    .setTimestamp();
}

async function deliverReminder(client: Client, reminder: Reminder): Promise<void> {
  const embed = buildReminderEmbed(reminder);
  const mention = `<@${reminder.discordUserId}>`;

  try {
    const channel = await client.channels.fetch(reminder.channelId);
    if (channel && channel.isTextBased()) {
      await (channel as TextBasedChannel).send({ content: mention, embeds: [embed] });
      return;
    }
    throw new Error('Channel is not text-based or no longer accessible.');
  } catch (channelError) {
    logger.warn(
      `Could not deliver reminder #${reminder.id} to channel ${reminder.channelId}, falling back to DM:`,
      channelError,
    );

    try {
      const user = await client.users.fetch(reminder.discordUserId);
      await user.send({ embeds: [embed] });
    } catch (dmError) {
      logger.error(`Failed to DM reminder #${reminder.id} to user ${reminder.discordUserId}:`, dmError);
    }
  }
}

async function processDueReminders(client: Client): Promise<void> {
  const due = remindersRepository.listDueReminders(Date.now());

  for (const reminder of due) {
    // Mark sent first so a delivery failure can't cause a retry loop that spams the user.
    remindersRepository.markReminderSent(reminder.id);
    await deliverReminder(client, reminder);
  }
}

/**
 * Starts the background interval that polls for due reminders and delivers
 * them. Returns the interval handle so callers can `clearInterval` it
 * during graceful shutdown.
 */
export function startReminderScheduler(client: Client): NodeJS.Timeout {
  logger.info(`Starting reminder scheduler (interval: ${config.reminderCheckIntervalMs}ms).`);

  return setInterval(() => {
    processDueReminders(client).catch((error) => {
      logger.error('Unexpected error while processing due reminders:', error);
    });
  }, config.reminderCheckIntervalMs);
}
