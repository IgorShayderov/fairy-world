// Pack a self-contained glTF into a GLB without modifying its rig or animations.
import { readFileSync, writeFileSync } from 'node:fs';
const [input, output] = process.argv.slice(2);
const gltf = JSON.parse(readFileSync(input, 'utf8'));
const chunks = [];
let length = 0;
const append = (data) => {
  const offset = length;
  chunks.push(data, Buffer.alloc((4 - (data.length % 4)) % 4));
  length += data.length + ((4 - (data.length % 4)) % 4);
  return offset;
};
const decode = (uri) => {
  if (!uri.startsWith('data:')) throw new Error('Only embedded assets are supported');
  return Buffer.from(uri.split(',')[1], 'base64');
};
const offsets = gltf.buffers.map((buffer) => append(decode(buffer.uri)));
for (const view of gltf.bufferViews) {
  view.byteOffset = (view.byteOffset ?? 0) + offsets[view.buffer];
  view.buffer = 0;
}
for (const image of gltf.images ?? []) {
  if (!image.uri) continue;
  const data = decode(image.uri);
  image.mimeType = image.uri.match(/^data:([^;]+)/)[1];
  image.bufferView = gltf.bufferViews.length;
  gltf.bufferViews.push({ buffer: 0, byteOffset: append(data), byteLength: data.length });
  delete image.uri;
}
gltf.buffers = [{ byteLength: length }];
const json = Buffer.from(JSON.stringify(gltf));
const padded = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + padded.length + length, 8);
header.writeUInt32LE(padded.length, 12);
header.writeUInt32LE(0x4e4f534a, 16);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(length, 0);
binHeader.writeUInt32LE(0x004e4942, 4);
writeFileSync(output, Buffer.concat([header, padded, binHeader, ...chunks]));
