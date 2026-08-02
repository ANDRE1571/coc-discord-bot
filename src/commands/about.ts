import fs from 'fs';
import path from 'path';
import { ChatInputCommandInteraction, SlashCommandBuilder, version as djsVersion } from 'discord.js';
import { baseEmbed } from '../utils/embeds';
import { formatDuration } from '../utils/time';
import { Command } from '../utils/types';

interface PackageMetadata {
  version: string;
  description?: string;
}

function readPackageMetadata(): PackageMetadata {
  try {
    const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
    const raw = fs.readFileSync(packageJsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as PackageMetadata;
    return { version: parsed.version ?? 'unknown', description: parsed.description };
  } catch {
    return { version: 'unknown' };
  }
}

const command: Command = {
  data: new SlashCommandBuilder().setName('about').setDescription('Show information about this bot.'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const metadata = readPackageMetadata();
    const wsLatency = Math.round(interaction.client.ws.ping);
    const uptimeMs = interaction.client.uptime ?? 0;

    const embed = baseEmbed('🤖 CoC Discord Bot')
      .setDescription(
        metadata.description ??
          'A Clash of Clans companion bot for player lookups, linked accounts, and reminders.',
      )
      .addFields(
        { name: 'Version', value: metadata.version, inline: true },
        { name: 'Node.js', value: process.version, inline: true },
        { name: 'discord.js', value: `v${djsVersion}`, inline: true },
        { name: 'Websocket Latency', value: `${wsLatency}ms`, inline: true },
        { name: 'Uptime', value: formatDuration(uptimeMs), inline: true },
        { name: 'Guilds', value: `${interaction.client.guilds.cache.size}`, inline: true },
        {
          name: 'Data Source',
          value: 'Official [Clash of Clans API](https://developer.clashofclans.com)',
          inline: false,
        },
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
