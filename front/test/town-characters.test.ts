import { describe, expect, it } from 'vitest';
import { characterFor, services, towns } from '../src/modules/Towns/characters';
describe('town service characters', () => {
  it('gives every town and service a distinct person and portrait', () => {
    const cast = towns.flatMap(town => services.map(service => characterFor(service, town.name)));
    expect(new Set(cast.map(character => character.name)).size).toBe(28);
    expect(new Set(cast.map(character => `${character.row}:${character.column}`)).size).toBe(28);
  });
  it('uses the current location and honors the quest town name', () => {
    expect(characterFor('market', undefined, { x: 2060, y: 690 }).town).toBe('Moonfall');
    expect(characterFor('quests', 'MOSSKEEP', { x: 2060, y: 690 }).town).toBe('Mosskeep');
    expect(characterFor('blacksmith', undefined, { x: 1490, y: 740 }).name).toBe('Hilda Ember');
  });
});
