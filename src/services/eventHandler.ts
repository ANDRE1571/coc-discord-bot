import path from 'path';
import { ClientEvents } from 'discord.js';
import { createLogger } from '../utils/logger';
import { getModuleFiles } from '../utils/fileLoader';
import { BotEvent, ExtendedClient } from '../utils/types';

const logger = createLogger('EventHandler');

function isBotEvent(candidate: unknown): candidate is BotEvent<keyof ClientEvents> {
  if (typeof candidate !== 'object' || candidate === null) return false;
  const maybe = candidate as Partial<BotEvent<keyof ClientEvents>>;
  return typeof maybe.execute === 'function' && typeof maybe.name === 'string';
}

/**
 * Loads all event modules from src/events and binds them to the client.
 * Each event file must default-export an object conforming to the
 * BotEvent interface.
 */
export async function loadEvents(client: ExtendedClient): Promise<void> {
  const eventsDir = path.join(__dirname, '..', 'events');
  const eventFiles = getModuleFiles(eventsDir);

  let loadedCount = 0;

  for (const filePath of eventFiles) {
    try {
      const imported = await import(filePath);
      const event: unknown = imported.default ?? imported;

      if (!isBotEvent(event)) {
        logger.warn(`Skipped invalid event module: ${filePath}`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => void event.execute(...args));
      } else {
        client.on(event.name, (...args) => void event.execute(...args));
      }

      loadedCount += 1;
      logger.debug(`Loaded event: ${event.name}`);
    } catch (error) {
      logger.error(`Failed to load event file: ${filePath}`, error);
    }
  }

  logger.info(`Loaded ${loadedCount} event(s).`);
}
