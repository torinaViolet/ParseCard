import { CharacterCard, type CharacterCardData } from 'parsecard';
import { loadCharacterCard, type SaveOptions } from 'parsecard/node';

const data: Partial<CharacterCardData> = { name: 'exports-check' };
const options: SaveOptions = {};

void CharacterCard.create(data);
void loadCharacterCard;
void options;
