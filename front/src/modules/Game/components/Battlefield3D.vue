<template>
  <div ref="host" class="battle-scene" aria-label="3D tactical battlefield">
    <div v-if="message" class="scene-message" role="status">
      {{ message }}
      <button v-if="failed" type="button" @click="emit('fallback')">Return to battle choices</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';

import { battleMovementPath } from '@/modules/Game/battleMovementPath';
import { battleMonsterModel } from '@/modules/Game/battleMonsterModels';
import type { BattleHandMode } from '@/modules/Game/battlePlayerLoadout';
import type { BattleState } from '@/modules/Monsters/api';

const props = defineProps<{ battle: BattleState; disabled: boolean; handMode?: BattleHandMode }>();
const emit = defineEmits<{ busy: [value: boolean]; move: [cell: number]; attack: []; fallback: [] }>();
const host = ref<HTMLDivElement>();
const message = ref('Loading animated battlefield…');
const failed = ref(false);
const scene = new T.Scene();
scene.background = new T.Color('#18292c');
const camera = new T.PerspectiveCamera(36, 1, 0.1, 150);
const loader = new GLTFLoader();
const tiles: T.Mesh<T.CylinderGeometry, T.MeshStandardMaterial>[] = [];
type Fighter = { root: T.Group; mixer: T.AnimationMixer; clips: T.AnimationClip[]; current?: T.AnimationAction };
let player: Fighter | undefined;
let enemy: Fighter | undefined;
let renderer: T.WebGLRenderer | undefined;
let observer: ResizeObserver | undefined;
let frame = 0;
let disposed = false;
let busy = true;
let elapsed = 0;
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
  return new T.Vector3(((cell % columns) + (row % 2) / 2 - columns / 2) * 1.77, 0.08, (row - rows / 2) * 1.53);
}
function materials(root: T.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof T.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (object instanceof T.SkinnedMesh) object.frustumCulled = false;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      // Original FBX conversions contain zero alpha on otherwise opaque materials.
      material.opacity = 1;
      material.transparent = false;
      material.alphaTest = 0;
    }
  });
}
async function fighter(file: string, height: number): Promise<Fighter> {
  const gltf = await loader.loadAsync(`/models/battle/${file}.glb`);
  const model = gltf.scene;
  if (disposed) {
    release(model);
    throw new Error('Battlefield closed');
  }
  materials(model);
  const mixer = new T.AnimationMixer(model);
  const idle = gltf.animations.find((animation) => /Idle$/.test(animation.name));
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
  scene.add(root);
  mixer.stopAllAction();
  return { root, mixer, clips: gltf.animations };
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
    hit: /(?:HitReact$|^Hit_A$)/i,
  };
  return unit.clips.find((entry) => patterns[kind].test(entry.name));
}
function play(unit: Fighter, kind: 'idle' | 'walk' | 'attack' | 'death' | 'hit', once = false) {
  const animation = clip(unit, kind) ?? clip(unit, 'idle') ?? unit.clips[0];
  if (!animation) return 0.6;
  const action = unit.mixer.clipAction(animation);
  if (unit.current !== action) unit.current?.fadeOut(0.12);
  action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
  action.setLoop(once ? T.LoopOnce : T.LoopRepeat, once ? 1 : Infinity);
  action.clampWhenFinished = once;
  action.fadeIn(0.12).play();
  unit.current = action;
  return animation.duration;
}
function face(unit: Fighter, destination: T.Vector3) {
  const direction = destination.clone().sub(unit.root.position);
  unit.root.rotation.y = Math.atan2(direction.x, direction.z);
}
function paint() {
  tiles.forEach((tile, cell) => {
    const arena = props.battle.arena;
    tile.material.color.set(
      cell === arena.monsterPosition
        ? '#814e39'
        : cell === arena.playerPosition
          ? '#587d8c'
          : !busy && arena.reachableCells.includes(cell)
            ? '#4a786a'
            : '#394641'
    );
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
        face(unit, step);
        await wait(Math.max(0.2, origin.distanceTo(step) / 4), (t) => unit.root.position.lerpVectors(origin, step, t));
      }
    } else if (event.action === 'DEFEND') {
      const block = unit.clips.find((entry) => entry.name === 'Block');
      if (block) {
        unit.current?.fadeOut(0.1);
        unit.current = unit.mixer.clipAction(block).reset().setLoop(T.LoopOnce, 1).play();
      }
      await wait(0.35);
    } else {
      face(unit, target.root.position);
      const duration = play(unit, 'attack', true);
      await wait(duration * 0.55);
      if (!event.dodged && !event.blocked && clip(target, 'hit')) play(target, 'hit', true);
      await wait(duration * 0.45);
      play(target, 'idle');
    }
    play(unit, 'idle');
  }
  player.root.position.copy(point(next.arena.playerPosition));
  enemy.root.position.copy(point(next.arena.monsterPosition));
  face(player, enemy.root.position);
  face(enemy, player.root.position);
  if (next.status !== 'ACTIVE') {
    await wait(play(next.status === 'VICTORY' ? enemy : player, 'death', true));
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
    host.value!.appendChild(renderer.domElement);
    renderer.domElement.addEventListener('pointerup', select);
    scene.add(new T.HemisphereLight('#c1e3ff', '#62543b', 2.2));
    const sun = new T.DirectionalLight('#ffe4b2', 3.4);
    sun.position.set(-8, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 });
    scene.add(sun);
    const { columns, rows, blockedCells } = props.battle.arena;
    const ground = new T.Mesh(
      new T.PlaneGeometry(160, 160),
      new T.MeshStandardMaterial({ color: '#27352e', roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.15;
    ground.receiveShadow = true;
    scene.add(ground);
    scene.fog = new T.Fog('#18292c', 30, 85);
    // Stone ruins frame the playable hexes without obscuring valid moves.
    for (let i = 0; i < 8; i++) {
      const column = new T.Group();
      const stone = new T.MeshStandardMaterial({ color: i % 2 ? '#6c7265' : '#757565', roughness: 0.95 });
      const height = 1.3 + (i % 3) * 0.7;
      const shaft = new T.Mesh(new T.CylinderGeometry(0.38, 0.5, height, 8), stone);
      shaft.position.y = height / 2;
      const cap = new T.Mesh(new T.BoxGeometry(1.1, 0.25, 1.1), stone);
      cap.position.y = height;
      column.add(shaft, cap);
      column.position.set(((i % 4) - 1.5) * 5, 0, i < 4 ? -rows * 0.95 - 1 : rows * 0.95 + 1);
      column.traverse((object) => {
        if (object instanceof T.Mesh) object.castShadow = true;
      });
      scene.add(column);
    }
    for (let cell = 0; cell < columns * rows; cell++) {
      const tile = new T.Mesh(new T.CylinderGeometry(1, 1, 0.13, 6), new T.MeshStandardMaterial({ roughness: 0.95 }));
      tile.position.copy(point(cell));
      tile.position.y = -0.03;
      tile.receiveShadow = true;
      tiles.push(tile);
      scene.add(tile);
      if (blockedCells.includes(cell)) {
        const rock = new T.Mesh(
          new T.DodecahedronGeometry(0.65, 0),
          new T.MeshStandardMaterial({ color: '#77796b', roughness: 1 })
        );
        rock.position.copy(point(cell));
        rock.position.y = 0.4;
        rock.scale.set(1, 0.8, 1);
        rock.castShadow = true;
        scene.add(rock);
      }
    }
    const resize = () => {
      if (!host.value || !renderer) return;
      const { width, height } = host.value.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(1, height);
      const distance = Math.max((columns * 2.9) / camera.aspect, rows * 2.7, 15);
      camera.position.set(0, distance * 0.7, distance * 0.85);
      camera.lookAt(0, 0, 0);
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
      for (const task of waits) {
        task.tick?.(Math.min(1, (elapsed - task.start) / (task.end - task.start)));
        if (elapsed >= task.end) {
          waits.delete(task);
          task.resolve();
        }
      }
      renderer!.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    const monsterModel = battleMonsterModel(props.battle.monsterType, props.battle.monster.name);
    [player, enemy] = await Promise.all([
      fighter('kaykit-knight', 2.5),
      fighter(`creatures/${monsterModel.file}`, monsterModel.height),
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
</style>
