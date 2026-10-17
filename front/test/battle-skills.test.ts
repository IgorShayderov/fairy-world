import { Mesh, MeshBasicMaterial, Scene, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createSkillEffect, SKILL_COLORS, SKILL_IMPACT, SKILL_RELEASE } from '../src/modules/Game/battleSkillEffects';
import type { SkillEffect } from '../src/modules/Skills/api';

describe('skill visual effects', () => {
  it('tracks the casting focus without moving the ground sigil', () => {
    const focus = new Vector3(0, 2, 0);
    const caster = new Vector3(0, 0, 0);
    const visual = createSkillEffect('fire', focus, new Vector3(4, 1, 0), caster);
    focus.set(1, 3, 0.5);
    visual.update(SKILL_RELEASE);
    expect(visual.root.getObjectByName('Projectile 0')!.position.distanceTo(focus)).toBeLessThan(0.001);
    expect(visual.root.getObjectByName('Caster sigil')!.position.toArray()).toEqual([0, 0.065, 0]);
    visual.dispose();
  });
  it.each(['fire', 'ice', 'arcane', 'arrow', 'pierce', 'volley'] as SkillEffect[])('%s launches only once and hits before fading', (effect) => {
    const from = new Vector3(0, 1, 0), to = new Vector3(4, 1, 0);
    const visual = createSkillEffect(effect, from, to);
    const projectile = visual.root.getObjectByName('Projectile 0')!;
    const contact = visual.root.getObjectByName('Contact flash')!;
    visual.update(SKILL_RELEASE);
    expect(projectile.position.distanceTo(from)).toBeLessThan(0.001);
    expect(contact.visible).toBe(false);
    visual.update(SKILL_IMPACT);
    expect(projectile.position.distanceTo(to)).toBeLessThan(0.001);
    expect(projectile.visible).toBe(false);
    expect(contact.visible).toBe(true);
    visual.update(1);
    expect(contact.visible).toBe(false);
    visual.dispose();
  });
  it.each(Object.keys(SKILL_COLORS) as SkillEffect[])('%s animates finite geometry, fades out and releases GPU resources', (effect) => {
    const visual = createSkillEffect(effect, new Vector3(0, 1, 0), new Vector3(3, 1, 2));
    const scene = new Scene();
    scene.add(visual.root);
    const objects = visual.root.children as Mesh[];
    const disposed = objects.map((object) => vi.spyOn(object.geometry, 'dispose'));
    for (const progress of [0, 0.3, 0.65, 0.9, 1]) {
      visual.update(progress);
      objects.forEach((object) => expect(object.position.toArray().every(Number.isFinite)).toBe(true));
    }
    expect(objects.every((object) => (object.material as MeshBasicMaterial).opacity === 0)).toBe(true);
    visual.dispose();
    expect(scene.children).toHaveLength(0);
    disposed.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
  });
});
