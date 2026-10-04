<template>
  <div ref="host" class="battle-scene" aria-label="3D tactical battlefield">
    <div v-if="message" class="scene-message" role="status">
      <div>{{ message }}</div>
      <button v-if="failed" type="button" @click="emit('fallback')">Return to quick battle</button>
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
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

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
  mesh: T.Mesh<T.RingGeometry, T.MeshStandardMaterial>;
  innerRune: T.Mesh<T.RingGeometry, T.MeshStandardMaterial>;
  material: T.MeshStandardMaterial;
  innerMaterial: T.MeshStandardMaterial;
  mode: 'neutral' | 'reachable' | 'player' | 'monster' | 'attackable';
};
const tileOverlays: TileOverlay[] = [];

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

function createStoneTextures(): { map: T.CanvasTexture; bump: T.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bCtx = bumpCanvas.getContext('2d')!;

  // 1. Dark weathered granite base
  const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 300);
  grad.addColorStop(0, '#2c3532');
  grad.addColorStop(0.6, '#212927');
  grad.addColorStop(1, '#171e1c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 512, 512);

  // 2. Micro stone grain and chisel noise
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const bumpData = bCtx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  const bData = bumpData.data;

  let s = 12345;
  function rnd() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  }

  for (let i = 0; i < data.length; i += 4) {
    const n = (rnd() - 0.5) * 26;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n * 1.05));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 0.95));

    bData[i] = Math.min(255, Math.max(0, 128 + n * 2.8));
    bData[i + 1] = bData[i];
    bData[i + 2] = bData[i];
  }
  ctx.putImageData(imgData, 0, 0);
  bCtx.putImageData(bumpData, 0, 0);

  // 3. Hexagon border bevel lines
  ctx.save();
  ctx.translate(256, 256);
  bCtx.save();
  bCtx.translate(256, 256);

  function drawHexPath(context: CanvasRenderingContext2D, radius: number) {
    context.beginPath();
    for (let a = 0; a < 6; a++) {
      const angle = (a * Math.PI) / 3;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (a === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
  }

  // Outer bevel shadow
  drawHexPath(ctx, 240);
  ctx.lineWidth = 14;
  ctx.strokeStyle = 'rgba(8, 12, 11, 0.65)';
  ctx.stroke();

  // Inner beveled highlight line
  drawHexPath(ctx, 226);
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(95, 128, 118, 0.35)';
  ctx.stroke();

  drawHexPath(bCtx, 235);
  bCtx.lineWidth = 14;
  bCtx.strokeStyle = 'rgb(30, 30, 30)';
  bCtx.stroke();

  ctx.restore();
  bCtx.restore();

  const map = new T.CanvasTexture(canvas);
  map.wrapS = T.RepeatWrapping;
  map.wrapT = T.RepeatWrapping;

  const bump = new T.CanvasTexture(bumpCanvas);
  bump.wrapS = T.RepeatWrapping;
  bump.wrapT = T.RepeatWrapping;

  return { map, bump };
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
  const geometry = new T.RingGeometry(radius * 0.76, radius, 32);
  geometry.rotateX(-Math.PI / 2);
  const material = new T.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.65,
    side: T.DoubleSide,
    depthWrite: false,
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.position.y = 0.02;
  return mesh;
}

function resolveModelPath(file: string): string {
  if (file.includes('/')) return file;
  if (file.startsWith('kaykit-') || file === 'demon' || file === 'ghost') return file;
  return `creatures/${file}`;
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
  const idle = gltf.animations.find((animation) => /Idle$/i.test(animation.name)) ?? gltf.animations[0];
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
      idle: mode === 'TWO_HANDED' ? '2H_Melee_Idle' : mode === 'UNARMED' ? 'Unarmed_Idle' : 'Idle',
      walk: 'Walking_A',
      attack:
        mode === 'TWO_HANDED'
          ? '2H_Melee_Attack_Slice'
          : mode === 'DUAL'
            ? 'Dualwield_Melee_Attack_Slice'
            : mode === 'UNARMED'
              ? 'Unarmed_Melee_Attack_Punch_A'
              : '1H_Melee_Attack_Slice_Diagonal',
      death: 'Death_A',
      hit: 'Hit_A',
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
  const mode = props.handMode ?? 'TWO_HANDED';

  if (isPower) {
    const powerClip =
      mode === 'TWO_HANDED'
        ? player.clips.find((c) => /2H_Melee_Attack_Spin/i.test(c.name)) ??
          player.clips.find((c) => /2H_Melee_Attack_Chop/i.test(c.name))
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

function playAction(unit: Fighter, animation: T.AnimationClip | undefined, once = false) {
  if (!animation) return 0.6;
  const action = unit.mixer.clipAction(animation);
  if (unit.current !== action) unit.current?.fadeOut(0.1);
  action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
  action.setLoop(once ? T.LoopOnce : T.LoopRepeat, once ? 1 : Infinity);
  action.clampWhenFinished = once;
  action.fadeIn(0.1).play();
  unit.current = action;
  return animation.duration;
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
      target.clips.find((c) => /Block_Hit/i.test(c.name)) ?? target.clips.find((c) => /Block$/i.test(c.name));
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
  const fireCore = new T.Mesh(
    new T.DodecahedronGeometry(0.38, 1),
    new T.MeshBasicMaterial({ color: '#ff6611' })
  );
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
  tileOverlays.forEach((overlay, cell) => {
    if (cell === arena.monsterPosition) {
      overlay.mode = arena.canAttack ? 'attackable' : 'monster';
      overlay.material.opacity = arena.canAttack ? 0.95 : 0.75;
      overlay.material.emissive.set(arena.canAttack ? '#ef4444' : '#f87171');
      overlay.material.color.set(arena.canAttack ? '#b91c1c' : '#991b1b');
      overlay.innerMaterial.opacity = arena.canAttack ? 0.9 : 0.65;
      overlay.innerMaterial.emissive.set(arena.canAttack ? '#fca5a5' : '#f87171');
    } else if (cell === arena.playerPosition) {
      overlay.mode = 'player';
      overlay.material.opacity = 0.85;
      overlay.material.emissive.set('#38bdf8');
      overlay.material.color.set('#0284c7');
      overlay.innerMaterial.opacity = 0.75;
      overlay.innerMaterial.emissive.set('#7dd3fc');
    } else if (!busy && arena.reachableCells.includes(cell)) {
      overlay.mode = 'reachable';
      overlay.material.opacity = 0.78;
      overlay.material.emissive.set('#2dd4bf');
      overlay.material.color.set('#0d9488');
      overlay.innerMaterial.opacity = 0.65;
      overlay.innerMaterial.emissive.set('#5eead4');
    } else {
      overlay.mode = 'neutral';
      overlay.material.opacity = 0;
      overlay.material.emissive.set('#000000');
      overlay.innerMaterial.opacity = 0;
      overlay.innerMaterial.emissive.set('#000000');
    }
  });
}

async function replay(next: BattleState) {
  if (!player || !enemy || disposed) return;
  busy = true;
  emit('busy', true);
  paint();

  for (const event of next.events) {
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
          unit.root.rotation.y = startAngle + deltaAngle * turnProgress;
        });
        unit.root.position.copy(step);
      }
    } else if (event.action === 'DEFEND') {
      const block = unit.clips.find((entry) => entry.name === 'Block');
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
      const duration = playAction(unit, attackClip, true);

      // Melee combat lunge towards target
      const homePos = unit.root.position.clone();
      const targetPos = target.root.position.clone();
      const toTarget = targetPos.clone().sub(homePos);
      const dist = toTarget.length();
      const lungeVector = toTarget.normalize().multiplyScalar(Math.min(0.85, dist * 0.44));
      const lungePeak = homePos.clone().add(lungeVector);

      const strikePoint = 0.45;
      await wait(duration * strikePoint, (t) => {
        const ease = Math.sin(t * Math.PI * 0.5);
        unit.root.position.lerpVectors(homePos, lungePeak, ease);
      });

      const impactPoint = lungePeak.clone().add(targetPos).multiplyScalar(0.5);
      impactPoint.y += target.height * 0.5;

      const textPos = target.root.position.clone().add(new T.Vector3(0, target.height * 0.85 + 0.35, 0));

      if (event.dodged) {
        triggerDodgeReaction(target, toTarget);
        addFloatingText('DODGED!', 'dodge', textPos);
      } else if (event.blocked) {
        triggerBlockReaction(target, impactPoint);
        addFloatingText('BLOCKED!', 'block', textPos);
      } else {
        triggerHitReaction(target, toTarget, event.critical || isPower);
        const dmg = event.damage ?? 0;
        const text = event.critical ? `CRIT! -${dmg}` : isPower ? `HEAVY! -${dmg}` : `-${dmg}`;
        const type = event.critical || isPower ? 'crit' : 'damage';
        addFloatingText(text, type, textPos);
        if (event.critical || isPower) {
          shakeIntensity = 0.22;
        }
      }

      await wait(duration * (1 - strikePoint), (t) => {
        const ease = Math.sin(t * Math.PI * 0.5);
        unit.root.position.lerpVectors(lungePeak, homePos, ease);
      });
      unit.root.position.copy(homePos);

      play(target, 'idle');
    }
    play(unit, 'idle');
  }

  player.root.position.copy(point(next.arena.playerPosition));
  enemy.root.position.copy(point(next.arena.monsterPosition));
  face(player, enemy.root.position);
  face(enemy, player.root.position);

  if (next.status !== 'ACTIVE') {
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

function select(event: PointerEvent) {
  if (!renderer || busy || props.disabled || props.battle.status !== 'ACTIVE') return;
  const bounds = renderer.domElement.getBoundingClientRect();
  const ray = new T.Raycaster();
  ray.setFromCamera(
    new T.Vector2(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      1 - ((event.clientY - bounds.top) / bounds.height) * 2
    ),
    camera
  );
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
    renderer.domElement.addEventListener('pointerup', select);

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
    const rimLight = new T.DirectionalLight('#38bdf8', 2.4);
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
    scene.add(daisMesh);

    // Lower natural rugged terrain
    const terrain = new T.Mesh(
      new T.PlaneGeometry(160, 160, 24, 24),
      new T.MeshStandardMaterial({ color: '#131b19', roughness: 0.98 })
    );
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -0.38;
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
    for (const c of columnPositions) {
      const col = createRuinColumn(c.h, c.broken);
      col.position.copy(c.pos);
      scene.add(col);
    }

    // 5. Procedural Stone Flagstones and Inlaid Magic Runes
    const { map: stoneMap, bump: stoneBump } = createStoneTextures();

    for (let cell = 0; cell < columns * rows; cell++) {
      const slabMat = new T.MeshStandardMaterial({
        map: stoneMap,
        bumpMap: stoneBump,
        bumpScale: 0.05,
        roughness: 0.86,
        metalness: 0.08,
      });

      // Carved stone slab
      const tile = new T.Mesh(new T.CylinderGeometry(0.98, 1.02, 0.22, 6), slabMat);
      tile.position.copy(point(cell));
      tile.position.y = 0.01;
      tile.receiveShadow = true;
      tiles.push(tile);
      scene.add(tile);

      // Inlaid outer rune border overlay
      const runeGeo = new T.RingGeometry(0.74, 0.96, 6);
      runeGeo.rotateX(-Math.PI / 2);
      runeGeo.rotateY(Math.PI / 6);
      const runeMat = new T.MeshStandardMaterial({
        color: '#2dd4bf',
        emissive: '#14b8a6',
        emissiveIntensity: 0,
        transparent: true,
        opacity: 0,
        roughness: 0.2,
        depthWrite: false,
      });
      const runeMesh = new T.Mesh(runeGeo, runeMat);
      runeMesh.position.copy(point(cell));
      runeMesh.position.y = 0.125;
      scene.add(runeMesh);

      // Inlaid inner rune circle
      const innerGeo = new T.RingGeometry(0.36, 0.44, 6);
      innerGeo.rotateX(-Math.PI / 2);
      innerGeo.rotateY(Math.PI / 6);
      const innerMat = new T.MeshStandardMaterial({
        color: '#5eead4',
        emissive: '#2dd4bf',
        emissiveIntensity: 0,
        transparent: true,
        opacity: 0,
        roughness: 0.2,
        depthWrite: false,
      });
      const innerRune = new T.Mesh(innerGeo, innerMat);
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
      camera.position.set(0, distance * 0.72, distance * 0.88);
      camera.lookAt(0, 0.4, 0);
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
          Math.sin(elapsed * b.flickerSpeed + b.phase) * 0.35 +
          Math.cos(elapsed * (b.flickerSpeed * 0.65)) * 0.22;
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

      // Enchanted tile rune pulse
      const pulse = (Math.sin(elapsed * 3.8) + 1) * 0.5;
      for (const overlay of tileOverlays) {
        if (overlay.mode === 'reachable') {
          overlay.material.emissiveIntensity = 0.65 + pulse * 0.55;
          overlay.material.opacity = 0.55 + pulse * 0.28;
          overlay.innerMaterial.emissiveIntensity = 0.8 + pulse * 0.5;
          overlay.innerMaterial.opacity = 0.6 + pulse * 0.25;
        } else if (overlay.mode === 'attackable') {
          overlay.material.emissiveIntensity = 0.95 + pulse * 0.85;
          overlay.material.opacity = 0.75 + pulse * 0.25;
          overlay.innerMaterial.emissiveIntensity = 1.2 + pulse * 0.8;
          overlay.innerMaterial.opacity = 0.8 + pulse * 0.2;
        } else if (overlay.mode === 'player') {
          overlay.material.emissiveIntensity = 0.8 + Math.sin(elapsed * 2.5) * 0.2;
        } else if (overlay.mode === 'monster') {
          overlay.material.emissiveIntensity = 0.7 + Math.sin(elapsed * 2.5) * 0.2;
        }
      }

      // Camera screen shake on critical hits
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

      // Project floating combat text positions to 2D screen coordinates
      if (host.value && floatingTexts.value.length) {
        const { width, height } = host.value.getBoundingClientRect();
        const nowMs = performance.now();
        floatingTexts.value = floatingTexts.value.filter((item) => {
          const age = (nowMs - item.startTime) / 1000;
          if (age > 1.2) return false;
          const v = item.worldPos.clone().project(camera);
          item.x = ((v.x + 1) * 0.5) * width;
          item.y = ((-v.y + 1) * 0.5) * height;
          item.offsetY = -age * 48;
          item.opacity = Math.max(0, 1 - Math.pow(age / 1.2, 2));
          if (item.type === 'crit' && age < 0.25) {
            item.scale = 1.4 - (age / 0.25) * 0.2;
          }
          return true;
        });
      }

      renderer!.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    const monsterModel = battleMonsterModel(props.battle.monsterType, props.battle.monster.name);
    [player, enemy] = await Promise.all([
      fighter('kaykit-knight', 2.5, true),
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
  for (const task of waits) task.resolve();
  waits.clear();
  player?.mixer.stopAllAction();
  enemy?.mixer.stopAllAction();
  release(scene);
  renderer?.domElement.removeEventListener('pointerup', select);
  renderer?.dispose();
});
</script>

<style scoped>
.battle-scene {
  position: absolute;
  inset: 0;
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
  text-shadow: 0 0 8px rgba(239, 68, 68, 0.85), 0 2px 4px rgba(0, 0, 0, 0.95);
}
.floating-combat-text--crit {
  font-size: 2rem;
  color: #fef08a;
  text-shadow: 0 0 16px rgba(234, 179, 8, 1), 0 2px 6px rgba(0, 0, 0, 0.95);
}
.floating-combat-text--dodge {
  font-size: 1.45rem;
  color: #67e8f9;
  text-shadow: 0 0 12px rgba(6, 182, 212, 0.9), 0 2px 4px rgba(0, 0, 0, 0.95);
}
.floating-combat-text--block {
  font-size: 1.45rem;
  color: #93c5fd;
  text-shadow: 0 0 12px rgba(59, 130, 246, 0.9), 0 2px 4px rgba(0, 0, 0, 0.95);
}
</style>
