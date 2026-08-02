import { config } from './config/env';
import { closeDatabase, migrate } from './database/db';
import { createClient } from './services/client';
import { loadCommands } from './services/commandHandler';
import { loadEvents } from './services/eventHandler';
import { startReminderScheduler } from './services/reminderScheduler';
import { createLogger } from './utils/logger';
import { ExtendedClient } from './utils/types';

const logger = createLogger('Bootstrap');

let reminderInterval: NodeJS.Timeout | undefined;
let activeClient: ExtendedClient | undefined;
let shuttingDown = false;

async function bootstrap(): Promise<void> {
  migrate();

  const client = createClient();
  activeClient = client;

  await loadCommands(client);
  await loadEvents(client);

  client.once('ready', () => {
    reminderInterval = startReminderScheduler(client);
  });

  await client.login(config.discordToken);
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`Received ${signal}, shutting down gracefully...`);

  if (reminderInterval) {
    clearInterval(reminderInterval);
  }

  if (activeClient) {
    activeClient.destroy();
  }

  closeDatabase();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

bootstrap().catch((error) => {
  logger.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
