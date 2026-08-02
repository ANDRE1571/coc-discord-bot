import { createSimplePlayerCommand } from '../utils/simplePlayerCommand';
import { buildPetsEmbed } from '../utils/playerEmbeds';

export default createSimplePlayerCommand({
  name: 'pets',
  description: "View a player's hero pet levels.",
  buildEmbed: buildPetsEmbed,
});
