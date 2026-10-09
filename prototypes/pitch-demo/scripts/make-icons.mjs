/**
 * Writes the home-screen icons: a cream crescent on night, matching the moon in
 * the app's tab bar. Hand-rolled PNG encoder so the build needs no image
 * library and works offline. Run with `npm run icons`.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const NIGHT = [0x0b, 0x0c, 0x0e];
const PAPER = [0xf4, 0xf3, 0xee];

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixel) {
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    const row = y * stride;
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      raw[row + 1 + x * 3] = r;
      raw[row + 2 + x * 3] = g;
      raw[row + 3 + x * 3] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * The crescent sits inside the middle 60% so it survives a maskable crop.
 * Supersampled 3x3 per pixel to keep the curve smooth at 180px.
 */
function crescent(size) {
  const c = size / 2;
  const R = size * 0.3;
  const cutR = size * 0.255;
  const cutX = c + size * 0.105;
  const cutY = c - size * 0.085;
  const inside = (x, y) => {
    const inMoon = (x - c) ** 2 + (y - c) ** 2 <= R * R;
    const inCut = (x - cutX) ** 2 + (y - cutY) ** 2 <= cutR * cutR;
    return inMoon && !inCut;
  };
  return (px, py) => {
    let hits = 0;
    for (let sy = 0; sy < 3; sy++) {
      for (let sx = 0; sx < 3; sx++) {
        if (inside(px + (sx + 0.5) / 3, py + (sy + 0.5) / 3)) hits++;
      }
    }
    if (hits === 0) return NIGHT;
    if (hits === 9) return PAPER;
    const a = hits / 9;
    return NIGHT.map((n, i) => Math.round(n + (PAPER[i] - n) * a));
  };
}

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'public');

for (const size of [192, 512, 180]) {
  const file = path.join(out, `icon-${size}.png`);
  writeFileSync(file, png(size, crescent(size)));
  console.log(`wrote ${path.relative(path.join(here, '..'), file)} (${size}x${size})`);
}
