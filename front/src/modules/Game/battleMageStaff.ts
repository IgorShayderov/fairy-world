import * as T from 'three';

/** Grip origin/axis matches the two-handed rig, so it follows both hands during animation. */
export function createMageStaff() {
  const staff = new T.Group();
  const wood = new T.MeshStandardMaterial({ color: '#342330', roughness: 0.65, metalness: 0.1 });
  const gold = new T.MeshStandardMaterial({ color: '#c39b54', roughness: 0.32, metalness: 0.8 });
  const crystal = new T.MeshStandardMaterial({
    color: '#a18eff',
    emissive: '#674ce0',
    emissiveIntensity: 1.1,
    metalness: 0.35,
    roughness: 0.2,
  });
  const shaft = new T.Mesh(new T.CylinderGeometry(0.035, 0.045, 2.25, 12), wood);
  shaft.position.y = 0.62;
  staff.add(shaft);
  for (const height of [-0.48, 0.02, 0.23, 1.57, 1.71]) {
    const band = new T.Mesh(new T.CylinderGeometry(0.055, 0.055, 0.055, 12), gold);
    band.position.y = height;
    staff.add(band);
  }
  const gem = new T.Mesh(new T.OctahedronGeometry(0.16), crystal);
  gem.position.y = 1.9;
  gem.scale.y = 1.45;
  staff.add(gem);
  for (const side of [-1, 1]) {
    const prong = new T.Mesh(new T.TorusGeometry(0.17, 0.023, 8, 16, Math.PI * 0.8), gold);
    prong.position.set(0, 1.86, 0);
    prong.rotation.z = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    staff.add(prong);
  }
  staff.traverse((object) => {
    if (object instanceof T.Mesh) object.castShadow = true;
  });
  return staff;
}
