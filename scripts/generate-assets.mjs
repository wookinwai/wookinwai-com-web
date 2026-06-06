// Build-time generation of favicons, PWA icons, and the Open Graph image.
// Run with: npm run gen:assets
//
// Fonts are reused from the installed Fontsource packages: their woff2 files are
// decompressed to TTF (satori cannot read woff2), so there are no vendored font
// binaries to maintain.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { decompress } from 'wawoff2';

const root = process.cwd();
const pub = resolve(root, 'public');
const r = (...p) => resolve(root, ...p);

// ---------------------------------------------------------------------------
// Favicons + PWA icons (rasterized from the path-based SVG mark with sharp)
// ---------------------------------------------------------------------------
const faviconSvg = await readFile(r('public/favicon.svg'));

const iconJobs = [
  { out: 'favicon-16x16.png', size: 16, src: faviconSvg },
  { out: 'favicon-32x32.png', size: 32, src: faviconSvg },
  { out: 'apple-touch-icon.png', size: 180, src: faviconSvg },
  { out: 'icon-192.png', size: 192, src: faviconSvg },
  { out: 'icon-512.png', size: 512, src: faviconSvg },
];

// Maskable icon: full-bleed ink background with the W centered inside the
// safe zone (no transparent corners). Press Mono: ink #15130f + signal red.
const maskableSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <rect width="512" height="512" fill="#15130f"/>
    <path d="M150 190 L214 410 L256 280 L298 410 L362 190" fill="none" stroke="#c1331f"
      stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
);
iconJobs.push({ out: 'icon-maskable-512.png', size: 512, src: maskableSvg });

for (const job of iconJobs) {
  await sharp(job.src, { density: 384 })
    .resize(job.size, job.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(resolve(pub, job.out));
  console.log('icon →', job.out);
}

// ---------------------------------------------------------------------------
// Open Graph image (1200×630): satori lays the text out with explicitly-named
// static fonts and emits an SVG with glyphs as vector paths; resvg then
// rasterizes it (no font lookup needed at that stage). Static instances are
// used because satori's opentype parser chokes on variable-font fvar tables.
// ---------------------------------------------------------------------------
const fontFile = async (p) => Buffer.from(await decompress(await readFile(r(p))));

const hankenHeavy = await fontFile('node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-800-normal.woff2');
const hanken = await fontFile('node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-400-normal.woff2');
const mono = await fontFile('node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2');

const el = (type, style, children) => ({ type, props: { style, children } });
const row = (style, children) => el('div', { display: 'flex', ...style }, children);

// Press Mono OG card: signal red on warm newsprint, heavy uppercase Hanken
// wordmark, JetBrains Mono labels, a hard 2px ink frame — no gradients, no serif.
const markup = row(
  {
    width: '1200px',
    height: '630px',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '70px 76px',
    backgroundColor: '#f2eee4',
    color: '#15130f',
    border: '2px solid #15130f',
    fontFamily: 'Hanken',
  },
  [
    row(
      { fontFamily: 'Mono', fontSize: '22px', letterSpacing: '5px', color: '#c1331f' },
      'SOFTWARE BUILDER · TECHNICAL PARTNER'
    ),
    row({ flexDirection: 'column' }, [
      row(
        { fontFamily: 'Hanken', fontWeight: 800, fontSize: '150px', letterSpacing: '-6px', lineHeight: 1 },
        [
          'WOO KIN WAI',
          el('span', { display: 'flex', color: '#c1331f' }, '.'),
        ]
      ),
      row(
        { marginTop: '26px', fontSize: '33px', color: '#57514a', maxWidth: '960px' },
        'I shape and build the software a business needs next.'
      ),
    ]),
    row({ alignItems: 'center', fontFamily: 'Mono', fontSize: '22px', letterSpacing: '3px', color: '#57514a' }, [
      el('div', { display: 'flex', width: '44px', height: '6px', backgroundColor: '#c1331f', marginRight: '20px' }, ''),
      'TINY EDGES · KUALA LUMPUR · GMT+8',
    ]),
  ]
);

const svg = await satori(markup, {
  width: 1200,
  height: 630,
  fonts: [
    { name: 'Hanken', data: hankenHeavy, weight: 800, style: 'normal' },
    { name: 'Hanken', data: hanken, weight: 400, style: 'normal' },
    { name: 'Mono', data: mono, weight: 700, style: 'normal' },
  ],
});

const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
await mkdir(pub, { recursive: true });
await writeFile(resolve(pub, 'og.png'), png);
console.log('og   → og.png');

console.log('done.');
