// The tiled monogram — a "W" laid in mosaic, the site's device. Tiles are
// ink-toned with deterministic glaze variation (opacity derived from grid
// position, so the texture is handmade-but-intentional and identical on every
// build), plus a single ribbon-green tile at the letter's heart.
//
// Rendered statically by Monogram.astro (header) and HeroSketch.astro (the
// sketch's signature seal); animated sparingly by the glint script in
// BaseLayout.

const W_PATTERN = ['X...X', 'X...X', 'X.X.X', 'X.X.X', '.X.X.'];

export type MonogramTile = {
  x: number;
  y: number;
  size: number;
  rx: number;
  heart: boolean;
  opacity: string;
};

export function monogramTiles(cell = 6, gap = 1.5): { tiles: MonogramTile[]; width: number; height: number } {
  const cols = W_PATTERN[0].length;
  const rows = W_PATTERN.length;
  const tiles: MonogramTile[] = [];
  W_PATTERN.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch !== 'X') return;
      const heart = r === 2 && c === 2;
      tiles.push({
        x: c * (cell + gap),
        y: r * (cell + gap),
        size: cell,
        rx: Math.max(0.5, cell * 0.1),
        heart,
        opacity: heart ? '0.9' : (0.45 + ((c * 3 + r * 5) % 4) * 0.11).toFixed(2),
      });
    })
  );
  return {
    tiles,
    width: cols * cell + (cols - 1) * gap,
    height: rows * cell + (rows - 1) * gap,
  };
}
