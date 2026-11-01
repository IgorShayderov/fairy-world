import { describe, expect, it } from 'vitest';
import { dungeonAttackHint, dungeonBattle, dungeonReplay } from '../src/modules/Game/dungeonBattle';
import { battleMonsterModel } from '../src/modules/Game/battleMonsterModels';
import type { DungeonRunState } from '../src/modules/Monsters/api';

const fighter = {
  name: 'Hero',
  movement: 3,
  health: 100,
  maxHealth: 100,
  damage: 10,
  defense: 0,
  dodge: 0,
  blockChance: 0,
  criticalChance: 0,
  criticalDamage: 150,
};
const run = (): DungeonRunState => ({
  id: 'run',
  dungeon: 'EMBERDEEP',
  status: 'ACTIVE',
  startedAt: '',
  player: fighter,
  opponents: ['Flamebound Stalker', 'Warden of the First Flame'].map((name, index) => ({
    id: String(index),
    monsterType: name,
    image: '',
    isBoss: index === 1,
    status: index === 1 ? 'LOCKED' : 'AVAILABLE',
    monster: { ...fighter, name, level: 1, rewardGold: 10, rewardExperience: 10 },
  })),
  latestEvents: [],
  lastBattleResult: null,
  lastExperience: 0,
  totalExperience: 0,
  rewards: null,
  tactical: { turn: 1, revision: 0, opponentId: '0', playerPosition: 34, monsterPosition: 42, moved: false },
});

describe('dungeon battlefield adapter', () => {
  it('lets saved crossbow users attack distant waves without moving', () => {
    const state = run();
    state.player = { ...state.player, attackRange: 7 };
    state.tactical!.playerPosition = 64;
    state.tactical!.monsterPosition = 34;
    expect(dungeonBattle(state, 1).arena.canAttack).toBe(true);
    expect(dungeonAttackHint(dungeonBattle(state, 1))).toBe('Range: unlimited · Target: 9 hexes — ready to attack');
    state.tactical!.monsterPosition = 40;
    expect(dungeonBattle(state, 1).arena.canAttack).toBe(true);
    expect(dungeonAttackHint(dungeonBattle(state, 1))).toBe('Range: unlimited · Target: 3 hexes — ready to attack');
  });
  it('keeps an old in-progress fight in melee range, so Attack is enabled', () => {
    const state = run();
    delete state.tactical;
    expect(dungeonBattle(state, 1).arena).toMatchObject({ playerPosition: 40, monsterPosition: 41, canAttack: true });
  });
  it('animates newly appended legacy skill events once, without replaying history on polling', () => {
    const before = run();
    delete before.tactical;
    before.latestEvents = [{ actor: 'MONSTER', damage: 5, critical: false, dodged: false }];
    const after = structuredClone(before);
    const skill = {
      actor: 'PLAYER' as const,
      action: 'SKILL' as const,
      effect: 'fire' as const,
      skillId: 'mage-fireball',
      skillName: 'Fireball',
      damage: 20,
      critical: false,
      dodged: false,
    };
    after.latestEvents.push(skill);
    expect(dungeonReplay(after, before, 1)?.events).toEqual([skill]);
    expect(dungeonReplay(structuredClone(after), after, 1)).toBeUndefined();
  });
  it('keeps a lethal skill attached to the defeated monster for the animation', () => {
    const before = run();
    delete before.tactical;
    const after = structuredClone(before);
    after.opponents[0]!.monster.health = 0;
    after.opponents[0]!.status = 'DEFEATED';
    after.opponents[1]!.status = 'AVAILABLE';
    after.latestEvents = [
      { actor: 'PLAYER', action: 'SKILL', effect: 'volley', damage: 100, critical: false, dodged: false },
    ];
    expect(dungeonReplay(after, before, 1)).toMatchObject({
      status: 'VICTORY',
      monster: { name: 'Flamebound Stalker' },
      events: after.latestEvents,
    });
  });
  it('replays tactical skills by revision even when the rolling combat log is full', () => {
    const before = run();
    const after = structuredClone(before);
    after.tactical!.revision++;
    after.exchange = {
      opponentId: '0',
      playerPosition: 40,
      monsterPosition: 41,
      events: [{ actor: 'PLAYER', action: 'SKILL', effect: 'ice', damage: 10, critical: false, dodged: false }],
    };
    expect(dungeonReplay(after, before, 1)?.events).toEqual(after.exchange.events);
    expect(dungeonReplay(structuredClone(after), after, 1)).toBeUndefined();
  });
  it('shows reachable hexes and keeps the last strike attached to the defeated wave', () => {
    const state = run();
    const view = dungeonBattle(state, 1);
    expect(view.arena.reachableCells).toContain(37);
    expect(view.arena.reachableCells).not.toContain(38);
    expect(view.arena.canAttack).toBe(false);
    state.opponents[0]!.monster.health = 0;
    state.opponents[0]!.status = 'DEFEATED';
    state.tactical!.opponentId = '1';
    state.exchange = {
      opponentId: '0',
      events: [{ actor: 'PLAYER', damage: 10, critical: false, dodged: false }],
      playerPosition: 40,
      monsterPosition: 41,
    };
    expect(dungeonBattle(state, 1, true)).toMatchObject({
      status: 'VICTORY',
      monster: { name: 'Flamebound Stalker' },
      arena: { playerPosition: 40, monsterPosition: 41 },
    });
    expect(dungeonBattle(state, 1).monster.name).toBe('Warden of the First Flame');
    expect(dungeonBattle(state, 1).events).toEqual([]);
  });
  it('assigns four distinct rigged boss archetypes and variants', () => {
    const bosses = ['Warden of the First Flame', 'The Hollow King', 'Icebound Sovereign', 'The Raven Lich'].map(
      (name) => battleMonsterModel(name)
    );
    expect(new Set(bosses.map((boss) => boss.file)).size).toBe(4);
    expect(new Set(bosses.map((boss) => boss.boss)).size).toBe(4);
  });
});
