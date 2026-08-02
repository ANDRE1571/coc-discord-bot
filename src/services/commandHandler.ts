import path from 'path';
import { Collection } from 'discord.js';
import { createLogger } from '../utils/logger';
import { getModuleFiles } from '../utils/fileLoader';
import { Command, ExtendedClient } from '../utils/types';

const logger = createLogger('CommandHandler');

function isCommand(candidate: unknown): candidate is Command {
  if (typeof candidate !== 'object' || candidate === null) return false;
  const maybe = candidate as Partial<Command>;
  return typeof maybe.execute === 'function' && typeof maybe.data === 'object';
}

/**
 * Loads all command modules from src/commands into the client's command
 * collection. Each command file must default-export an object conforming
 * to the Command interface.
 */
export async function loadCommands(client: ExtendedClient): Promise<void> {
  const commandsDir = path.join(__dirname, '..', 'commands');
  const commandFiles = getModuleFiles(commandsDir);

  client.commands = new Collection<string, Command>();

  for (const filePath of commandFiles) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const imported = await import(filePath);
      const command: unknown = imported.default ?? imported;

      if (!isCommand(command)) {
        logger.warn(`Skipped invalid command module: ${filePath}`);
        continue;
      }

      client.commands.set(command.data.name, command);
      logger.debug(`Loaded command: ${command.data.name}`);
    } catch (error) {
      logger.error(`Failed to load command file: ${filePath}`, error);
    }
  }

  logger.info(`Loaded ${client.commands.size} command(s).`);
}
