// Rebuild selected CC0 recordings with ffmpeg; see public/audio/battle/ATTRIBUTION.md.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.argv[2];
if (!root) throw new Error('Pass the extracted source-pack directory');
const output = fileURLToPath(new URL('../public/audio/battle/', import.meta.url));
mkdirSync(output, { recursive: true });
const clips = [
  ['crossbow-1', 'weapon/Crossbow Shoot.wav', 0.32, 0.35],
  ['crossbow-2', 'weapon/Crossbow Shoot.wav', 0.84, 0.35],
  ['crossbow-3', 'weapon/Crossbow Shoot.wav', 1.41, 0.35],
  ['bow-1', 'weapon/English Longbow Shoot.wav', 0.445, 0.28],
  ['bow-2', 'weapon/English Longbow Shoot.wav', 0.775, 0.3],
  ['swing-1', 'weapon/Katana Swing.wav', 0.33, 0.35],
  ['swing-2', 'weapon/Katana Swing.wav', 1.31, 0.35],
  ['swing-3', 'weapon/Katana Swing.wav', 2.29, 0.35],
  ['step-1', 'impact/Audio/footstep_concrete_000.ogg', 0, 0.45],
  ['step-2', 'impact/Audio/footstep_concrete_001.ogg', 0, 0.45],
  ['step-3', 'impact/Audio/footstep_concrete_002.ogg', 0, 0.45],
  ['hit-1', 'impact/Audio/impactSoft_heavy_000.ogg', 0, 0.6],
  ['hit-2', 'impact/Audio/impactSoft_heavy_001.ogg', 0, 0.6],
  ['hit-3', 'impact/Audio/impactPlate_medium_000.ogg', 0, 0.7],
  ['block-1', 'apparel/sfx/sword-knife-clash-01.wav', 0, 0.8],
  ['block-2', 'apparel/sfx/sword-knife-clash-02.wav', 0, 0.8],
  ['block-3', 'apparel/sfx/sword-knife-clash-03.wav', 0, 0.8],
  ['ice-1', 'ice/ice.wav', 0, 1.4],
  ['ice-2', 'ice/coldsnap.wav', 0, 1.4],
  ['fire-1', 'rpg/spell_fire_04.ogg', 0, 1.6],
  ['fire-2', 'rpg/spell_fire_06.ogg', 0, 1.6],
  ['arcane-1', 'rpg/spell_01.ogg', 0, 1.8],
  ['arcane-2', 'rpg/spell_02.ogg', 0, 1.8],
  ['heal', 'rpg/item_gem_02.ogg', 0, 1.5],
  ['death', 'impact/Audio/impactSoft_heavy_003.ogg', 0, 0.8],
  ['encounter', 'rpg/blade_01.ogg', 0, 1.2],
  ['victory', 'rpg/item_coins_01.ogg', 0, 1.5],
  ['defeat', 'impact/Audio/impactPlate_heavy_000.ogg', 0, 1.2],
];
for (const [name, file, start, duration] of clips) {
  const input = ['-ss', String(start), '-t', String(duration), '-i', resolve(root, file)];
  // Preserve the recording's dynamics, with peak normalization rather than a brick-wall compressor.
  const scan = spawnSync('ffmpeg', ['-hide_banner', ...input, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  if (scan.status !== 0) throw new Error(`Cannot read ${file}: ${scan.stderr}`);
  const report = scan.stderr;
  const peak = Number(report.match(/max_volume: ([-\d.]+) dB/)?.[1]);
  if (!Number.isFinite(peak)) throw new Error(`Silent or unreadable sample: ${file}`);
  const gain = Math.min(24, -4 - peak);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...input, '-map_metadata', '-1', '-ac', '1', '-ar', '44100', '-af', `highpass=f=40,volume=${gain}dB,afade=t=in:d=0.003,afade=t=out:st=${Math.max(0, duration - 0.06)}:d=0.06`, '-codec:a', 'libmp3lame', '-b:a', '96k', resolve(output, `${name}.mp3`)]);
  console.log(`${name}.mp3 ← ${file} [${start}s, ${duration}s]`);
}
