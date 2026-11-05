import { BadRequestException } from '@nestjs/common';
import {
  SKILLS,
  skillBaseManaCost,
  skillDamageMultiplier,
  type SkillDefinition,
  type SkillEffect,
} from './skills.catalog';
import type { UserView } from '../users/user.view';
import { magicSkillManaCost } from '../items/mage-equipment';
import { applyRangerStatus, type CombatStatuses } from './combat-status';
import { skillDescription } from './skill-presentation';

export type DungeonSkillState = {
  class: string | null;
  ranks: Record<string, number>;
  mana: number;
  maxMana: number;
  spellPower: number;
  manaCostReduction?: number;
  loadedRangedWeapon: boolean;
  turn: number;
  readyOnTurn: Record<string, number>;
};
type Fighter = {
  health: number;
  maxHealth: number;
  damage: number;
  defense: number;
  criticalChance?: number;
  statuses?: CombatStatuses;
};
export type SkillEventFields = {
  action?: 'SKILL' | 'MOVE' | 'DEFEND' | 'ATTACK';
  skillId?: string;
  skillName?: string;
  effect?: SkillEffect;
  healing?: number;
  statusText?: string;
};
type Event = SkillEventFields & {
  actor: 'PLAYER' | 'MONSTER';
  damage: number;
  critical: boolean;
  dodged: boolean;
  blocked?: boolean;
  actorName?: string;
  targetName?: string;
};

export function dungeonSkillSnapshot(player: ReturnType<typeof UserView.renderCurrent>): DungeonSkillState {
  const mana = player.properties.find(({ name }) => name === 'MANA')?.value ?? 0;
  return {
    class: player.skills?.class ?? null,
    ranks: { ...player.skills?.ranks },
    mana,
    maxMana: mana,
    spellPower: player.spellPower ?? 10,
    manaCostReduction: player.manaCostReduction ?? 0,
    loadedRangedWeapon: player.attackRange > 1 && !player.missingAmmunition,
    turn: 1,
    readyOnTurn: {},
  };
}

function unavailable(state: DungeonSkillState, skill: SkillDefinition | undefined, fighter: Fighter): string | null {
  if (!skill?.effect || state.class !== skill.class || !state.ranks[skill.id]) return 'Skill has not been learned';
  if (fighter.health <= 0) return 'You have no Health and cannot attack';
  if ((state.readyOnTurn[skill.id] ?? 0) > state.turn) return 'Skill is on cooldown';
  if (
    state.mana <
    magicSkillManaCost(skillBaseManaCost(skill, state.ranks[skill.id]), skill.class, state.manaCostReduction ?? 0)
  )
    return 'Not enough mana';
  if (skill.class === 'SCOUT' && !state.loadedRangedWeapon) return 'Equip a bow or crossbow and matching ammunition';
  if (skill.effect === 'heal' && fighter.health >= fighter.maxHealth) return 'Health is already full';
  return null;
}

export function dungeonSkillView(state: DungeonSkillState | undefined, fighter: Fighter) {
  if (!state) return undefined;
  return {
    mana: state.mana,
    maxMana: state.maxMana,
    abilities: SKILLS.filter((skill) => skill.effect && skill.class === state.class && state.ranks[skill.id] > 0).map(
      (skill) => ({
        ...skill,
        description: skillDescription(skill, state.ranks[skill.id]),
        manaCost: magicSkillManaCost(
          skillBaseManaCost(skill, state.ranks[skill.id]),
          skill.class,
          state.manaCostReduction ?? 0,
        ),
        rank: state.ranks[skill.id],
        remainingCooldown: Math.max(0, (state.readyOnTurn[skill.id] ?? 0) - state.turn),
        unavailable: unavailable(state, skill, fighter),
      }),
    ),
  };
}

/** Uses the same one-action exchange as a normal dungeon attack; no extra free turn. */
export function castDungeonSkill<T extends Fighter>(
  state: DungeonSkillState | undefined,
  skillId: string,
  attacker: T,
  target: T,
  events: Event[],
  strike: (attacker: T, target: T, ignoresDefense: boolean) => void,
  actorName: string,
) {
  const skill = SKILLS.find((entry) => entry.id === skillId);
  if (!state) throw new BadRequestException('Skill has not been learned');
  const error = unavailable(state, skill, attacker);
  if (error || !skill) throw new BadRequestException(error ?? 'Unknown skill');
  const rank = state.ranks[skill.id];
  state.mana -= magicSkillManaCost(skillBaseManaCost(skill, rank), skill.class, state.manaCostReduction ?? 0);
  state.readyOnTurn[skill.id] = state.turn + (skill.cooldown ?? 0) + 1;
  if (skill.effect === 'heal') {
    const healing = Math.min(
      attacker.maxHealth - attacker.health,
      Math.round(attacker.maxHealth * (0.15 + (rank - 1) * 0.01)),
    );
    attacker.health += healing;
    events.push({ actor: 'PLAYER', actorName, damage: 0, critical: false, dodged: false, healing });
  } else {
    strike(
      {
        ...attacker,
        criticalChance: skill.canCrit ? (attacker.criticalChance ?? 0) : 0,
        damage: (skill.class === 'MAGE' ? state.spellPower : attacker.damage) * skillDamageMultiplier(skill, rank),
      },
      target,
      skill.class === 'MAGE',
    );
  }
  Object.assign(events[events.length - 1], { action: 'SKILL', skillId, skillName: skill.name, effect: skill.effect });
  if (skill.class === 'SCOUT') applyRangerStatus(target, skill.id, rank, events[events.length - 1]);
}

export function finishDungeonSkillTurn(state: DungeonSkillState | undefined) {
  if (!state) return;
  state.turn++;
  state.mana = Math.min(state.maxMana, state.mana + 3);
}
