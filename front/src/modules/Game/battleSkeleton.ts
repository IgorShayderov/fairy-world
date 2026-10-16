import * as T from 'three';

export function dressSkeleton(model: T.Object3D) {
  model.traverse((object) => {
    if (!(object instanceof T.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!(material instanceof T.MeshStandardMaterial)) continue;
      if (/Feather|ChitinArmor/.test(material.name)) {
        material.color.set('#35414c');
        material.metalness = 0.65;
        material.roughness = 0.5;
      }
      if (material.name === 'Fur') material.color.set('#292d32');
      if (material.name === 'Bone') material.color.set('#c5bd9e');
    }
  });
  const sword = model.getObjectByName('SkullSword');
  if (!sword?.parent) return;
  sword.visible = false;
  const axe = new T.Group();
  axe.name = 'SkeletonAxe';
  axe.position.copy(sword.position);
  axe.quaternion.copy(sword.quaternion);
  axe.scale.copy(sword.scale);
  const steel = new T.MeshStandardMaterial({ color: '#8998a3', metalness: 0.85, roughness: 0.35 });
  const haft = new T.Mesh(
    new T.CylinderGeometry(0.012, 0.014, 0.44, 10),
    new T.MeshStandardMaterial({ color: '#39291e', roughness: 0.9 })
  );
  haft.position.y = 0.14;
  axe.add(haft);
  const shape = new T.Shape();
  shape.moveTo(-0.025, 0.25);
  shape.lineTo(0.06, 0.26);
  shape.quadraticCurveTo(0.12, 0.25, 0.155, 0.22);
  shape.quadraticCurveTo(0.2, 0.32, 0.155, 0.4);
  shape.quadraticCurveTo(0.1, 0.35, 0.045, 0.35);
  shape.lineTo(-0.025, 0.35);
  shape.closePath();
  const head = new T.Mesh(
    new T.ExtrudeGeometry(shape, {
      depth: 0.025,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 1,
      steps: 1,
    }),
    steel
  );
  head.position.z = -0.0125;
  axe.add(head);
  axe.traverse((part) => {
    if (part instanceof T.Mesh) part.castShadow = true;
  });
  sword.parent.add(axe);
}

/** Reduce the legacy forward hunch without changing the authored death pose. */
export function uprightSkeletonClips(clips: T.AnimationClip[]) {
  const correction = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -0.18);
  return clips.map((source) => {
    if (source.name === 'Death') return source;
    const clip = source.clone();
    const back = clip.tracks.find((track) => track.name === 'Back.quaternion');
    if (back) {
      for (let i = 0; i < back.values.length; i += 4) {
        new T.Quaternion().fromArray(back.values, i).premultiply(correction).toArray(back.values, i);
      }
    }
    return clip;
  });
}
