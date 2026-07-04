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
 * parse .woff2 — only .woff/.ttf/.otf. The @fontsource-variable builds ship
 * woff2-only files, so this route pulls weights from the static
 * @fontsource/hanken-grotesk and @fontsource/crimson-pro packages instead
 * (installed alongside satori + sharp for this route), which ship plain
 * .woff per static weight. The title mirrors the site's extrabold headings.
 */

const PAPER = '#f4f0e2';
const INK = '#2b261c';
const MUT = '#6e6755';
const ACC = '#2f6b4c';

const sansExtrabold = readFileSync(
  'node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-800-normal.woff'
);
const sansItalic = readFileSync('node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-500-italic.woff');
const noteSerif = readFileSync('node_modules/@fontsource/crimson-pro/files/crimson-pro-latin-500-normal.woff');

const fonts = [
  { name: 'sans', data: sansExtrabold, weight: 800 as const, style: 'normal' as const },
  { name: 'sans', data: sansItalic, weight: 500 as const, style: 'italic' as const },
  { name: 'note', data: noteSerif, weight: 500 as const, style: 'normal' as const },
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
          fontFamily: 'sans',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontFamily: 'note',
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
                      fontWeight: 800,
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
