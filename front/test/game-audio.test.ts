import { describe, expect, it, vi } from 'vitest';

import { createGameAudio, SOUND_STORAGE_KEY } from '../src/shared/audio/gameAudio';

function fixture(saved: string | null = null) {
  const param = () => ({ value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const sources: Array<{ start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }> = [];
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn() });
  const source = () => {
    const result = { ...node(), playbackRate: param(), frequency: param(), start: vi.fn(), stop: vi.fn(), onended: null };
    sources.push(result);
    return result;
  };
  const context = {
    state: 'suspended',
    currentTime: 1,
    sampleRate: 100,
    destination: node(),
    createGain: vi.fn(() => ({ ...node(), gain: param() })),
    createOscillator: vi.fn(source),
    createBufferSource: vi.fn(source),
    createBiquadFilter: vi.fn(() => ({ ...node(), Q: param(), frequency: param() })),
    createBuffer: vi.fn(() => ({ getChannelData: () => new Float32Array(100) })),
    resume: vi.fn(async () => {
      context.state = 'running';
    }),
  };
  const storage = { getItem: vi.fn(() => saved), setItem: vi.fn() };
  const createContext = vi.fn(() => context as unknown as AudioContext);
  const isHidden = vi.fn(() => false);
  const loadSample = vi.fn(async () => ({ duration: 1 }) as AudioBuffer);
  const audio = createGameAudio({ storage, createContext, isHidden, loadSample });
  return { audio, context, storage, createContext, sources, isHidden, loadSample };
}

describe('game audio', () => {
  it('does not create audio or queue effects before a user gesture', async () => {
    const f = fixture();
    f.audio.play('hit');
    expect(f.createContext).not.toHaveBeenCalled();
    await f.audio.unlock();
    expect(f.sources).toHaveLength(0);
    f.audio.play('hit');
    expect(f.sources).toHaveLength(1);
    expect(f.sources[0]?.start).toHaveBeenCalledWith(1);
  });

  it('restores mute across visits and never initializes a muted audio context', async () => {
    const f = fixture('false');
    expect(f.audio.enabled.value).toBe(false);
    await f.audio.unlock();
    f.audio.play('victory');
    expect(f.createContext).not.toHaveBeenCalled();
    f.audio.setEnabled(true);
    expect(f.storage.setItem).toHaveBeenCalledWith(SOUND_STORAGE_KEY, 'true');
    await f.audio.unlock();
    f.audio.play('heal');
    expect(f.sources).toHaveLength(1);
  });

  it('mutes immediately, cancels scheduled notes, and blocks subsequent effects', async () => {
    const f = fixture();
    await f.audio.unlock();
    f.audio.play('victory');
    f.audio.setEnabled(false);
    expect(f.context.createGain.mock.results[0]?.value.gain.setValueAtTime).toHaveBeenCalledWith(0, 1);
    for (const source of f.sources) expect(source.stop).toHaveBeenLastCalledWith();
    f.audio.play('hit');
    expect(f.sources).toHaveLength(1);
    expect(f.storage.setItem).toHaveBeenCalledWith(SOUND_STORAGE_KEY, 'false');
  });

  it('stays silent in a background tab or while the browser suspends audio', async () => {
    const f = fixture();
    await f.audio.unlock();
    f.isHidden.mockReturnValue(true);
    f.audio.play('step');
    f.isHidden.mockReturnValue(false);
    f.context.state = 'suspended';
    f.audio.play('hit');
    expect(f.sources).toHaveLength(0);
  });

  it('caps simultaneous voices and caches decoded recordings', async () => {
    const f = fixture();
    await f.audio.unlock();
    for (let i = 0; i < 100; i++) f.audio.play('step');
    expect(f.sources).toHaveLength(16);
    const loaded = f.loadSample.mock.calls.length;
    await f.audio.unlock();
    expect(f.loadSample).toHaveBeenCalledTimes(loaded);
    expect(f.context.createOscillator).not.toHaveBeenCalled();
  });

  it('ignores unavailable storage and unsupported audio without breaking gameplay', async () => {
    const audio = createGameAudio({
      storage: {
        getItem: () => {
          throw new Error('denied');
        },
        setItem: () => {
          throw new Error('denied');
        },
      },
      createContext: () => {
        throw new Error('unsupported');
      },
    });
    expect(() => audio.setEnabled(false)).not.toThrow();
    audio.setEnabled(true);
    await expect(audio.unlock()).resolves.toBeUndefined();
    expect(() => audio.play('hit')).not.toThrow();
  });
});
