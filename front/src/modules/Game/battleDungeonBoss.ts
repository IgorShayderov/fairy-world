import * as T from 'three';

import type { MonsterModel } from './battleMonsterModels';

/** Original boss variants on the licensed, rigged creatures; all source animations remain usable. */
export function dressDungeonBoss(root: T.Group, model: MonsterModel) {
  if (!model.boss) return;
  const palettes = {
    flame: { color: 0x6b3026, glow: 0xff6328, metal: 0.7 },
    hollow: { color: 0xb9aa8a, glow: 0x63e2bb, metal: 0.6 },
    ice: { color: 0xa5d9ee, glow: 0x54bde8, metal: 0.25 },
    raven: { color: 0x5b4677, glow: 0xad73ef, metal: 0.5 },
  };
  const palette = palettes[model.boss];
  const painted = new Set<T.Material>();
  let head: T.Object3D | undefined;
  root.traverse((object) => {
    if (object instanceof T.Bone && /head/i.test(object.name) && !head) head = object;
    if (!(object instanceof T.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!(material instanceof T.MeshStandardMaterial) || painted.has(material)) continue;
      painted.add(material);
      // Preserve the ice skin's baked shading and normal-map details.
      if (model.boss === 'ice') {
        material.color.setHex(0xffffff);
        material.emissive.setHex(0x000000);
        material.metalness = 0;
        material.roughness = 0.45;
        continue;
      }
      material.color.lerp(new T.Color(palette.color), 0.5);
      material.emissive.setHex(palette.glow);
      material.emissiveIntensity = 0.08;
      material.metalness = palette.metal;
    }
  });
  // This rig already has a crystal crown. Its head pivot is at the neck,
  // so a generic head-bone ornament becomes a floating collar.
  if (model.boss === 'ice') return;
  const crown = new T.Group();
  const metal = new T.MeshStandardMaterial({ color: palette.color, metalness: 0.8, roughness: 0.3 });
  const crystal = new T.MeshStandardMaterial({
    color: palette.glow,
    emissive: palette.glow,
    emissiveIntensity: 0.8,
    metalness: 0.3,
    roughness: 0.2,
  });
  const radius = model.height * 0.105;
  const band = new T.Mesh(new T.TorusGeometry(radius, 0.035, 8, 24), metal);
  band.rotation.x = Math.PI / 2;
  crown.add(band);
  for (let i = 0; i < 7; i++) {
    const angle = (i * Math.PI * 2) / 7;
    const spike = new T.Mesh(new T.ConeGeometry(0.055, 0.26 + (i % 2) * 0.1, 5), crystal);
    spike.position.set(Math.cos(angle) * radius, 0.12, Math.sin(angle) * radius);
    crown.add(spike);
  }
  root.updateMatrixWorld(true);
  if (head) {
    crown.position.copy(head.getWorldPosition(new T.Vector3()));
    crown.position.y += 0.13;
    // Attach with preserved world transform so ornaments follow the animated head.
    root.parent?.add(crown);
    head.attach(crown);
  } else {
    crown.position.y = model.height * 0.92;
    root.add(crown);
  }
}
