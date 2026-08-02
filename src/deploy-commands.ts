import { REST, Routes } from 'discord.js';
import path from 'path';
import { config } from './config/env';
import { createLogger } from './utils/logger';
import { getModuleFiles } from './utils/fileLoader';
import { Command } from './utils/types';

const logger = createLogger('DeployCommands');

function isCommand(candidate: unknown): candidate is Command {
  if (typeof candidate !== 'object' || candidate === null) return false;
  const maybe = candidate as Partial<Command>;
  return typeof maybe.execute === 'function' && typeof maybe.data === 'object';
}

async function collectCommandPayloads(): Promise<ReturnType<Command['data']['toJSON']>[]> {
  const commandsDir = path.join(__dirname, 'commands');
  const commandFiles = getModuleFiles(commandsDir);
  const payloads: ReturnType<Command['data']['toJSON']>[] = [];

  for (const filePath of commandFiles) {
    const imported = await import(filePath);
    const command: unknown = imported.default ?? imported;

    if (!isCommand(command)) {
      logger.warn(`Skipped invalid command module during registration: ${filePath}`);
      continue;
    }

    payloads.push(command.data.toJSON());
  }

  return payloads;
}

async function main(): Promise<void> {
  const commandPayloads = await collectCommandPayloads();
  const rest = new REST().setToken(config.discordToken);

  logger.info(`Registering ${commandPayloads.length} slash command(s)...`);

  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);

  await rest.put(route, { body: commandPayloads });

  logger.info(
    config.guildId
      ? `Successfully registered commands to guild ${config.guildId}.`
      : 'Successfully registered global commands (may take up to 1 hour to propagate).',
  );
}

main().catch((error) => {
  logger.error('Failed to register slash commands:', error);
  process.exit(1);
});
