<template>
  <div ref="host" class="battle-scene" aria-label="3D tactical battlefield">
    <div class="camera-hint">Right-drag to orbit · Scroll to zoom</div>
    <a class="asset-credits" href="/models/battle/ATTRIBUTION.md" target="_blank" rel="noopener">Art credits</a>
    <div v-if="message" class="scene-message" role="status">
      <div>{{ message }}</div>
      <button v-if="failed" type="button" @click="emit('fallback')">Return to battle options</button>
    </div>

    <!-- Floating 3D Combat Overlay -->
    <div class="combat-floating-layer pointer-events-none">
      <div
        v-for="item in floatingTexts"
        :key="item.id"
        class="floating-combat-text"
        :class="`floating-combat-text--${item.type}`"
        :style="{
          left: `${item.x}px`,
          top: `${item.y}px`,
          opacity: item.opacity,
          transform: `translate(-50%, ${item.offsetY}px) scale(${item.scale})`,
        }"
      >
        {{ item.text }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { attackOffset, attackTiming, smoothStep } from '@/modules/Game/battleAnimation';
import { battleMonsterModel } from '@/modules/Game/battleMonsterModels';
import { battleMovementPath } from '@/modules/Game/battleMovementPath';
import type { BattleHandMode } from '@/modules/Game/battlePlayerLoadout';
import type { BattleState } from '@/modules/Monsters/api';

const props = defineProps<{ battle: BattleState; disabled: boolean; handMode?: BattleHandMode }>();
const emit = defineEmits<{ busy: [value: boolean]; move: [cell: number]; attack: []; fallback: [] }>();

const host = ref<HTMLDivElement>();
const message = ref('Loading animated battlefield…');
const failed = ref(false);

type FloatingText = {
  id: number;
  text: string;
  type: 'damage' | 'crit' | 'dodge' | 'block';
  worldPos: T.Vector3;
  x: number;
  y: number;
  offsetY: number;
  opacity: number;
  scale: number;
  startTime: number;
};
const floatingTexts = ref<FloatingText[]>([]);
let nextTextId = 0;

function addFloatingText(text: string, type: FloatingText['type'], worldPos: T.Vector3) {
  floatingTexts.value.push({
    id: nextTextId++,
    text,
    type,
    worldPos,
    x: 0,
    y: 0,
    offsetY: 0,
    opacity: 1,
    scale: type === 'crit' ? 1.4 : 1.0,
    startTime: performance.now(),
  });
}

const scene = new T.Scene();
scene.background = new T.Color('#0c1417');
const camera = new T.PerspectiveCamera(36, 1, 0.1, 160);
const loader = new GLTFLoader();
const tiles: T.Mesh<T.CylinderGeometry, T.MeshStandardMaterial>[] = [];

type TileOverlay = {
  mesh: T.Mesh<T.RingGeometry, T.MeshBasicMaterial>;
  innerRune: T.Mesh<T.RingGeometry, T.MeshBasicMaterial>;
  material: T.MeshBasicMaterial;
  innerMaterial: T.MeshBasicMaterial;
  mode: 'neutral' | 'reachable' | 'player' | 'monster' | 'attackable';
};
const tileOverlays: TileOverlay[] = [];
let hoveredCell = -1;

type Brazier = {
  light: T.PointLight;
  fireCore: T.Mesh;
  baseIntensity: number;
  flickerSpeed: number;
  phase: number;
};
const braziers: Brazier[] = [];

let emberPoints: T.Points | undefined;
let emberPositions: Float32Array | undefined;
let emberVelocities: Float32Array | undefined;

type Fighter = {
  root: T.Group;
  mixer: T.AnimationMixer;
  clips: T.AnimationClip[];
  current?: T.AnimationAction;
  height: number;
  stanceRing?: T.Mesh;
};

let player: Fighter | undefined;
let enemy: Fighter | undefined;
let renderer: T.WebGLRenderer | undefined;
let controls: OrbitControls | undefined;
let weapon: T.Group | undefined;
let shield: T.Group | undefined;
let offhandWeapon: T.Group | undefined;
let observer: ResizeObserver | undefined;
let frame = 0;
let disposed = false;
let busy = true;
let elapsed = 0;
let shakeIntensity = 0;
let playerAttackCombo = 0;

const waits = new Set<{
  end: number;
  resolve: () => void;
  tick: ((progress: number) => void) | undefined;
  start: number;
}>();

function wait(seconds: number, tick?: (progress: number) => void) {
  return new Promise<void>((resolve) => waits.add({ end: elapsed + seconds, start: elapsed, resolve, tick }));
}

function point(cell: number) {
  const { columns, rows } = props.battle.arena;
  const row = Math.floor(cell / columns);
  return new T.Vector3(((cell % columns) + (row % 2) / 2 - columns / 2) * 1.77, 0.12, (row - rows / 2) * 1.53);
}

function materials(root: T.Object3D, isPlayer = false) {
  root.traverse((object) => {
    if (!(object instanceof T.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (object instanceof T.SkinnedMesh) object.frustumCulled = false;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      material.opacity = 1;
      material.transparent = false;
      material.alphaTest = 0;
      if (material instanceof T.MeshStandardMaterial) {
        material.emissive.set('#000000');
        material.emissiveIntensity = 0;
        if (isPlayer) {
          const name = object.name.toLowerCase();
          if (
            name.includes('sword') ||
            name.includes('shield') ||
            name.includes('helmet') ||
            name.includes('body') ||
            name.includes('arm') ||
            name.includes('leg')
          ) {
            material.metalness = 0.68;
            material.roughness = 0.32;
          } else {
            material.roughness = 0.6;
          }
        } else {
          material.roughness = Math.max(0.45, material.roughness || 0.7);
        }
      }
    }
  });
}

function createStanceRing(colorHex: string, radius: number): T.Mesh {
  const geometry = new T.RingGeometry(radius * 0.94, radius, 48);
  geometry.rotateX(-Math.PI / 2);
  const material = new T.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.45,
    side: T.DoubleSide,
    depthWrite: false,
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.position.y = 0.02;
  return mesh;
}

function resolveModelPath(file: string): string {
  if (file.includes('/')) return file;
  if (file.startsWith('kaykit-') || file === 'solus-knight' || file === 'demon' || file === 'ghost') return file;
  return `creatures/${file}`;
}

function createSword(twoHanded: boolean) {
  const sword = new T.Group();
  const steel = new T.MeshStandardMaterial({ color: '#abb5bb', metalness: 0.9, roughness: 0.28 });
  const leather = new T.MeshStandardMaterial({ color: '#33271d', roughness: 0.95 });
  const bladeShape = new T.Shape();
  const length = twoHanded ? 1.35 : 0.95;
  bladeShape.moveTo(-0.065, 0.3);
  bladeShape.lineTo(0.065, 0.3);
  bladeShape.lineTo(0.045, length);
  bladeShape.lineTo(0, length + 0.17);
  bladeShape.lineTo(-0.045, length);
  bladeShape.closePath();
  const blade = new T.Mesh(
    new T.ExtrudeGeometry(bladeShape, {
      depth: 0.015,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 1,
      steps: 1,
    }),
    steel
  );
  blade.position.z = -0.0075;
  sword.add(blade);
  const guard = new T.Mesh(new T.BoxGeometry(0.34, 0.038, 0.06), steel);
  guard.position.y = 0.29;
  sword.add(guard);
  const grip = new T.Mesh(new T.CylinderGeometry(0.025, 0.029, 0.32, 10), leather);
  grip.position.y = 0.105;
  sword.add(grip);
  const pommel = new T.Mesh(new T.SphereGeometry(0.047, 12, 8), steel);
  pommel.position.y = -0.085;
  sword.add(pommel);
  sword.traverse((object) => {
    if (object instanceof T.Mesh) object.castShadow = true;
  });
  return sword;
}

function equipPlayer() {
  const mode = props.handMode ?? 'TWO_HANDED';
  if (mode === 'UNARMED') return;
  weapon = createSword(mode === 'TWO_HANDED');
  scene.add(weapon);
  if (mode === 'DUAL') {
    offhandWeapon = createSword(false);
    scene.add(offhandWeapon);
  }
  if (mode === 'WEAPON_SHIELD') {
    shield = new T.Group();
    const body = new T.Mesh(
      new T.CylinderGeometry(0.35, 0.35, 0.05, 32),
      new T.MeshStandardMaterial({ color: '#514d40', metalness: 0.65, roughness: 0.5 })
    );
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    shield.add(body);
    scene.add(shield);
  }
}

function updateEquipment() {
  if (!player || !weapon) return;
  player.root.updateMatrixWorld(true);
  const right = player.root.getObjectByName('Rig_hand_R');
  const left = player.root.getObjectByName('Rig_hand_L');
  if (!right || !left) return;
  const rightPosition = right.getWorldPosition(new T.Vector3());
  const leftPosition = left.getWorldPosition(new T.Vector3());
  weapon.position.copy(rightPosition);
  if ((props.handMode ?? 'TWO_HANDED') === 'TWO_HANDED') {
    // The authored heavy-weapon pose places the left hand nearest the blade.
    const gripDirection = leftPosition.clone().sub(rightPosition);
    weapon.scale.y = Math.max(0.8, Math.min(1.6, gripDirection.length() / 0.23));
    weapon.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), gripDirection.normalize());
  } else {
    weapon.quaternion
      .copy(right.getWorldQuaternion(new T.Quaternion()))
      .multiply(new T.Quaternion().setFromEuler(new T.Euler(Math.PI / 2, 0, 0)));
  }
  if (offhandWeapon) {
    offhandWeapon.position.copy(leftPosition);
    offhandWeapon.quaternion
      .copy(left.getWorldQuaternion(new T.Quaternion()))
      .multiply(new T.Quaternion().setFromEuler(new T.Euler(Math.PI / 2, 0, 0)));
  }
  if (shield) {
    shield.position.copy(leftPosition);
    shield.quaternion.copy(left.getWorldQuaternion(new T.Quaternion()));
  }
}

async function fighter(file: string, height: number, isPlayer = false): Promise<Fighter> {
  const gltf = await loader.loadAsync(`/models/battle/${resolveModelPath(file)}.glb`);
  const model = gltf.scene;
  if (disposed) {
    release(model);
    throw new Error('Battlefield closed');
  }
  materials(model, isPlayer);
  const mixer = new T.AnimationMixer(model);
  const idle =
    gltf.animations.find((animation) => animation.name === 'knight_idle_heavy_weapon') ??
    gltf.animations.find((animation) => /Idle$/i.test(animation.name)) ??
    gltf.animations[0];
  if (idle) mixer.clipAction(idle).play();
  mixer.update(0.01);
  model.updateMatrixWorld(true);
  model.traverse((object) => {
    if (object instanceof T.SkinnedMesh) {
      object.skeleton.update();
      object.computeBoundingBox();
    }
  });
  const box = new T.Box3().setFromObject(model);
  const scale = height / box.getSize(new T.Vector3()).y;
  model.scale.multiplyScalar(scale);
  model.position.y -= box.min.y * scale;

  const root = new T.Group();
  root.add(model);

  // Add glowing ground stance ring
  const ringColor = isPlayer ? '#34d399' : '#f87171';
  const ringRadius = isPlayer ? 0.68 : Math.max(0.65, height * 0.32);
  const stanceRing = createStanceRing(ringColor, ringRadius);
  root.add(stanceRing);

  scene.add(root);
  mixer.stopAllAction();
  return { root, mixer, clips: gltf.animations, height, stanceRing };
}

function clip(unit: Fighter, kind: 'idle' | 'walk' | 'attack' | 'death' | 'hit') {
  if (unit === player) {
    const mode = props.handMode ?? 'TWO_HANDED';
    const names = {
      idle:
        mode === 'TWO_HANDED' ? 'knight_idle_heavy_weapon' : mode === 'DUAL' ? 'knight_idle_2_weapon' : 'knight_idle',
      walk: 'knight_walk_in_place',
      attack:
        mode === 'TWO_HANDED'
          ? 'knight_attack_2_heavy_weapon'
          : mode === 'DUAL'
            ? 'two_weapon_attack_sequence'
            : mode === 'UNARMED'
              ? 'knight_shield_attack'
              : 'knight_shield_attack',
      death: 'knight_front_attacked_fall',
      hit: 'knight_hurt_left',
    };
    return unit.clips.find((entry) => entry.name === names[kind]);
  }
  const patterns = {
    idle: /(?:\|Idle_swordRight$|^Idle$|Skeleton_Idle$|Flying_Idle$)/i,
    walk: /(?:Walking_A$|Walking$|^Walk$|Skeleton_Running$|Fast_Flying$)/i,
    attack: /(?:^Attack$|^1H_Melee_Attack_Chop$|swordAttackJump$|^Weapon$|Skeleton_Attack$|Headbutt$|^Punch$)/i,
    death: /(?:Death$|^Death_A$)/i,
    hit: /(?:HitReact$|^Hit_A$|^Hit$)/i,
  };
  return unit.clips.find((entry) => patterns[kind].test(entry.name));
}

function selectPlayerAttackClip(isPower: boolean): T.AnimationClip | undefined {
  if (!player) return undefined;
  const heavy = props.handMode === 'TWO_HANDED' || !props.handMode;
  if (heavy) {
    const name = isPower || playerAttackCombo++ % 2 ? 'knight_attack_3_heavy_weapon' : 'knight_attack_2_heavy_weapon';
    return player.clips.find((entry) => entry.name === name) ?? clip(player, 'attack');
  }
  const mode = props.handMode ?? 'TWO_HANDED';

  if (isPower) {
    const powerClip =
      mode === 'TWO_HANDED'
        ? (player.clips.find((c) => /2H_Melee_Attack_Spin/i.test(c.name)) ??
          player.clips.find((c) => /2H_Melee_Attack_Chop/i.test(c.name)))
        : mode === 'DUAL'
          ? player.clips.find((c) => /Dualwield_Melee_Attack_Chop/i.test(c.name))
          : mode === 'UNARMED'
            ? player.clips.find((c) => /Unarmed_Melee_Attack_Kick/i.test(c.name))
            : player.clips.find((c) => /1H_Melee_Attack_Chop/i.test(c.name));
    if (powerClip) return powerClip;
  }

  const comboPools: Record<string, string[]> = {
    TWO_HANDED: ['2H_Melee_Attack_Slice', '2H_Melee_Attack_Chop', '2H_Melee_Attack_Stab'],
    DUAL: ['Dualwield_Melee_Attack_Slice', 'Dualwield_Melee_Attack_Chop', 'Dualwield_Melee_Attack_Stab'],
    UNARMED: ['Unarmed_Melee_Attack_Punch_A', 'Unarmed_Melee_Attack_Punch_B', 'Unarmed_Melee_Attack_Kick'],
    SINGLE: [
      '1H_Melee_Attack_Slice_Diagonal',
      '1H_Melee_Attack_Slice_Horizontal',
      '1H_Melee_Attack_Chop',
      '1H_Melee_Attack_Stab',
    ],
  };

  const pool = comboPools[mode] ?? comboPools.SINGLE;
  const chosenName = pool[playerAttackCombo % pool.length];
  playerAttackCombo++;
  return player.clips.find((c) => c.name === chosenName) ?? clip(player, 'attack');
}

function playAction(unit: Fighter, animation: T.AnimationClip | undefined, once = false, duration?: number) {
  if (!animation) return 0.6;
  const action = unit.mixer.clipAction(animation);
  if (!once && unit.current === action && action.isRunning()) return animation.duration;
  if (unit.current !== action) unit.current?.fadeOut(0.18);
  action
    .reset()
    .setEffectiveTimeScale(duration ? animation.duration / duration : 1)
    .setEffectiveWeight(1);
  action.setLoop(once ? T.LoopOnce : T.LoopRepeat, once ? 1 : Infinity);
  action.clampWhenFinished = once;
  action.fadeIn(once ? 0.08 : 0.18).play();
  unit.current = action;
  return duration ?? animation.duration;
}

function play(unit: Fighter, kind: 'idle' | 'walk' | 'attack' | 'death' | 'hit', once = false) {
  const animation = clip(unit, kind) ?? clip(unit, 'idle') ?? unit.clips[0];
  return playAction(unit, animation, once);
}

function face(unit: Fighter, destination: T.Vector3) {
  const direction = destination.clone().sub(unit.root.position);
  unit.root.rotation.y = Math.atan2(direction.x, direction.z);
}

function spawnHitSparks(position: T.Vector3, colorHex: string, count = 12) {
  const sparkGroup = new T.Group();
  sparkGroup.position.copy(position);

  const particles: Array<{ mesh: T.Mesh; velocity: T.Vector3 }> = [];
  const sparkGeo = new T.DodecahedronGeometry(0.05, 0);

  for (let i = 0; i < count; i++) {
    const mat = new T.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 1,
    });
    const mesh = new T.Mesh(sparkGeo, mat);
    const speed = 1.6 + Math.random() * 2.4;
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI;
    const velocity = new T.Vector3(
      Math.cos(theta) * Math.cos(phi) * speed,
      Math.sin(phi) * speed + 1.2,
      Math.sin(theta) * Math.cos(phi) * speed
    );
    sparkGroup.add(mesh);
    particles.push({ mesh, velocity });
  }

  scene.add(sparkGroup);

  const startTime = elapsed;
  const sparkDuration = 0.32;
  const tick = () => {
    const age = elapsed - startTime;
    const progress = age / sparkDuration;
    if (progress >= 1 || disposed) {
      scene.remove(sparkGroup);
      sparkGroup.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          o.material.dispose();
        }
      });
      return;
    }
    for (const p of particles) {
      p.mesh.position.addScaledVector(p.velocity, 0.016);
      p.velocity.y -= 8.5 * 0.016;
      (p.mesh.material as T.MeshBasicMaterial).opacity = 1 - progress;
      p.mesh.scale.setScalar(Math.max(0.01, 1 - progress));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function spawnBlockBarrier(position: T.Vector3) {
  const barrierGeo = new T.RingGeometry(0.2, 0.75, 6);
  const barrierMat = new T.MeshBasicMaterial({
    color: '#60a5fa',
    transparent: true,
    opacity: 0.85,
    side: T.DoubleSide,
    depthWrite: false,
  });
  const barrier = new T.Mesh(barrierGeo, barrierMat);
  barrier.position.copy(position);
  barrier.lookAt(camera.position);
  scene.add(barrier);

  const startTime = elapsed;
  const duration = 0.28;
  const tick = () => {
    const age = elapsed - startTime;
    const progress = age / duration;
    if (progress >= 1 || disposed) {
      scene.remove(barrier);
      barrierGeo.dispose();
      barrierMat.dispose();
      return;
    }
    barrier.scale.setScalar(1 + progress * 0.5);
    barrierMat.opacity = (1 - progress) * 0.85;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function triggerHitReaction(target: Fighter, hitDirection: T.Vector3, isCrit = false) {
  const hitClip = clip(target, 'hit');
  if (hitClip) play(target, 'hit', true);

  const recoilDist = isCrit ? 0.42 : 0.25;
  const recoilDir = hitDirection.clone().normalize().multiplyScalar(recoilDist);
  const startPos = target.root.position.clone();
  const recoilPos = startPos.clone().add(recoilDir);

  const staggerDuration = isCrit ? 0.26 : 0.18;
  void wait(staggerDuration, (t) => {
    const progress = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
    target.root.position.lerpVectors(startPos, recoilPos, progress);
  });

  const sparkPos = target.root.position.clone();
  sparkPos.y += target.height * 0.55;
  spawnHitSparks(sparkPos, isCrit ? '#fde047' : '#f97316', isCrit ? 16 : 10);
}

function triggerDodgeReaction(target: Fighter, attackDirection: T.Vector3) {
  if (target === player) {
    const dodgeClip = target.clips.find((c) => /Dodge_Backward/i.test(c.name));
    if (dodgeClip) playAction(target, dodgeClip, true);
  }

  const side = new T.Vector3(-attackDirection.z, 0, attackDirection.x).normalize().multiplyScalar(0.35);
  const back = attackDirection.clone().normalize().multiplyScalar(0.4);
  const dodgeVector = side.add(back);

  const startPos = target.root.position.clone();
  const dodgePos = startPos.clone().add(dodgeVector);

  void wait(0.32, (t) => {
    const progress = Math.sin(t * Math.PI);
    target.root.position.lerpVectors(startPos, dodgePos, progress);
  });
}

function triggerBlockReaction(target: Fighter, impactPoint: T.Vector3) {
  if (target === player) {
    const blockClip =
      target.clips.find((c) => c.name === 'knight_shield_block' || c.name === 'knight_block_2_weapon') ??
      target.clips.find((c) => /Block_Hit/i.test(c.name)) ??
      target.clips.find((c) => /Block$/i.test(c.name));
    if (blockClip) playAction(target, blockClip, true);
  }

  spawnBlockBarrier(impactPoint);

  const startPos = target.root.position.clone();
  const recoilPos = startPos.clone().add(new T.Vector3(0, 0, 0.12));
  void wait(0.2, (t) => {
    const progress = Math.sin(t * Math.PI);
    target.root.position.lerpVectors(startPos, recoilPos, progress);
  });
}

function createRuinColumn(height: number, isBroken = false): T.Group {
  const col = new T.Group();
  const stoneMat = new T.MeshStandardMaterial({
    color: isBroken ? '#46504a' : '#4d5751',
    roughness: 0.9,
    metalness: 0.08,
  });

  // Multi-tier square plinth
  const plinth = new T.Mesh(new T.BoxGeometry(1.4, 0.22, 1.4), stoneMat);
  const baseTorus = new T.Mesh(new T.CylinderGeometry(0.65, 0.72, 0.18, 16), stoneMat);
  baseTorus.position.y = 0.2;
  col.add(plinth, baseTorus);

  // Fluted column shaft
  const shaftHeight = isBroken ? height * 0.62 : height;
  const shaft = new T.Mesh(new T.CylinderGeometry(0.46, 0.54, shaftHeight, 16), stoneMat);
  shaft.position.y = 0.3 + shaftHeight / 2;
  col.add(shaft);

  if (!isBroken) {
    // Carved capital and abacus
    const capital = new T.Mesh(new T.CylinderGeometry(0.68, 0.48, 0.28, 16), stoneMat);
    capital.position.y = 0.3 + shaftHeight + 0.14;
    const abacus = new T.Mesh(new T.BoxGeometry(1.3, 0.24, 1.3), stoneMat);
    abacus.position.y = 0.3 + shaftHeight + 0.38;
    col.add(capital, abacus);
  } else {
    // Fractured crumbled top
    const fracture = new T.Mesh(new T.DodecahedronGeometry(0.44, 0), stoneMat);
    fracture.position.y = 0.3 + shaftHeight;
    fracture.scale.set(1.1, 0.6, 1.0);
    col.add(fracture);
  }

  col.traverse((obj) => {
    if (obj instanceof T.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return col;
}

function createBrazier(position: T.Vector3): Brazier {
  const group = new T.Group();
  group.position.copy(position);

  const stoneMat = new T.MeshStandardMaterial({ color: '#3d4540', roughness: 0.92 });
  const ironMat = new T.MeshStandardMaterial({ color: '#252928', metalness: 0.8, roughness: 0.35 });

  // Stone base pedestal
  const base = new T.Mesh(new T.CylinderGeometry(0.45, 0.55, 0.9, 8), stoneMat);
  base.position.y = 0.45;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Iron bowl
  const bowl = new T.Mesh(new T.CylinderGeometry(0.72, 0.4, 0.38, 12), ironMat);
  bowl.position.y = 1.02;
  bowl.castShadow = true;
  group.add(bowl);

  // Burning molten coal core
  const fireCore = new T.Mesh(new T.DodecahedronGeometry(0.38, 1), new T.MeshBasicMaterial({ color: '#ff6611' }));
  fireCore.position.y = 1.15;
  group.add(fireCore);

  // Flickering point light
  const light = new T.PointLight('#ff8833', 2.2, 22, 1.8);
  light.position.y = 1.6;
  light.castShadow = true;
  light.shadow.bias = -0.001;
  group.add(light);

  scene.add(group);

  return {
    light,
    fireCore,
    baseIntensity: 2.2,
    flickerSpeed: 10 + Math.random() * 5,
    phase: Math.random() * Math.PI * 2,
  };
}

function createCraggyBoulder(): T.Group {
  const rockGroup = new T.Group();
  const rockMat = new T.MeshStandardMaterial({
    color: '#4e5550',
    roughness: 0.95,
    metalness: 0.05,
  });

  const main = new T.Mesh(new T.DodecahedronGeometry(0.68, 1), rockMat);
  main.scale.set(1.0, 0.82, 0.95);
  main.rotation.set(0.2, 0.5, 0.1);
  main.castShadow = true;
  main.receiveShadow = true;
  rockGroup.add(main);

  const secondary = new T.Mesh(new T.DodecahedronGeometry(0.45, 0), rockMat);
  secondary.position.set(0.32, -0.15, 0.28);
  secondary.rotation.set(-0.3, 0.7, 0.4);
  secondary.castShadow = true;
  rockGroup.add(secondary);

  const tertiary = new T.Mesh(new T.DodecahedronGeometry(0.35, 0), rockMat);
  tertiary.position.set(-0.35, -0.2, -0.2);
  tertiary.castShadow = true;
  rockGroup.add(tertiary);

  return rockGroup;
}

function paint() {
  const arena = props.battle.arena;
  const interactive = !busy && !props.disabled && props.battle.status === 'ACTIVE';
  tileOverlays.forEach((overlay, cell) => {
    const reachable = arena.reachableCells.includes(cell) && !arena.blockedCells.includes(cell);
    overlay.mode = !interactive
      ? 'neutral'
      : cell === arena.monsterPosition
        ? arena.canAttack
          ? 'attackable'
          : 'monster'
        : cell === arena.playerPosition
          ? 'player'
          : reachable
            ? 'reachable'
            : 'neutral';
    const highlighted = cell === hoveredCell && (overlay.mode === 'reachable' || overlay.mode === 'attackable');
    const color = highlighted
      ? '#fff1b2'
      : overlay.mode === 'reachable'
        ? '#79e8d1'
        : overlay.mode === 'player'
          ? '#91cfff'
          : '#ff8178';
    overlay.mesh.visible = overlay.mode !== 'neutral';
    overlay.innerRune.visible = overlay.mode === 'reachable' || overlay.mode === 'attackable';
    overlay.material.color.set(color);
    overlay.material.opacity = highlighted ? 1 : 0.85;
    overlay.innerMaterial.color.set(color);
    overlay.innerMaterial.opacity = highlighted ? 0.48 : 0.22;
  });
}

async function replay(next: BattleState) {
  if (!player || !enemy || disposed) return;
  busy = true;
  emit('busy', true);
  paint();

  let deathStarted = false;
  let deathFinished: Promise<void> | undefined;
  for (const [eventIndex, event] of next.events.entries()) {
    if (disposed) return;
    const unit = event.actor === 'PLAYER' ? player : enemy;
    const target = event.actor === 'PLAYER' ? enemy : player;

    if (event.action === 'MOVE' && event.toCell !== undefined) {
      const destination = point(event.toCell);
      const start = unit.root.position.clone();
      if (start.distanceTo(destination) < 0.01) continue;

      play(unit, 'walk');
      const from = event.fromCell;
      const path =
        from === undefined
          ? [event.toCell]
          : battleMovementPath(from, event.toCell, next.arena.columns, next.arena.rows, next.arena.blockedCells);

      for (const cell of path) {
        if (disposed) return;
        const step = point(cell);
        const origin = unit.root.position.clone();

        const targetDir = step.clone().sub(origin);
        const targetAngle = Math.atan2(targetDir.x, targetDir.z);
        const startAngle = unit.root.rotation.y;
        let deltaAngle = (targetAngle - startAngle) % (Math.PI * 2);
        if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
        if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

        const moveDuration = Math.max(0.22, origin.distanceTo(step) / 3.9);
        await wait(moveDuration, (t) => {
          unit.root.position.lerpVectors(origin, step, t);
          const turnProgress = Math.min(1, t / 0.35);
          unit.root.rotation.y = startAngle + deltaAngle * smoothStep(turnProgress);
        });
        unit.root.position.copy(step);
      }
    } else if (event.action === 'DEFEND') {
      const block =
        unit.clips.find(
          (entry) => entry.name === (props.handMode === 'DUAL' ? 'knight_block_2_weapon' : 'knight_shield_block')
        ) ?? unit.clips.find((entry) => entry.name === 'Block');
      if (block) {
        unit.current?.fadeOut(0.1);
        unit.current = unit.mixer.clipAction(block).reset().setLoop(T.LoopOnce, 1).play();
      }
      addFloatingText(
        'DEFENDING',
        'block',
        unit.root.position.clone().add(new T.Vector3(0, unit.height * 0.85 + 0.3, 0))
      );
      await wait(0.35);
    } else {
      face(unit, target.root.position);
      const isPower = event.action === 'POWER_ATTACK';
      const attackClip = unit === player ? selectPlayerAttackClip(isPower) : clip(unit, 'attack');
      const timing = attackTiming(attackClip?.name ?? '', isPower);
      const duration = playAction(unit, attackClip, true, timing.duration);

      // Melee combat lunge towards target
      const homePos = unit.root.position.clone();
      const targetPos = target.root.position.clone();
      const toTarget = targetPos.clone().sub(homePos);
      const dist = toTarget.length();
      const lungeVector = toTarget.normalize().multiplyScalar(Math.min(isPower ? 0.52 : 0.32, dist * 0.2));
      const lungePeak = homePos.clone().add(lungeVector);

      const strikePoint = timing.impact;
      await wait(duration * strikePoint, (t) => {
        unit.root.position.copy(homePos).addScaledVector(lungeVector, attackOffset(t * strikePoint, strikePoint));
      });

      const impactPoint = lungePeak.clone().add(targetPos).multiplyScalar(0.5);
      impactPoint.y += target.height * 0.5;

      const textPos = target.root.position.clone().add(new T.Vector3(0, target.height * 0.85 + 0.35, 0));
      const killingBlow =
        eventIndex === next.events.length - 1 &&
        !event.dodged &&
        !event.blocked &&
        (event.damage ?? 0) > 0 &&
        ((next.status === 'VICTORY' && target === enemy) || (next.status === 'DEFEAT' && target === player));

      if (event.dodged) {
        triggerDodgeReaction(target, toTarget);
        addFloatingText('DODGED!', 'dodge', textPos);
      } else if (event.blocked) {
        triggerBlockReaction(target, impactPoint);
        addFloatingText('BLOCKED!', 'block', textPos);
      } else {
        if (killingBlow) {
          deathStarted = true;
          deathFinished = wait(play(target, 'death', true));
          spawnHitSparks(impactPoint, '#fbc879', 12);
        } else {
          triggerHitReaction(target, toTarget, event.critical || isPower);
        }
        const dmg = event.damage ?? 0;
        const text = event.critical ? `CRIT! -${dmg}` : isPower ? `HEAVY! -${dmg}` : `-${dmg}`;
        const type = event.critical || isPower ? 'crit' : 'damage';
        addFloatingText(text, type, textPos);
        if (event.critical || isPower) {
          shakeIntensity = 0.22;
        }
      }

      await wait(duration * (1 - strikePoint), (t) => {
        unit.root.position
          .copy(homePos)
          .addScaledVector(lungeVector, attackOffset(strikePoint + t * (1 - strikePoint), strikePoint));
      });
      unit.root.position.copy(homePos);

      if (!killingBlow) play(target, 'idle');
    }
    play(unit, 'idle');
  }

  player.root.position.copy(point(next.arena.playerPosition));
  enemy.root.position.copy(point(next.arena.monsterPosition));
  face(player, enemy.root.position);
  face(enemy, player.root.position);

  if (deathFinished) await deathFinished;
  if (next.status !== 'ACTIVE' && !deathStarted) {
    const fallen = next.status === 'VICTORY' ? enemy : player;
    await wait(play(fallen, 'death', true));
  }

  if (disposed) return;
  busy = false;
  emit('busy', false);
  paint();
}

let sequence = Promise.resolve();
watch(
  () => props.battle,
  (next) => {
    busy = true;
    emit('busy', true);
    sequence = sequence.then(() => replay(next));
  },
  { flush: 'sync' }
);

function pointerRay(event: PointerEvent) {
  const bounds = renderer!.domElement.getBoundingClientRect();
  const ray = new T.Raycaster();
  ray.setFromCamera(
    new T.Vector2(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      1 - ((event.clientY - bounds.top) / bounds.height) * 2
    ),
    camera
  );
  return ray;
}

function clearHover() {
  hoveredCell = -1;
  if (renderer) renderer.domElement.style.cursor = '';
}

function hover(event: PointerEvent) {
  clearHover();
  if (!renderer || event.buttons || busy || props.disabled || props.battle.status !== 'ACTIVE') return;
  const ray = pointerRay(event);
  const hit = ray.intersectObjects(tiles)[0];
  const cell = hit ? tiles.indexOf(hit.object as (typeof tiles)[number]) : -1;
  const arena = props.battle.arena;
  if (enemy && arena.canAttack && ray.intersectObject(enemy.root, true).length) {
    hoveredCell = arena.monsterPosition;
  } else if (
    (arena.reachableCells.includes(cell) && !arena.blockedCells.includes(cell)) ||
    (cell === arena.monsterPosition && arena.canAttack)
  ) {
    hoveredCell = cell;
  }
  renderer.domElement.style.cursor = hoveredCell >= 0 ? 'pointer' : '';
}

function select(event: PointerEvent) {
  if (event.button !== 0) return;
  if (!renderer || busy || props.disabled || props.battle.status !== 'ACTIVE') return;
  const ray = pointerRay(event);
  if (enemy && ray.intersectObject(enemy.root, true).length && props.battle.arena.canAttack) {
    emit('attack');
    return;
  }
  const hit = ray.intersectObjects(tiles)[0];
  const cell = hit ? tiles.indexOf(hit.object as (typeof tiles)[number]) : -1;
  if (cell === props.battle.arena.monsterPosition && props.battle.arena.canAttack) emit('attack');
  else if (props.battle.arena.reachableCells.includes(cell)) emit('move', cell);
}

onMounted(async () => {
  emit('busy', true);
  try {
    renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    host.value!.appendChild(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minDistance = 8;
    controls.maxDistance = 35;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 2.6;
    controls.mouseButtons = { LEFT: undefined, MIDDLE: T.MOUSE.DOLLY, RIGHT: T.MOUSE.ROTATE };
    renderer.domElement.addEventListener('pointerup', select);
    renderer.domElement.addEventListener('pointermove', hover);
    renderer.domElement.addEventListener('pointerleave', clearHover);

    // 1. Rich Atmospheric Lighting
    scene.add(new T.HemisphereLight('#829fb0', '#2d281f', 1.8));

    const sun = new T.DirectionalLight('#ffe2b5', 2.8);
    sun.position.set(-8, 16, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0003;
    Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18 });
    scene.add(sun);

    // Electric cyan/blue rim light from rear-left to make 3D model silhouettes pop
    const rimLight = new T.DirectionalLight('#b5c3cc', 1.2);
    rimLight.position.set(12, 10, -12);
    scene.add(rimLight);

    // Deep mystical fog
    scene.fog = new T.FogExp2('#0e171a', 0.015);

    const { columns, rows, blockedCells } = props.battle.arena;

    // 2. Multi-tiered Arena Terrain & Elevated Stone Dais
    const daisWidth = columns * 1.85 + 4;
    const daisDepth = rows * 1.6 + 4;
    const daisMesh = new T.Mesh(
      new T.BoxGeometry(daisWidth, 0.45, daisDepth),
      new T.MeshStandardMaterial({ color: '#252e2b', roughness: 0.95, metalness: 0.05 })
    );
    daisMesh.position.set(0, -0.15, 0);
    daisMesh.receiveShadow = true;
    // Continuous terrain replaces the raised tabletop. The tactical grid is an overlay only.
    daisMesh.geometry.dispose();
    daisMesh.material.dispose();

    // Lower natural rugged terrain
    const terrain = new T.Mesh(
      new T.PlaneGeometry(160, 160, 24, 24),
      new T.MeshStandardMaterial({ color: '#131b19', roughness: 0.98 })
    );
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = 0.09;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // 3. Four Corner Fire Braziers with Dynamic Firelight & Embers
    const brazierPositions = [
      new T.Vector3(-daisWidth * 0.48, -0.15, -daisDepth * 0.48),
      new T.Vector3(daisWidth * 0.48, -0.15, -daisDepth * 0.48),
      new T.Vector3(-daisWidth * 0.48, -0.15, daisDepth * 0.48),
      new T.Vector3(daisWidth * 0.48, -0.15, daisDepth * 0.48),
    ];
    for (const bPos of brazierPositions) {
      braziers.push(createBrazier(bPos));
    }

    // 4. Weathered Classical Ruin Columns with Fluting and Ornate Capitals
    const columnPositions = [
      { pos: new T.Vector3(-daisWidth * 0.42, -0.15, -daisDepth * 0.52 - 1.2), h: 3.2, broken: false },
      { pos: new T.Vector3(-daisWidth * 0.15, -0.15, -daisDepth * 0.52 - 1.2), h: 2.6, broken: true },
      { pos: new T.Vector3(daisWidth * 0.15, -0.15, -daisDepth * 0.52 - 1.2), h: 3.4, broken: false },
      { pos: new T.Vector3(daisWidth * 0.42, -0.15, -daisDepth * 0.52 - 1.2), h: 2.3, broken: true },
      { pos: new T.Vector3(-daisWidth * 0.42, -0.15, daisDepth * 0.52 + 1.2), h: 2.4, broken: true },
      { pos: new T.Vector3(-daisWidth * 0.15, -0.15, daisDepth * 0.52 + 1.2), h: 3.3, broken: false },
      { pos: new T.Vector3(daisWidth * 0.15, -0.15, daisDepth * 0.52 + 1.2), h: 2.7, broken: true },
      { pos: new T.Vector3(daisWidth * 0.42, -0.15, daisDepth * 0.52 + 1.2), h: 3.5, broken: false },
    ];
    for (const c of columnPositions.filter((column) => column.pos.z < 0)) {
      const col = createRuinColumn(c.h, c.broken);
      col.position.copy(c.pos);
      scene.add(col);
    }

    // Natural PBR ground beneath the optional tactical overlays.
    const groundLoader = new T.TextureLoader();
    const [groundColor, groundNormal] = await Promise.all([
      groundLoader.loadAsync('/models/battle/terrain/forest-floor-color.jpg'),
      groundLoader.loadAsync('/models/battle/terrain/forest-floor-normal.jpg'),
    ]);
    if (disposed) {
      groundColor.dispose();
      groundNormal.dispose();
      return;
    }
    for (const texture of [groundColor, groundNormal]) {
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      texture.repeat.set(48, 48);
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    }
    groundColor.colorSpace = T.SRGBColorSpace;
    terrain.material.map = groundColor;
    terrain.material.bumpMap = null;
    terrain.material.normalMap = groundNormal;
    terrain.material.normalScale.set(0.6, 0.6);
    terrain.material.color.set('#b4b2a5');
    terrain.material.needsUpdate = true;

    for (let cell = 0; cell < columns * rows; cell++) {
      const slabMat = new T.MeshStandardMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        roughness: 0.86,
        metalness: 0.08,
      });

      // Carved stone slab
      const tile = new T.Mesh(new T.CylinderGeometry(0.98, 1.02, 0.22, 6), slabMat);
      tile.position.copy(point(cell));
      tile.position.y = 0.01;
      tile.receiveShadow = false;
      tiles.push(tile);
      scene.add(tile);

      // Inlaid outer rune border overlay
      const runeGeo = new T.RingGeometry(0.9, 0.98, 6);
      runeGeo.rotateX(-Math.PI / 2);
      runeGeo.rotateY(Math.PI / 6);
      const runeMat = new T.MeshBasicMaterial({
        color: '#2dd4bf',
        transparent: true,
        opacity: 0,
        toneMapped: false,
        depthWrite: false,
      });
      const runeMesh = new T.Mesh(runeGeo, runeMat);
      runeMesh.position.copy(point(cell));
      runeMesh.position.y = 0.125;
      scene.add(runeMesh);

      // Inlaid inner rune circle
      const innerGeo = new T.RingGeometry(0, 0.9, 6);
      innerGeo.rotateX(-Math.PI / 2);
      innerGeo.rotateY(Math.PI / 6);
      const innerMat = new T.MeshBasicMaterial({
        color: '#5eead4',
        transparent: true,
        opacity: 0,
        toneMapped: false,
        depthWrite: false,
      });
      const innerRune = new T.Mesh(innerGeo, innerMat);
      innerRune.visible = false;
      innerRune.position.copy(point(cell));
      innerRune.position.y = 0.126;
      scene.add(innerRune);

      tileOverlays.push({
        mesh: runeMesh,
        innerRune,
        material: runeMat,
        innerMaterial: innerMat,
        mode: 'neutral',
      });

      // Craggy natural rock clusters on blocked cells
      if (blockedCells.includes(cell)) {
        const boulder = createCraggyBoulder();
        boulder.position.copy(point(cell));
        boulder.position.y = 0.42;
        scene.add(boulder);
      }
    }

    // 6. Rising Embers & Floating Atmosphere Particles
    const emberCount = 80;
    const emberGeo = new T.BufferGeometry();
    emberPositions = new Float32Array(emberCount * 3);
    emberVelocities = new Float32Array(emberCount * 3);

    for (let i = 0; i < emberCount; i++) {
      const bIdx = i % 4;
      const bCenter = brazierPositions[bIdx];
      emberPositions[i * 3] = bCenter.x + (Math.random() - 0.5) * 1.8;
      emberPositions[i * 3 + 1] = 1.0 + Math.random() * 4.5;
      emberPositions[i * 3 + 2] = bCenter.z + (Math.random() - 0.5) * 1.8;

      emberVelocities[i * 3] = (Math.random() - 0.5) * 0.4;
      emberVelocities[i * 3 + 1] = 0.8 + Math.random() * 1.2;
      emberVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    emberGeo.setAttribute('position', new T.BufferAttribute(emberPositions, 3));
    const emberMat = new T.PointsMaterial({
      color: '#ff9922',
      size: 0.14,
      transparent: true,
      opacity: 0.85,
      blending: T.AdditiveBlending,
      depthWrite: false,
    });
    emberPoints = new T.Points(emberGeo, emberMat);
    scene.add(emberPoints);

    const resize = () => {
      if (!host.value || !renderer) return;
      const { width, height } = host.value.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(1, height);
      const distance = Math.max((columns * 2.9) / camera.aspect, rows * 2.7, 15);
      camera.position.set(distance * 0.08, distance * 0.53, distance * 0.82);
      controls!.target.set(0, 0.7, 0);
      controls!.update();
      camera.updateProjectionMatrix();
    };

    observer = new ResizeObserver(resize);
    observer.observe(host.value!);
    resize();

    let previous = performance.now();
    const render = (now: number) => {
      if (disposed) return;
      const delta = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      elapsed += delta;

      player?.mixer.update(delta);
      enemy?.mixer.update(delta);

      // Stance ring subtle pulse
      if (player?.stanceRing) {
        player.stanceRing.scale.setScalar(1 + Math.sin(elapsed * 2.6) * 0.04);
      }
      if (enemy?.stanceRing) {
        enemy.stanceRing.scale.setScalar(1 + Math.sin(elapsed * 3.2) * 0.05);
      }

      // Brazier light flicker & flame core animation
      for (const b of braziers) {
        const flicker =
          Math.sin(elapsed * b.flickerSpeed + b.phase) * 0.35 + Math.cos(elapsed * (b.flickerSpeed * 0.65)) * 0.22;
        b.light.intensity = b.baseIntensity + flicker;
        b.fireCore.scale.setScalar(1.0 + flicker * 0.08);
      }

      // Rising embers particle movement
      if (emberPositions && emberVelocities && emberPoints) {
        for (let i = 0; i < emberCount; i++) {
          emberPositions[i * 3] += emberVelocities[i * 3] * delta;
          emberPositions[i * 3 + 1] += emberVelocities[i * 3 + 1] * delta;
          emberPositions[i * 3 + 2] += emberVelocities[i * 3 + 2] * delta;

          // Recycle ember when it drifts too high
          if (emberPositions[i * 3 + 1] > 6.0) {
            const bIdx = i % 4;
            const bCenter = brazierPositions[bIdx];
            emberPositions[i * 3] = bCenter.x + (Math.random() - 0.5) * 1.4;
            emberPositions[i * 3 + 1] = 1.1;
            emberPositions[i * 3 + 2] = bCenter.z + (Math.random() - 0.5) * 1.4;
          }
        }
        emberPoints.geometry.attributes.position.needsUpdate = true;
      }

      paint();
      controls?.update();

      // Render-only shake: never accumulate offsets into the orbit camera.
      const cameraPosition = camera.position.clone();
      if (shakeIntensity > 0.005) {
        const ox = (Math.random() - 0.5) * shakeIntensity * 1.4;
        const oy = (Math.random() - 0.5) * shakeIntensity * 1.4;
        camera.position.x += ox;
        camera.position.y += oy;
        shakeIntensity *= 0.82;
      }

      for (const task of waits) {
        task.tick?.(Math.min(1, (elapsed - task.start) / (task.end - task.start)));
        if (elapsed >= task.end) {
          waits.delete(task);
          task.resolve();
        }
      }
      updateEquipment();

      // Project floating combat text positions to 2D screen coordinates
      if (host.value && floatingTexts.value.length) {
        const { width, height } = host.value.getBoundingClientRect();
        const nowMs = performance.now();
        floatingTexts.value = floatingTexts.value.filter((item) => {
          const age = (nowMs - item.startTime) / 1000;
          if (age > 1.2) return false;
          const v = item.worldPos.clone().project(camera);
          item.x = (v.x + 1) * 0.5 * width;
          item.y = (-v.y + 1) * 0.5 * height;
          item.offsetY = -age * 48;
          item.opacity = Math.max(0, 1 - Math.pow(age / 1.2, 2));
          if (item.type === 'crit' && age < 0.25) {
            item.scale = 1.4 - (age / 0.25) * 0.2;
          }
          return true;
        });
      }

      renderer!.render(scene, camera);
      camera.position.copy(cameraPosition);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    const monsterModel = battleMonsterModel(props.battle.monsterType, props.battle.monster.name);
    [player, enemy] = await Promise.all([
      fighter('solus-knight', 2.5, true),
      fighter(monsterModel.file, monsterModel.height, false),
    ]);
    if (disposed) return;

    const mode = props.handMode ?? 'TWO_HANDED';
    const equipment: Record<string, boolean> = {
      '1H_Sword': ['SINGLE', 'DUAL', 'WEAPON_SHIELD'].includes(mode),
      '1H_Sword_Offhand': mode === 'DUAL',
      '2H_Sword': mode === 'TWO_HANDED',
      Badge_Shield: mode === 'WEAPON_SHIELD',
      Rectangle_Shield: false,
      Round_Shield: false,
      Spike_Shield: false,
    };
    player.root.traverse((object) => {
      if (object.name in equipment) object.visible = equipment[object.name]!;
    });
    equipPlayer();
    enemy.root.children[0]!.rotation.y = monsterModel.facing ?? 0;

    player.root.position.copy(point(props.battle.arena.playerPosition));
    enemy.root.position.copy(point(props.battle.arena.monsterPosition));
    face(player, enemy.root.position);
    face(enemy, player.root.position);
    play(player, 'idle');
    play(enemy, 'idle');

    if (props.battle.status !== 'ACTIVE') play(props.battle.status === 'VICTORY' ? enemy : player, 'death', true);
    message.value = '';
    busy = false;
    emit('busy', false);
    paint();
  } catch (error) {
    if (disposed) return;
    console.error('3D battlefield could not load', error);
    failed.value = true;
    message.value = 'The 3D battlefield could not load. Reload to retry, or return to quick battle.';
    emit('busy', false);
  }
});

function release(root: T.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof T.Mesh)) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      for (const value of Object.values(material)) if (value instanceof T.Texture) value.dispose();
      material.dispose();
    }
  });
}

onBeforeUnmount(() => {
  disposed = true;
  cancelAnimationFrame(frame);
  observer?.disconnect();
  controls?.dispose();
  for (const task of waits) task.resolve();
  waits.clear();
  player?.mixer.stopAllAction();
  enemy?.mixer.stopAllAction();
  release(scene);
  renderer?.domElement.removeEventListener('pointerup', select);
  renderer?.domElement.removeEventListener('pointermove', hover);
  renderer?.domElement.removeEventListener('pointerleave', clearHover);
  renderer?.dispose();
});
</script>

<style scoped>
.battle-scene {
  position: absolute;
  inset: 0;
}
.camera-hint,
.asset-credits {
  position: absolute;
  z-index: 2;
  bottom: 0.6rem;
  color: #d4c9b1;
  font-size: 0.7rem;
  text-shadow: 0 1px 3px #000;
}
.camera-hint {
  left: 1rem;
  pointer-events: none;
}
.asset-credits {
  right: 1rem;
}
.battle-scene :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
.scene-message {
  position: absolute;
  z-index: 2;
  inset: 45% 10% auto;
  text-align: center;
  color: #ffe8ad;
  background: #10252be6;
  padding: 1rem;
  border-radius: 1rem;
}
.scene-message button {
  display: block;
  margin: 1rem auto 0;
  text-decoration: underline;
  cursor: pointer;
}

.combat-floating-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 10;
}
.floating-combat-text {
  position: absolute;
  font-family: inherit;
  font-weight: 900;
  letter-spacing: 0.05em;
  user-select: none;
  white-space: nowrap;
  pointer-events: none;
  will-change: transform, opacity;
}
.floating-combat-text--damage {
  font-size: 1.55rem;
  color: #fca5a5;
  text-shadow:
    0 0 8px rgba(239, 68, 68, 0.85),
    0 2px 4px rgba(0, 0, 0, 0.95);
}
.floating-combat-text--crit {
  font-size: 2rem;
  color: #fef08a;
  text-shadow:
    0 0 16px rgba(234, 179, 8, 1),
    0 2px 6px rgba(0, 0, 0, 0.95);
}
.floating-combat-text--dodge {
  font-size: 1.45rem;
  color: #67e8f9;
  text-shadow:
    0 0 12px rgba(6, 182, 212, 0.9),
    0 2px 4px rgba(0, 0, 0, 0.95);
}
.floating-combat-text--block {
  font-size: 1.45rem;
  color: #93c5fd;
  text-shadow:
    0 0 12px rgba(59, 130, 246, 0.9),
    0 2px 4px rgba(0, 0, 0, 0.95);
}
</style>
