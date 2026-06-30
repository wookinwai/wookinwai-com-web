import { readFileSync } from 'node:fs';
import satori from 'satori';
import sharp from 'sharp';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

/**
 * Per-note Open Graph image, generated at build time: 1200x675 JPEG rendered
 * via satori (JSX -> SVG) then rasterized with sharp. Mirrors the Drafting
 * Table palette (see src/styles/global.css's @theme block) with literal
 * hex values, since satori can't read CSS custom properties.
 *
 * Font note: satori (via its bundled @shuding/opentype.js parser) cannot
 * parse .woff2 — only .woff/.ttf/.otf. The only Source Serif 4 package in
 * this repo is the *variable* @fontsource-variable build, which ships
 * woff2-only files. So this route pulls weights from the static
 * @fontsource/source-serif-4 package instead (installed alongside satori +
 * sharp for this route), which ships plain .woff per static weight.
 */

const PAPER = '#f4f0e2';
const INK = '#2b261c';
const MUT = '#6e6755';
const ACC = '#2f6b4c';

const serifSemibold = readFileSync(
  'node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-600-normal.woff'
);
const serifItalic = readFileSync('node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-500-italic.woff');
const monoMedium = readFileSync('node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff');

const fonts = [
  { name: 'serif', data: serifSemibold, weight: 600 as const, style: 'normal' as const },
  { name: 'serif', data: serifItalic, weight: 500 as const, style: 'italic' as const },
  { name: 'mono', data: monoMedium, weight: 500 as const, style: 'normal' as const },
];

// Conservative caps: satori doesn't auto-fit text, so long strings are
// truncated rather than allowed to overflow the 1200x675 canvas. At 60px
// (titles) / 28px (descriptions) inside a ~1072px content box, three title
// lines and three description lines comfortably fit the available height.
const TITLE_MAX = 110;
const DESC_MAX = 170;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export async function getStaticPaths() {
  const notes = await getCollection('notes');
  return notes.map((note) => ({ params: { slug: note.data.slug }, props: { note } }));
}

export async function GET({ props }: APIContext) {
  const { title, description } = props.note.data;

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '675px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          background: PAPER,
          fontFamily: 'serif',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontFamily: 'mono',
                fontSize: 26,
                color: ACC,
                letterSpacing: 1,
              },
              children: 'wookinwai.com  ·  note',
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      fontSize: 60,
                      fontWeight: 600,
                      color: INK,
                      lineHeight: 1.15,
                    },
                    children: truncate(title, TITLE_MAX),
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      marginTop: 20,
                      fontSize: 28,
                      fontStyle: 'italic',
                      color: MUT,
                      lineHeight: 1.4,
                    },
                    children: truncate(description, DESC_MAX),
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', height: 4, width: 120, background: ACC },
            },
          },
        ],
      },
    },
    { width: 1200, height: 675, fonts }
  );

  const jpg = await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();

  return new Response(jpg, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
