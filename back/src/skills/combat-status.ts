export type CombatStatuses = {
  empower?: { hits: number; percent: number };
  slow?: { turns: number; reduction: number };
  armorBreak?: { hits: number; percent: number };
  petrify?: { turns: number };
};
export type StatusTarget = { statuses?: CombatStatuses; defense: number; movement?: number };

export function effectiveMovement(target: StatusTarget): number {
  if (target.statuses?.petrify?.turns) return 0;
  return Math.max(1, (target.movement ?? 2) - (target.statuses?.slow?.reduction ?? 0));
}
export function effectiveDefense(target: StatusTarget): number {
  return target.defense * (1 - (target.statuses?.armorBreak?.percent ?? 0) / 100);
}
export function consumeArmorHit(target: StatusTarget) {
  if (target.statuses?.armorBreak && --target.statuses.armorBreak.hits <= 0) delete target.statuses.armorBreak;
}
export function finishStatusTurn(target: StatusTarget) {
  if (target.statuses?.slow && --target.statuses.slow.turns <= 0) delete target.statuses.slow;
  if (target.statuses?.petrify && --target.statuses.petrify.turns <= 0) delete target.statuses.petrify;
}
/** Apply only after a successful hit. Refresh effects rather than stacking them. */
export function applyRangerStatus(
  target: StatusTarget,
  skillId: string,
  rank: number,
  event: { damage: number; dodged: boolean; blocked?: boolean; statusText?: string },
) {
  if (event.dodged || event.blocked || event.damage <= 0) return;
  target.statuses ??= {};
  if (skillId === 'scout-aim') {
    const reduction = 2 + Math.floor((rank - 1) / 5);
    target.statuses.slow = { turns: 3, reduction };
    event.statusText = `Slowed: -${reduction} movement for 3 turns`;
  } else if (skillId === 'scout-pierce') {
    const percent = 30 + rank - 1;
    target.statuses.armorBreak = { hits: 3, percent };
    event.statusText = `Armor weakened: -${percent}% for 3 hits`;
  } else if (skillId === 'scout-volley') {
    if (Math.random() * 100 < 35 + (rank - 1) * 2) {
      target.statuses.petrify = { turns: 1 };
      event.statusText = 'Petrified: loses next turn';
    } else event.statusText = 'Petrification resisted';
  }
}
