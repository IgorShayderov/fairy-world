import * as T from 'three';

import type { SkillEffect } from '@/modules/Skills/api';

export const SKILL_RELEASE = 0.28;
export const SKILL_IMPACT = 0.62;
export const SKILL_COLORS: Record<SkillEffect, string> = {
  slash: '#ffe296',
  heal: '#6dffb0',
  shockwave: '#ffbb45',
  arrow: '#8fffc2',
  pierce: '#baffee',
  volley: '#50efac',
  fire: '#ff661c',
  ice: '#8be6ff',
  arcane: '#c194ff',
};

/** Cast, release and contact share a timeline with the attack and hit reaction. */
export function createSkillEffect(effect: SkillEffect, from: T.Vector3, to: T.Vector3, caster = from) {
  const root = new T.Group();
  root.name = 'Skill ' + effect;
  const materials: T.MeshBasicMaterial[] = [];
  const geometries: T.BufferGeometry[] = [];
  const mesh = (name: string, geometry: T.BufferGeometry, color = SKILL_COLORS[effect], opacity = 1) => {
    const material = new T.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: T.AdditiveBlending,
      side: T.DoubleSide,
    });
    materials.push(material);
    geometries.push(geometry);
    const result = new T.Mesh(geometry, material);
    result.name = name;
    result.userData.baseOpacity = opacity;
    root.add(result);
    return result;
  };
  const direction = to.clone().sub(from).normalize();
  if (!direction.lengthSq()) direction.set(0, 0, 1);
  const side = new T.Vector3().crossVectors(direction, new T.Vector3(0, 1, 0)).normalize();
  const ranged = ['arrow', 'pierce', 'volley'].includes(effect);
  const spell = ['fire', 'ice', 'arcane'].includes(effect);
  const missile = ranged || spell;
  const rune = mesh('Caster sigil', new T.RingGeometry(0.49, 0.52, 48), undefined, 0.6);
  rune.rotation.x = -Math.PI / 2;
  const glyphs = Array.from({ length: 8 }, (_, i) => {
    const glyph = mesh('Rune ' + i, new T.PlaneGeometry(0.035, 0.14), undefined, 0.65);
    glyph.rotation.set(-Math.PI / 2, 0, (i * Math.PI) / 4);
    return glyph;
  });
  const cores = Array.from({ length: effect === 'volley' ? 7 : 1 }, (_, i) => {
    const geometry = ranged
      ? new T.ConeGeometry(effect === 'pierce' ? 0.045 : 0.028, 0.7, 6)
      : effect === 'ice'
        ? new T.OctahedronGeometry(0.21)
        : new T.IcosahedronGeometry(effect === 'fire' ? 0.2 : 0.15, 2);
    const core = mesh('Projectile ' + i, geometry, effect === 'fire' ? '#ffe8a0' : undefined);
    if (ranged || effect === 'ice') core.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction);
    return core;
  });
  const halo = mesh('Charge glow', new T.SphereGeometry(0.29, 16, 12), undefined, 0.25);
  const flash = mesh('Contact flash', new T.SphereGeometry(0.18, 16, 12), '#fff4d8', 0.9);
  const rings = Array.from({ length: effect === 'shockwave' || effect === 'arcane' ? 3 : 1 }, (_, i) => {
    const ring = mesh('Impact ring ' + i, new T.RingGeometry(0.9, 0.98, 64), undefined, 0.65);
    ring.rotation.x = -Math.PI / 2;
    return ring;
  });
  const slash = mesh('Blade crescent', new T.RingGeometry(0.85, 1.07, 48, 1, 0, Math.PI * 1.2), '#fff1c2', 0.9);
  const sparks = Array.from({ length: 28 }, (_, i) =>
    mesh(
      'Particle ' + i,
      effect === 'ice'
        ? new T.OctahedronGeometry(0.065 + (i % 3) * 0.025)
        : effect === 'shockwave'
          ? new T.TetrahedronGeometry(0.06 + (i % 4) * 0.018)
          : new T.SphereGeometry(0.025 + (i % 3) * 0.015, 6, 4),
      effect === 'fire' && i % 3 === 0 ? '#ffe39b' : undefined,
      0.8
    )
  );
  const fade = (object: T.Mesh<T.BufferGeometry, T.MeshBasicMaterial>, amount: number) => {
    object.material.opacity = (object.userData.baseOpacity as number) * T.MathUtils.clamp(amount, 0, 1);
    object.visible = object.material.opacity > 0.005;
  };
  function update(progress: number) {
    const t = T.MathUtils.clamp(progress, 0, 1);
    const charge = T.MathUtils.clamp(t / SKILL_RELEASE, 0, 1);
    const flight = T.MathUtils.clamp((t - SKILL_RELEASE) / (SKILL_IMPACT - SKILL_RELEASE), 0, 1);
    const burst = T.MathUtils.clamp((t - SKILL_IMPACT) / (1 - SKILL_IMPACT), 0, 1);
    const hit = t >= SKILL_IMPACT;
    const alive = t < 1;
    rune.position.set(caster.x, 0.065, caster.z);
    rune.scale.setScalar(0.6 + charge * 0.4);
    fade(rune, spell || effect === 'heal' ? (1 - flight) * charge : 0);
    glyphs.forEach((glyph, i) => {
      const angle = (i * Math.PI) / 4 + t * 0.5;
      glyph.position.set(caster.x + Math.cos(angle) * 0.64, 0.07, caster.z + Math.sin(angle) * 0.64);
      fade(glyph, rune.material.opacity);
    });
    cores.forEach((core, i) => {
      core.position
        .lerpVectors(from, to, flight)
        .addScaledVector(side, (i - 3) * 0.2 * Math.sin(flight * Math.PI) * (effect === 'volley' ? 1 : 0));
      core.position.y += effect === 'volley' ? Math.sin(flight * Math.PI) * (0.75 + (i % 3) * 0.16) : 0;
      if (effect === 'ice') core.scale.set(0.6, 2.6, 0.6);
      else core.scale.setScalar(ranged ? 1 : 0.3 + charge * 0.7);
      if (!ranged && effect !== 'ice') core.rotation.set(t * 7, t * 5, t * 3);
      fade(core, missile && !hit ? (ranged ? (t >= SKILL_RELEASE ? 1 : 0) : charge) : 0);
    });
    halo.position.copy(cores[0]!.position);
    halo.scale.setScalar((0.4 + charge * 0.8) * (1 + Math.sin(t * 30) * 0.08));
    fade(halo, spell && !hit ? charge * (effect === 'fire' ? 1 : 0.65) : 0);
    flash.position.copy(to);
    flash.scale.setScalar(1 + burst * 5);
    fade(flash, hit && alive && effect !== 'heal' ? Math.max(0, 1 - burst * 4) : 0);
    rings.forEach((ring, i) => {
      ring.position.set(to.x, 0.075 + i * 0.035, to.z);
      const spread = Math.max(0, burst - i * 0.1);
      ring.scale.setScalar(0.15 + spread * (effect === 'shockwave' ? 3.3 : effect === 'arcane' ? 2.5 : 1.2));
      fade(ring, hit && alive ? Math.pow(1 - burst, 2) * (effect === 'slash' || ranged ? 0.2 : 1) : 0);
    });
    slash.position.copy(to).addScaledVector(direction, -0.35);
    slash.rotation.set(0, Math.atan2(direction.x, direction.z), -0.8 + burst * 1.6);
    slash.scale.setScalar(0.8 + burst * 0.5);
    fade(slash, effect === 'slash' && hit && alive ? Math.max(0, 1 - burst * 2) : 0);
    sparks.forEach((spark, i) => {
      const angle = i * 2.399963;
      if (effect === 'heal') {
        const rise = (t * 1.7 + i / sparks.length) % 1;
        spark.position.set(
          from.x + Math.cos(angle + t * 4) * 0.45,
          0.2 + rise * 2.2,
          from.z + Math.sin(angle + t * 4) * 0.45
        );
        fade(spark, alive ? Math.sin(Math.PI * t) * Math.sin(Math.PI * rise) : 0);
      } else if (!hit && missile && t >= SKILL_RELEASE) {
        const trail = Math.max(0, flight - i * 0.018);
        spark.position.lerpVectors(from, to, trail);
        const radius = effect === 'arcane' ? 0.23 : effect === 'fire' ? 0.11 : 0.035;
        spark.position.addScaledVector(side, Math.cos(angle + t * 24) * radius);
        spark.position.y += Math.sin(angle + t * 24) * radius;
        spark.scale.setScalar((1 - i / sparks.length) * (effect === 'fire' ? 2.4 : 1));
        fade(spark, (1 - i / sparks.length) * charge);
      } else {
        const spread = (effect === 'shockwave' ? 2.4 : 1.4) * burst;
        spark.position
          .copy(to)
          .add(
            new T.Vector3(
              Math.cos(angle) * spread,
              Math.sin(i * 1.7) * spread + burst * (1 - burst),
              Math.sin(angle) * spread
            )
          );
        if (effect === 'shockwave') spark.position.y = 0.1 + Math.sin(Math.PI * burst) * (0.25 + (i % 4) * 0.12);
        spark.rotation.set(burst * 4 + i, i * 2, burst * 6);
        spark.scale.setScalar(1 - burst * 0.7);
        fade(spark, hit && alive ? Math.pow(1 - burst, 2) : 0);
      }
    });
  }
  update(0);
  return {
    root,
    update,
    dispose() {
      root.removeFromParent();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}
