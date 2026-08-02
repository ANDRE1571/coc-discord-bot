import { createSimplePlayerCommand } from '../utils/simplePlayerCommand';
import { buildHeroesEmbed } from '../utils/playerEmbeds';

export default createSimplePlayerCommand({
  name: 'heroes',
  description: "View a player's hero levels.",
  buildEmbed: buildHeroesEmbed,
});
