/**
 * Divergent brand icon generator
 * Uses sharp (already in node_modules) with rsvg to render SVG → PNG.
 *
 * Run:  node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public');

mkdirSync(PUBLIC, { recursive: true });

// ─── Colors ────────────────────────────────────────────────────
const BG      = '#1E3122'; // --pine-700 (forest pine)
const GLYPH   = '#C07848'; // --copper-500 (muted copper)

// ─── Star path ─────────────────────────────────────────────────
// Computes an 8-point polygon for a 4-pointed star (✦ shape).
// Even indices = outer tips at 0°/90°/180°/270°;
// Odd indices  = inner saddle points at 45°/135°/225°/315°.
function starPath(cx, cy, outerR, innerR) {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;          // 0, 45, 90 … degrees
    const r     = i % 2 === 0 ? outerR : innerR;
    const x     = (cx + r * Math.sin(angle)).toFixed(3);
    const y     = (cy - r * Math.cos(angle)).toFixed(3);
    pts.push(`${i === 0 ? 'M' : 'L'}${x},${y}`);
  }
  return pts.join(' ') + ' Z';
}

// ─── SVG template ──────────────────────────────────────────────
// Rounded-rect background + star glyph.
// corner_r ≈ 22.5 % of size → matches iOS/Android icon rounding.
function buildSvg(size) {
  const cx       = size / 2;
  const cy       = size / 2;
  const outerR   = size * 0.342;        // star tips span ~68 % of width
  const innerR   = outerR * 0.195;      // tight saddle → elongated points
  const cornerR  = Math.round(size * 0.225);

  return `<svg xmlns="http://www.w3.org/2000/svg"
  width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${cornerR}" ry="${cornerR}" fill="${BG}"/>
  <path d="${starPath(cx, cy, outerR, innerR)}" fill="${GLYPH}"/>
</svg>`;
}

// ─── Generate ──────────────────────────────────────────────────
const icons = [
  { size: 512,  file: 'icon-512.png' },
  { size: 192,  file: 'icon-192.png' },
  { size: 180,  file: 'apple-touch-icon.png' },
];

for (const { size, file } of icons) {
  const svg  = buildSvg(size);
  const dest = join(PUBLIC, file);

  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toFile(dest);

  console.log(`✓ public/${file}  (${size}×${size})`);
}

console.log('\nAll icons generated.');
