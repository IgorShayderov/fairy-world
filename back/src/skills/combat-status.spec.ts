import {
  applyRangerStatus,
  consumeArmorHit,
  effectiveDefense,
  effectiveMovement,
  finishStatusTurn,
  type StatusTarget,
} from './combat-status';

describe('ranger combat control', () => {
  afterEach(() => jest.restoreAllMocks());
  const hit = () => ({ damage: 20, dodged: false, statusText: '' });
  it('slows for exactly three enemy turns without permanently changing base movement', () => {
    const target: StatusTarget = { defense: 60, movement: 5 };
    applyRangerStatus(target, 'scout-aim', 1, hit());
    for (let turn = 0; turn < 3; turn++) {
      expect(effectiveMovement(target)).toBe(3);
      finishStatusTurn(target);
    }
    expect(effectiveMovement(target)).toBe(5);
    expect(target.movement).toBe(5);
  });
  it('weakens armor for three hits, not turns, and refreshes instead of stacking', () => {
    const target: StatusTarget = { defense: 60 };
    applyRangerStatus(target, 'scout-pierce', 1, hit());
    finishStatusTurn(target);
    expect(effectiveDefense(target)).toBe(42);
    consumeArmorHit(target);
    applyRangerStatus(target, 'scout-pierce', 1, hit());
    expect(target.statuses?.armorBreak).toEqual({ hits: 3, percent: 30 });
    for (let i = 0; i < 3; i++) consumeArmorHit(target);
    expect(effectiveDefense(target)).toBe(60);
  });
  it('petrifies on a successful chance roll for one turn, but can be resisted', () => {
    const target: StatusTarget = { defense: 0, movement: 5 };
    jest.spyOn(Math, 'random').mockReturnValue(0.34);
    applyRangerStatus(target, 'scout-volley', 1, hit());
    expect(effectiveMovement(target)).toBe(0);
    finishStatusTurn(target);
    expect(effectiveMovement(target)).toBe(5);
    jest.spyOn(Math, 'random').mockReturnValue(0.35);
    const event = hit();
    applyRangerStatus(target, 'scout-volley', 1, event);
    expect(target.statuses?.petrify).toBeUndefined();
    expect(event.statusText).toBe('Petrification resisted');
  });
  it('never applies control on a miss or block; a slow cannot reduce movement below one', () => {
    const target: StatusTarget = { defense: 60, movement: 1 };
    applyRangerStatus(target, 'scout-aim', 20, { damage: 0, dodged: true });
    applyRangerStatus(target, 'scout-pierce', 20, { damage: 0, dodged: false, blocked: true });
    expect(target.statuses).toBeUndefined();
    applyRangerStatus(target, 'scout-aim', 20, hit());
    expect(effectiveMovement(target)).toBe(1);
  });
});
