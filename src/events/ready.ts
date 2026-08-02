import { Client } from 'discord.js';
import { createLogger } from '../utils/logger';
import { BotEvent } from '../utils/types';

const logger = createLogger('ReadyEvent');

const event: BotEvent<'ready'> = {
  name: 'ready',
  once: true,
  execute(client: Client<true>): void {
    logger.info(`Logged in as ${client.user.tag} (${client.user.id}).`);
    logger.info(`Serving ${client.guilds.cache.size} guild(s).`);
  },
};

export default event;
