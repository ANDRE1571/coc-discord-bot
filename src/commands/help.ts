import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { baseEmbed } from '../utils/embeds';
import { Command, ExtendedClient } from '../utils/types';

const CATEGORY_ORDER = ['Player Lookup', 'Accounts', 'Utilities', 'General'] as const;
type Category = (typeof CATEGORY_ORDER)[number];

const CATEGORY_BY_COMMAND: Record<string, Category> = {
  profile: 'Player Lookup',
  heroes: 'Player Lookup',
  troops: 'Player Lookup',
  spells: 'Player Lookup',
  pets: 'Player Lookup',
  stats: 'Player Lookup',
  progress: 'Player Lookup',
  link: 'Accounts',
  unlink: 'Accounts',
  accounts: 'Accounts',
  switch: 'Accounts',
  me: 'Accounts',
  favorite: 'Accounts',
  reminder: 'Utilities',
  today: 'Utilities',
  ping: 'General',
  help: 'General',
  about: 'General',
};

function categorize(commands: Command[]): Map<Category, Command[]> {
  const grouped = new Map<Category, Command[]>();

  for (const command of commands) {
    const category = CATEGORY_BY_COMMAND[command.data.name] ?? 'General';
    const bucket = grouped.get(category) ?? [];
    bucket.push(command);
    grouped.set(category, bucket);
  }

  for (const bucket of grouped.values()) {
    bucket.sort((a, b) => a.data.name.localeCompare(b.data.name));
  }

  return grouped;
}

const command: Command = {
  data: new SlashCommandBuilder().setName('help').setDescription('List every available command.'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const client = interaction.client as ExtendedClient;
    const commands = Array.from(client.commands.values());
    const grouped = categorize(commands);

    const embed = baseEmbed('📖 CoC Discord Bot — Commands').setDescription(
      'Here is everything I can do. Options marked with `*` are required.',
    );

    for (const category of CATEGORY_ORDER) {
      const bucket = grouped.get(category);
      if (!bucket || bucket.length === 0) continue;

      const lines = bucket.map((cmd) => `**/${cmd.data.name}** — ${cmd.data.description}`);
      embed.addFields({ name: category, value: lines.join('\n'), inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
