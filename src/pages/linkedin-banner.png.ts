import { readFileSync } from 'node:fs';
import satori from 'satori';
import sharp from 'sharp';

/**
 * LinkedIn profile banner, generated at build time and served at
 * /linkedin-banner.png. Same pipeline as the per-note Open Graph route
 * (src/pages/og/[...slug].jpg.ts): satori renders the brand lockup, the
 * homepage statement, and the "growth -> gap -> build" schematic (JSX -> SVG);
 * a base SVG paints the paper and the scattered plot-cells that echo the
 * homepage PlotBackground; sharp composites the two and rasterizes.
 *
 * Sized to LinkedIn's 1584x396 personal cover. Content sits in the left-centre
 * with a clear left margin (the profile photo overlaps the bottom-left).
 * Mirrors the Drafting Table palette (see src/styles/global.css's @theme
 * block) with literal hex, since satori can't read CSS custom properties. Font
 * note: satori's parser can't read .woff2, so weights come from the static
 * @fontsource/hanken-grotesk and @fontsource/crimson-pro packages (plain
 * .woff), same as the OG route.
 */

const PAPER = '#f4f0e2';
const INK = '#2b261c';
const MUT = '#6e6755';
const ACC = '#2f6b4c';
const RULE = '#2b261c';
const LINE = 'rgba(43,38,28,0.20)';

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

// ---- background: paper + scattered plot cells (the homepage PlotBackground) ----
const CELL = 36;
function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}
const acc = [47, 107, 76];
const acc2 = [38, 90, 63];
const greenL = acc.map((v) => Math.round(v + (255 - v) * 0.2));
const greens = [acc, acc2, greenL];
const offRed = [acc[1], acc[0], acc[2]]; // channel permutations: the "off-plan" cells
const offBlue = [acc[0], acc[2], acc[1]];
function pickShade(cx: number, cy: number) {
  const r = hash(cx + 1, cy + 11);
  if (r < 0.05) return offRed;
  if (r < 0.1) return offBlue;
  return greens[(((r - 0.1) / 0.9) * greens.length) | 0] || greens[0];
}
// keep cells out of the avatar margin and the text columns
function blocked(x: number, y: number) {
  if (x < 255) return true; // left / avatar margin
  if (x >= 255 && x <= 790 && y >= 18 && y <= 150) return true; // logo + kicker
  if (x >= 255 && x <= 915 && y >= 150 && y <= 385) return true; // headline
  return false;
}
let cells = '';
for (let cy = 0; cy * CELL < H; cy++) {
  for (let cx = 0; cx * CELL < W; cx++) {
    if (hash(cx, cy) > 0.5) continue; // ~half of eligible cells shade
    const x = cx * CELL;
    const y = cy * CELL;
    if (blocked(x + CELL / 2, y + CELL / 2)) continue;
    const shade = pickShade(cx, cy);
    const off = shade === offRed || shade === offBlue;
    const a = (off ? 0.12 : 0.06) + 0.11 * hash(cx + 5, cy + 9);
    const inset = 5; // fill from a 1-cell inset, like the site's pencilled cells
    cells += `<rect x="${x + inset}" y="${y + inset}" width="${CELL - inset * 2}" height="${CELL - inset * 2}" fill="rgba(${shade[0]},${shade[1]},${shade[2]},${a.toFixed(3)})"/>`;
  }
}
const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${PAPER}"/>${cells}</svg>`;

// ---- green dashed leader arrow between cards (satori has no arrow glyph) ----
const arrowSvg =
  `<svg xmlns='http://www.w3.org/2000/svg' width='46' height='24'>` +
  `<line x1='0' y1='12' x2='33' y2='12' stroke='${ACC}' stroke-width='1.5' stroke-dasharray='4 3'/>` +
  `<path d='M32 5 L46 12 L32 19 Z' fill='${ACC}'/></svg>`;
const arrowUri = `data:image/svg+xml;utf8,${encodeURIComponent(arrowSvg)}`;

type Node = Record<string, unknown>;
const arrow = (): Node => ({
  type: 'img',
  props: { src: arrowUri, width: 46, height: 24, style: { margin: '0 8px' } },
});

// ---- diagonal green hatch for the "build" card (the site's fig.01 .hatch) ----
const CW = 158;
const CH = 116;
let stripes = '';
for (let c = -CH; c < CW; c += 11) {
  stripes += `<line x1='${c}' y1='0' x2='${c + CH}' y2='${CH}' stroke='rgba(47,107,76,0.16)' stroke-width='5'/>`;
}
const hatchSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='${CW}' height='${CH}'><rect width='${CW}' height='${CH}' fill='${PAPER}'/>${stripes}</svg>`;
const hatchUri = `data:image/svg+xml;utf8,${encodeURIComponent(hatchSvg)}`;

const card = (label: string, ann: string, build: boolean): Node => ({
  type: 'div',
  props: {
    style: {
      display: 'flex',
      flexDirection: 'column',
      width: `${CW}px`,
      height: `${CH}px`,
      padding: '16px 17px',
      background: PAPER,
      ...(build ? { backgroundImage: `url("${hatchUri}")`, backgroundSize: `${CW}px ${CH}px` } : {}),
      border: build ? `2px solid ${ACC}` : `1.5px solid ${RULE}`,
    },
    children: [
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            fontSize: 21,
            fontWeight: build ? 500 : 700,
            fontStyle: 'italic',
            lineHeight: 1,
            marginBottom: 11,
            color: build ? ACC : INK,
          },
          children: label,
        },
      },
      {
        type: 'div',
        props: {
          style: { display: 'flex', fontFamily: 'note', fontSize: 15.5, lineHeight: 1.22, color: MUT },
          children: ann,
        },
      },
    ],
  },
});

// ---- the WKW pixel monogram, from Header.astro: 1 = ink, 2 = green ----
const MARK = [
  [1, 0, 1, 0, 2],
  [1, 0, 1, 0, 1],
  [1, 1, 1, 1, 1],
  [0, 1, 0, 1, 0],
];
const PX = 8;
const markNode: Node = {
  type: 'div',
  props: {
    style: { display: 'flex', flexDirection: 'column' },
    children: MARK.map((row) => ({
      type: 'div',
      props: {
        style: { display: 'flex' },
        children: row.map((cell) => ({
          type: 'div',
          props: {
            style: {
              display: 'flex',
              width: `${PX}px`,
              height: `${PX}px`,
              marginRight: '1px',
              marginBottom: '1px',
              background: cell === 1 ? INK : cell === 2 ? ACC : 'transparent',
            },
          },
        })),
      },
    })),
  },
};

export async function GET() {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: `${W}px`,
          height: `${H}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 84px 0 270px',
          fontFamily: 'sans',
        },
        children: [
          // left: brand lockup + kicker + headline
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', width: '600px' },
              children: [
                // lockup: pixel mark · divider · wordmark
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', alignItems: 'center', marginBottom: 30 },
                    children: [
                      markNode,
                      {
                        type: 'div',
                        props: {
                          style: { display: 'flex', width: '1px', height: '34px', background: LINE, margin: '0 16px' },
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: { display: 'flex', fontFamily: 'note', fontSize: 27, letterSpacing: 0.5, color: INK },
                          children: [
                            { type: 'span', props: { style: { display: 'flex' }, children: 'woo kin wai' } },
                            {
                              type: 'span',
                              props: {
                                style: { display: 'flex', color: MUT, marginLeft: 10 },
                                children: '/ tiny edges',
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                // kicker
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      whiteSpace: 'nowrap',
                      fontFamily: 'note',
                      fontSize: 22,
                      color: ACC,
                      letterSpacing: 0.5,
                      marginBottom: 26,
                    },
                    children: 'software builder & technical partner · kuala lumpur, gmt+8',
                  },
                },
                // headline, closing on a green-italic emphasis run (homepage H1)
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      flexWrap: 'wrap',
                      fontSize: 38,
                      fontWeight: 800,
                      lineHeight: 1.2,
                      letterSpacing: '-0.018em',
                      color: INK,
                    },
                    children: [
                      {
                        type: 'span',
                        props: {
                          style: { display: 'flex' },
                          children: 'I help businesses define and build the software they need for their ',
                        },
                      },
                      {
                        type: 'span',
                        props: {
                          style: { display: 'flex', fontWeight: 500, fontStyle: 'italic', color: ACC },
                          children: 'next stage of growth',
                        },
                      },
                      { type: 'span', props: { style: { display: 'flex' }, children: '.' } },
                    ],
                  },
                },
              ],
            },
          },
          // right: the homepage schematic, growth -> gap -> build
          {
            type: 'div',
            props: {
              style: { display: 'flex', alignItems: 'center' },
              children: [
                card('the growth', 'where the business wants to go', false),
                arrow(),
                card('the gap', 'what is getting in the way', false),
                arrow(),
                card('the build', 'software that can carry it', true),
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
