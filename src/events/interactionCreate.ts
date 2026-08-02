import { Interaction, MessageFlags } from 'discord.js';
import { createLogger } from '../utils/logger';
import { BotEvent, ExtendedClient } from '../utils/types';

const logger = createLogger('InteractionCreateEvent');

const event: BotEvent<'interactionCreate'> = {
  name: 'interactionCreate',
  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const client = interaction.client as ExtendedClient;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Received unknown command: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(`Error executing command "${interaction.commandName}":`, error);

      const errorPayload = {
        content: 'There was an error while executing this command.',
        flags: MessageFlags.Ephemeral,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorPayload);
      } else {
        await interaction.reply(errorPayload);
      }
    }
  },
};

export default event;
