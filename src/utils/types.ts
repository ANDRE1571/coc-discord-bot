import {
  ChatInputCommandInteraction,
  Client,
  ClientEvents,
  Collection,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

export type SlashCommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

export interface Command {
  data: SlashCommandData;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface BotEvent<TEvent extends keyof ClientEvents = keyof ClientEvents> {
  name: TEvent;
  once?: boolean;
  execute: (...args: ClientEvents[TEvent]) => Promise<void> | void;
}

export interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
}
