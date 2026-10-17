import * as T from 'three';

export const CROSSBOW_MUZZLE = new T.Vector3(0, 0.095, 0.46);
const tips = [-1, 1].map((side) => new T.Vector3(side * 0.57, 0.025, 0.24));

/** A compact steel-prod arbalest. Grip sockets remain in battleRangedWeapon's local space. */
export function createCrossbow() {
  const root = new T.Group();
  root.name = 'Steel arbalest';
  const walnut = new T.MeshStandardMaterial({ color: '#513021', roughness: 0.55 });
  const leather = new T.MeshStandardMaterial({ color: '#241b17', roughness: 0.85 });
  const steel = new T.MeshStandardMaterial({ color: '#778b97', metalness: 0.82, roughness: 0.28 });
  const darkSteel = new T.MeshStandardMaterial({ color: '#26323c', metalness: 0.75, roughness: 0.38 });
  const brass = new T.MeshStandardMaterial({ color: '#b99453', metalness: 0.75, roughness: 0.34 });
  const cord = new T.MeshStandardMaterial({ color: '#ded0a5', roughness: 0.9 });
  const add = (name: string, geometry: T.BufferGeometry, material: T.Material, position = new T.Vector3()) => {
    const mesh = new T.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.copy(position);
    mesh.castShadow = true;
    root.add(mesh);
    return mesh;
  };
  const profile = (points: number[][], depth: number) => {
    const shape = new T.Shape(points.map(([x, y]) => new T.Vector2(x, y)));
    const geometry = new T.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.009,
      bevelThickness: 0.008,
      bevelSegments: 2,
      steps: 1,
    });
    geometry.translate(0, 0, -depth / 2);
    return geometry;
  };
  // Side profile: shouldered rear stock, narrow rail, and a carved pistol grip instead of a box.
  const stock = profile(
    [
      [-0.57, 0.035],
      [0.42, 0.035],
      [0.43, -0.035],
      [0.13, -0.075],
      [-0.1, -0.075],
      [-0.14, -0.12],
      [-0.15, -0.25],
      [-0.23, -0.25],
      [-0.26, -0.095],
      [-0.47, -0.12],
      [-0.58, -0.1],
    ],
    0.095
  );
  stock.rotateY(-Math.PI / 2);
  add('Carved walnut stock', stock, walnut);
  const foreEnd = profile(
    [
      [-0.07, -0.035],
      [0.24, -0.035],
      [0.19, -0.1],
      [-0.04, -0.1],
    ],
    0.12
  );
  foreEnd.rotateY(-Math.PI / 2);
  add('Leather fore-end', foreEnd, leather);
  for (const x of [-0.037, 0.037]) {
    add('Steel bolt rail', new T.BoxGeometry(0.014, 0.018, 0.68), steel, new T.Vector3(x, 0.057, 0.08));
  }
  for (const side of [-1, 1]) {
    // Broad tapered recurved limbs, unmistakably horizontal at gameplay distance.
    const limb = profile(
      [
        [0.045, 0.31],
        [0.2, 0.35],
        [0.38, 0.31],
        [0.51, 0.2],
        [0.58, 0.22],
        [0.59, 0.255],
        [0.51, 0.27],
        [0.38, 0.39],
        [0.2, 0.43],
        [0.045, 0.4],
      ].map(([x, z]) => [x! * side, z!]),
      0.027
    );
    limb.rotateX(Math.PI / 2);
    add('Recurved steel limb', limb, steel, new T.Vector3(0, 0.025, 0));
    const socket = add(
      'Limb retaining pin',
      new T.CylinderGeometry(0.025, 0.025, 0.09, 12),
      brass,
      new T.Vector3(side * 0.11, 0.025, 0.36)
    );
    socket.rotation.z = Math.PI / 2;
    const string = add(`String ${side}`, new T.CylinderGeometry(0.006, 0.006, 1, 8), cord);
    string.userData.tip = tips[side === -1 ? 0 : 1]!.clone();
  }
  add('Prod mounting bracket', new T.BoxGeometry(0.17, 0.09, 0.14), darkSteel, new T.Vector3(0, 0.005, 0.35));
  for (const z of [-0.48, 0.21]) {
    add('Stock binding', new T.BoxGeometry(0.112, 0.014, 0.037), brass, new T.Vector3(0, 0.055, z));
    for (const side of [-1, 1]) {
      add('Binding side', new T.BoxGeometry(0.014, 0.11, 0.037), brass, new T.Vector3(side * 0.055, -0.005, z));
    }
  }
  for (let i = 0; i < 5; i++) {
    add(
      'Leather grip wrap',
      new T.BoxGeometry(0.112, 0.012, 0.088),
      leather,
      new T.Vector3(0, -0.13 - i * 0.023, -0.19)
    );
  }
  const guard = add('Trigger guard', new T.TorusGeometry(0.066, 0.008, 8, 20), brass, new T.Vector3(0, -0.115, -0.065));
  guard.rotation.y = Math.PI / 2;
  guard.scale.y = 0.85;
  const trigger = add('Trigger', new T.BoxGeometry(0.014, 0.07, 0.015), darkSteel, new T.Vector3(0, -0.095, -0.09));
  trigger.rotation.x = -0.25;
  const nut = add('Rolling nut', new T.CylinderGeometry(0.032, 0.032, 0.09, 16), brass, new T.Vector3(0, 0.06, -0.18));
  nut.rotation.z = Math.PI / 2;
  const stirrup = add(
    'Foot stirrup',
    new T.TorusGeometry(0.11, 0.014, 8, 24),
    darkSteel,
    new T.Vector3(0, -0.01, 0.54)
  );
  stirrup.rotation.x = Math.PI / 2;
  stirrup.scale.y = 1.2;
  const bolt = new T.Group();
  bolt.name = 'Loaded bolt';
  const shaft = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.55, 8), walnut);
  shaft.rotation.x = Math.PI / 2;
  bolt.add(shaft);
  const head = new T.Mesh(new T.ConeGeometry(0.026, 0.095, 4), steel);
  head.rotation.x = Math.PI / 2;
  head.position.z = 0.3;
  bolt.add(head);
  for (const angle of [0, Math.PI / 2]) {
    const vane = new T.Mesh(new T.BoxGeometry(0.06, 0.004, 0.085), leather);
    vane.position.z = -0.23;
    vane.rotation.z = angle;
    bolt.add(vane);
  }
  bolt.position.set(0, 0.095, 0.13);
  root.add(bolt);
  updateCrossbowMechanism(root);
  return root;
}

/** Release, recoil and re-cock without moving either grip socket. */
export function updateCrossbowMechanism(root: T.Object3D, progress?: number, loaded = true) {
  const fired = progress !== undefined && progress > 0.3 && progress < 0.88;
  const draw = !loaded
    ? 0
    : progress === undefined || progress <= 0.3
      ? 1
      : progress < 0.36
        ? 1 - (progress - 0.3) / 0.06
        : progress < 0.68
          ? 0
          : Math.min(1, (progress - 0.68) / 0.24);
  const center = new T.Vector3(0, 0.025, 0.24 - draw * 0.4);
  for (const side of [-1, 1]) {
    const string = root.getObjectByName(`String ${side}`);
    if (!string) continue;
    const tip = tips[side === -1 ? 0 : 1]!;
    string.position.copy(tip).add(center).multiplyScalar(0.5);
    string.scale.y = tip.distanceTo(center);
    string.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), center.clone().sub(tip).normalize());
  }
  const bolt = root.getObjectByName('Loaded bolt');
  if (bolt) bolt.visible = loaded && !fired;
}
