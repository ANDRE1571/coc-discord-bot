import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { Command, ExtendedClient } from '../utils/types';

/**
 * Creates the Discord.js client with the gateway intents required by this
 * bot. Only ping/slash-command functionality is needed right now, so we
 * keep the intent list minimal; extend it here as new features are added.
 */
export function createClient(): ExtendedClient {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  }) as ExtendedClient;

  client.commands = new Collection<string, Command>();

  return client;
}
