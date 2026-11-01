import { readonly, ref } from 'vue';

export const SOUND_STORAGE_KEY = 'fairy-world:sound-enabled';
export const SOUND_SAMPLES = {
  step: ['step-1', 'step-2', 'step-3'],
  swing: ['swing-1', 'swing-2', 'swing-3'],
  bow: ['bow-1', 'bow-2'],
  crossbow: ['crossbow-1', 'crossbow-2', 'crossbow-3'],
  hit: ['hit-1', 'hit-2', 'hit-3'],
  block: ['block-1', 'block-2', 'block-3'],
  dodge: ['swing-1', 'swing-2'],
  fire: ['fire-1', 'fire-2'],
  ice: ['ice-1', 'ice-2'],
  arcane: ['arcane-1', 'arcane-2'],
  heal: ['heal'],
  death: ['death'],
  encounter: ['encounter'],
  victory: ['victory-trumpets'],
  defeat: ['defeat'],
};
export type GameSound = keyof typeof SOUND_SAMPLES;
const VOLUME: Record<GameSound, number> = {
  step: 0.3,
  swing: 0.65,
  bow: 0.8,
  crossbow: 0.8,
  hit: 0.7,
  block: 0.65,
  dodge: 0.3,
  fire: 0.6,
  ice: 0.5,
  arcane: 0.55,
  heal: 0.5,
  death: 0.65,
  encounter: 0.45,
  victory: 0.45,
  defeat: 0.45,
};
interface AudioOptions {
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  createContext?: () => AudioContext;
  isHidden?: () => boolean;
  loadSample?: (url: string, context: AudioContext) => Promise<AudioBuffer>;
}

/** Predecoded recordings: immediate playback, never queue stale battle sounds. */
export function createGameAudio(options: AudioOptions = {}) {
  let storage = options.storage;
  let initiallyEnabled = true;
  try {
    storage ??= typeof window !== 'undefined' ? window.localStorage : undefined;
    initiallyEnabled = storage?.getItem(SOUND_STORAGE_KEY) !== 'false';
  } catch {
    /* Storage is optional. */
  }
  const enabled = ref(initiallyEnabled);
  const hidden = options.isHidden ?? (() => typeof document !== 'undefined' && document.hidden);
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let preload: Promise<void> | undefined;
  const buffers = new Map<string, AudioBuffer>();
  const previous = new Map<GameSound, string>();
  const voices = new Set<AudioBufferSourceNode>();
  const loadSample =
    options.loadSample ??
    (async (url: string, ctx: AudioContext) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Sound unavailable');
      return ctx.decodeAudioData(await response.arrayBuffer());
    });

  function stop() {
    for (const voice of voices) {
      try {
        voice.stop();
      } catch {
        /* Already ended. */
      }
    }
    voices.clear();
  }
  function setEnabled(value: boolean, persist = true) {
    enabled.value = value;
    if (master && context) master.gain.setValueAtTime(value ? 0.65 : 0, context.currentTime);
    if (!value) stop();
    if (persist) {
      try {
        storage?.setItem(SOUND_STORAGE_KEY, String(value));
      } catch {
        /* In-memory preference still works. */
      }
    }
  }
  async function unlock() {
    if (!enabled.value || hidden()) return;
    try {
      if (!context) {
        context = options.createContext ? options.createContext() : new window.AudioContext();
        master = context.createGain();
        master.gain.value = 0.65;
        master.connect(context.destination);
      }
      if (context.state === 'suspended') await context.resume();
      const ctx = context;
      preload ??= Promise.all(
        [...new Set(Object.values(SOUND_SAMPLES).flat())].map(async (name) => {
          try {
            buffers.set(name, await loadSample(`/audio/battle/${name}.mp3`, ctx));
          } catch {
            /* A missing recording stays silent; never fall back to beeps. */
          }
        })
      ).then(() => {});
      await preload;
    } catch {
      /* Autoplay or unsupported browser: audio must not affect gameplay. */
    }
  }
  function play(sound: GameSound) {
    if (!enabled.value || hidden() || context?.state !== 'running' || !master || voices.size >= 16) return;
    try {
      const available = SOUND_SAMPLES[sound].filter((name) => buffers.has(name));
      const candidates = available.length > 1 ? available.filter((name) => name !== previous.get(sound)) : available;
      const name = candidates[Math.floor(Math.random() * candidates.length)];
      if (!name) return;
      const source = context.createBufferSource();
      source.buffer = buffers.get(name)!;
      // Musical cues keep their pitch; foley has small natural variations.
      source.playbackRate.value = ['victory', 'defeat', 'heal', 'encounter'].includes(sound)
        ? 1
        : 0.97 + Math.random() * 0.06;
      const gain = context.createGain();
      gain.gain.value = VOLUME[sound];
      source.connect(gain);
      gain.connect(master);
      voices.add(source);
      previous.set(sound, name);
      source.onended = () => {
        voices.delete(source);
        source.disconnect();
        gain.disconnect();
      };
      source.start(context.currentTime);
    } catch {
      /* Optional audio must never interrupt animation. */
    }
  }
  function listen(target: Window = window, page: Document = document) {
    const gesture = (event: Event) => {
      if (event.isTrusted) void unlock();
    };
    const visibility = () => {
      if (page.hidden) stop();
    };
    const sync = (event: StorageEvent) => {
      if (event.key === SOUND_STORAGE_KEY || event.key === null) setEnabled(event.newValue !== 'false', false);
    };
    target.addEventListener('pointerup', gesture, { capture: true, passive: true });
    target.addEventListener('keydown', gesture, true);
    target.addEventListener('storage', sync);
    page.addEventListener('visibilitychange', visibility);
    return () => {
      target.removeEventListener('pointerup', gesture, true);
      target.removeEventListener('keydown', gesture, true);
      target.removeEventListener('storage', sync);
      page.removeEventListener('visibilitychange', visibility);
      stop();
    };
  }
  return { enabled: readonly(enabled), setEnabled, unlock, play, stop, listen };
}
export const gameAudio = createGameAudio();
