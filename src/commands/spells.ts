import { createSimplePlayerCommand } from '../utils/simplePlayerCommand';
import { buildSpellsEmbed } from '../utils/playerEmbeds';

export default createSimplePlayerCommand({
  name: 'spells',
  description: "View a player's spell levels.",
  buildEmbed: buildSpellsEmbed,
});
