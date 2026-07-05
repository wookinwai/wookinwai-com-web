import { readFileSync } from 'node:fs';
import satori from 'satori';
import sharp from 'sharp';

/**
 * LinkedIn profile banner, generated at build time and served at
 * /linkedin-banner.png. Same pipeline as the per-note Open Graph route
 * (src/pages/og/[...slug].jpg.ts): satori renders the text + the homepage
 * "growth -> gap -> build" schematic (JSX -> SVG), and the paper, graph-paper
 * grid, drafting frame, and registration ticks are drawn as a base SVG; sharp
 * composites the two and rasterizes.
 *
 * Sized to LinkedIn's 1584x396 personal cover. Content is pushed right of the
 * ~430px left margin so it clears the profile photo that overlaps the
 * bottom-left. Mirrors the Drafting Table palette (see src/styles/global.css's
 * @theme block) with literal hex, since satori can't read CSS custom
 * properties. Font note: satori's parser can't read .woff2, so weights come
 * from the static @fontsource/hanken-grotesk and @fontsource/crimson-pro
 * packages (plain .woff), same as the OG route.
 */

const PAPER = '#f4f0e2';
const INK = '#2b261c';
const MUT = '#6e6755';
const ACC = '#2f6b4c';
const RULE = '#2b261c';

const W = 1584;
const H = 396;

const font = (p: string) => readFileSync(p);
const FDIR = 'node_modules/@fontsource';
const fonts = [
  {
    name: 'sans',
    data: font(`${FDIR}/hanken-grotesk/files/hanken-grotesk-latin-800-normal.woff`),
    weight: 800 as const,
    style: 'normal' as const,
  },
  {
    name: 'sans',
    data: font(`${FDIR}/hanken-grotesk/files/hanken-grotesk-latin-700-normal.woff`),
    weight: 700 as const,
    style: 'normal' as const,
  },
  {
    name: 'sans',
    data: font(`${FDIR}/hanken-grotesk/files/hanken-grotesk-latin-500-italic.woff`),
    weight: 500 as const,
    style: 'italic' as const,
  },
  {
    name: 'note',
    data: font(`${FDIR}/crimson-pro/files/crimson-pro-latin-500-normal.woff`),
    weight: 500 as const,
    style: 'normal' as const,
  },
];

// Base layer: paper + graph-paper grid (36px cells, matching the site's body
// field), an inner drafting frame, and four corner registration ticks.
const CELL = 36;
const GRID_LINE = 'rgba(43,38,28,0.05)';
let grid = '';
for (let x = CELL; x < W; x += CELL) grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
for (let y = CELL; y < H; y += CELL) grid += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;

const FI = 28; // frame inset
const [fx0, fy0, fx1, fy1] = [FI, FI, W - FI, H - FI];
const TK = 11; // tick arm length
const tick = (cx: number, cy: number) =>
  `<line x1="${cx - TK}" y1="${cy}" x2="${cx + TK}" y2="${cy}"/>` +
  `<line x1="${cx}" y1="${cy - TK}" x2="${cx}" y2="${cy + TK}"/>`;

const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <g stroke="${GRID_LINE}" stroke-width="1">${grid}</g>
  <rect x="${fx0}" y="${fy0}" width="${fx1 - fx0}" height="${fy1 - fy0}" fill="none" stroke="${RULE}" stroke-width="1.5"/>
  <g stroke="${MUT}" stroke-width="1.5">${tick(fx0, fy0)}${tick(fx1, fy0)}${tick(fx0, fy1)}${tick(fx1, fy1)}</g>
</svg>`;

// A drawn leader-line arrow between schematic cards, echoing fig.01's dashed
// leader + solid head (satori's font has no arrow glyph, so it's drawn).
const arrowSvg =
  `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='24'>` +
  `<line x1='0' y1='12' x2='27' y2='12' stroke='${MUT}' stroke-width='1.5' stroke-dasharray='3 3'/>` +
  `<path d='M26 5 L40 12 L26 19 Z' fill='#000'/></svg>`;
const arrowUri = `data:image/svg+xml;utf8,${encodeURIComponent(arrowSvg)}`;

type Node = Record<string, unknown>;
const arrow = (): Node => ({
  type: 'img',
  props: { src: arrowUri, width: 40, height: 24, style: { margin: '0 8px', marginBottom: 4 } },
});

const card = (label: string, ann: string, build: boolean): Node => ({
  type: 'div',
  props: {
    style: {
      display: 'flex',
      flexDirection: 'column',
      width: '132px',
      padding: '16px 16px 15px',
      background: PAPER,
      border: build ? `2px solid ${ACC}` : `1.5px solid ${RULE}`,
    },
    children: [
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            fontSize: 21,
            fontWeight: 700,
            fontStyle: 'italic',
            lineHeight: 1,
            marginBottom: 8,
            color: build ? ACC : INK,
          },
          children: label,
        },
      },
      {
        type: 'div',
        props: {
          style: { display: 'flex', fontFamily: 'note', fontSize: 15, lineHeight: 1.15, color: MUT },
          children: ann,
        },
      },
    ],
  },
});

export async function GET() {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: `${W}px`,
          height: `${H}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          // start content right of the ~430px left margin LinkedIn's profile
          // photo overlaps at the bottom-left
          padding: '0 78px 0 430px',
          fontFamily: 'sans',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontFamily: 'note',
                fontSize: 25,
                color: ACC,
                letterSpacing: 0.5,
                marginBottom: 30,
              },
              children: 'wookinwai.com  ·  software builder & technical partner',
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
              children: [
                // the statement, closing on a green-italic emphasis run
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexWrap: 'wrap',
                      maxWidth: '600px',
                      fontSize: 46,
                      fontWeight: 800,
                      lineHeight: 1.16,
                      letterSpacing: '-0.018em',
                      color: INK,
                    },
                    children: [
                      {
                        type: 'span',
                        props: {
                          style: { display: 'flex' },
                          children: 'I define and build the software your business needs ',
                        },
                      },
                      {
                        type: 'span',
                        props: {
                          style: { display: 'flex', fontWeight: 500, fontStyle: 'italic', color: ACC },
                          children: 'next.',
                        },
                      },
                    ],
                  },
                },
                // the homepage schematic: growth -> gap -> build
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: { display: 'flex', alignItems: 'center' },
                          children: [
                            card('the growth', 'where it wants to go', false),
                            arrow(),
                            card('the gap', 'what is in the way', false),
                            arrow(),
                            card('the build', 'software that carries it', true),
                          ],
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: {
                            display: 'flex',
                            fontFamily: 'note',
                            fontSize: 17,
                            color: MUT,
                            marginTop: 15,
                            letterSpacing: 0.3,
                          },
                          children: 'from business need · to working system',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    { width: W, height: H, fonts }
  );

  const bg = await sharp(Buffer.from(bgSvg)).png().toBuffer();
  const fg = await sharp(Buffer.from(svg)).png().toBuffer();
  const png = await sharp(bg)
    .composite([{ input: fg, top: 0, left: 0 }])
    .png()
    .toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
