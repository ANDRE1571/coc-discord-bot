import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../utils/types';

const command: Command = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong and latency info.'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sent = await interaction.reply({
      content: 'Pinging...',
      fetchReply: true,
    });

    const roundTripLatency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply(
      `🏓 Pong! Roundtrip: ${roundTripLatency}ms | Websocket: ${wsLatency}ms`,
    );
  },
};

export default command;
