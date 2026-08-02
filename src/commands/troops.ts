import { createSimplePlayerCommand } from '../utils/simplePlayerCommand';
import { buildTroopsEmbed } from '../utils/playerEmbeds';

export default createSimplePlayerCommand({
  name: 'troops',
  description: "View a player's troop levels.",
  buildEmbed: buildTroopsEmbed,
});
