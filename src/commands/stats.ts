import { createSimplePlayerCommand } from '../utils/simplePlayerCommand';
import { buildStatsEmbed } from '../utils/playerEmbeds';

export default createSimplePlayerCommand({
  name: 'stats',
  description: "View a player's detailed statistics.",
  buildEmbed: buildStatsEmbed,
});
