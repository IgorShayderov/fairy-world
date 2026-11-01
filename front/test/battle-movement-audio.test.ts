import { describe, expect, it } from 'vitest';

import { battleMonsterModel, hasGroundedFootsteps, monsterModels } from '../src/modules/Game/battleMonsterModels';

describe('battle movement audio', () => {
  it.each(['harpy', 'wraith', 'dragon', 'ghost', 'unknown-flying-model'])(
    'does not play ground footsteps for %s',
    (model) => expect(hasGroundedFootsteps(model)).toBe(false)
  );

  it.each(['solus-knight', 'wolf', 'bone-knight', 'goblin', 'minotaur', 'golem', 'golem-ice', 'chimera', 'hag', 'bog-lurker'])(
    'preserves footsteps for grounded %s',
    (model) => expect(hasGroundedFootsteps(model)).toBe(true)
  );

  it('covers every flying/floating encounter, minion and boss variant by its actual rig', () => {
    for (const [type, model] of Object.entries(monsterModels)) {
      if (!['harpy', 'wraith', 'dragon'].includes(model.file)) continue;
      expect(hasGroundedFootsteps(battleMonsterModel(type, `Cursed ${type}`).file), type).toBe(false);
    }
    expect(hasGroundedFootsteps(battleMonsterModel('', 'Savage Storm Harpy').file)).toBe(false);
    expect(hasGroundedFootsteps(battleMonsterModel('The Raven Lich').file)).toBe(false);
    expect(hasGroundedFootsteps(battleMonsterModel('Icebound Sovereign').file)).toBe(true);
  });
});
