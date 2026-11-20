/**
 * Чистая логика раскладки: без DOM и без анимации, поэтому легко тестируется.
 * Сцена — сетка 9×9. Фигура занимает центральную область 7×7,
 * лишние плитки «разбросаны» по рамке сцены.
 */
export const GRID = 9;
export const SHAPE_SIZE = 7;
const OFFSET = (GRID - SHAPE_SIZE) / 2;
const SEED = 7;
const PARKED_COLORS = Object.freeze(['#daa38f', '#9b7d61', '#92ada4', '#fed8a6']);

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const distance = (a, b) => (a.col - b.col) ** 2 + (a.row - b.row) ** 2;

/** Клетки фигуры в координатах сцены 9×9 (по вертикали центрируется). */
export function parseShape(rows, colors) {
  const top = Math.floor((SHAPE_SIZE - rows.length) / 2);
  const cells = [];
  rows.forEach((line, r) => {
    [...line].forEach((char, c) => {
      if (char !== '#') return;
      const col = c + OFFSET;
      const row = r + top + OFFSET;
      cells.push({ col, row, color: colors?.[(col + row) % colors.length] });
    });
  });
  return cells;
}

/** Клетки по краю сцены, где «разбросаны» лишние плитки. */
export function ringCells() {
  const cells = [];
  for (let row = 0; row < GRID; row += 1) {
    for (let col = 0; col < GRID; col += 1) {
      if (row === 0 || col === 0 || row === GRID - 1 || col === GRID - 1) cells.push({ col, row });
    }
  }
  return cells;
}

function takeNearest(from, candidates) {
  let bestIndex = 0;
  let best = Infinity;
  candidates.forEach((candidate, index) => {
    const d = distance(from, candidate);
    if (d < best) {
      best = d;
      bestIndex = index;
    }
  });
  return bestIndex;
}

/**
 * Раскладка следующей фигуры: каждая клетка фигуры занимается ближайшей
 * свободной плиткой, остальные уходят на ближайшие клетки рамки.
 * Возвращает новый массив, предыдущий не меняется.
 */
export function assignLayout(prev, figureCells, parkCells) {
  const next = new Array(prev.length);
  const freeTiles = prev.map((_, index) => index);

  figureCells.forEach((target) => {
    const pick = takeNearest(
      target,
      freeTiles.map((i) => prev[i]),
    );
    const tileIndex = freeTiles.splice(pick, 1)[0];
    next[tileIndex] = { col: target.col, row: target.row, color: target.color, parked: false };
  });

  const parking = [...parkCells];
  freeTiles.forEach((tileIndex) => {
    const pick = takeNearest(prev[tileIndex], parking);
    const cell = parking.splice(pick, 1)[0];
    next[tileIndex] = { col: cell.col, row: cell.row, color: prev[tileIndex].color, parked: true };
  });
  return next;
}

function initialLayout(firstCells, poolSize) {
  const rng = mulberry32(SEED);
  const ring = ringCells()
    .map((cell) => ({ cell, order: rng() }))
    .sort((a, b) => a.order - b.order)
    .map((item) => item.cell);

  return Array.from({ length: poolSize }, (_, index) => {
    if (index < firstCells.length) return { ...firstCells[index], parked: false };
    return { ...ring[index - firstCells.length], color: PARKED_COLORS[index % PARKED_COLORS.length], parked: true };
  });
}

/**
 * Последовательность раскладок: фигура 0 → 1 → … → n-1 → снова 0.
 * Последняя раскладка полностью совпадает с первой, поэтому цикл бесшовный.
 */
export function planSequence(shapes, poolSize) {
  const cellsByShape = shapes.map((shape) => parseShape(shape.rows, shape.colors));
  const ring = ringCells();
  const layouts = [initialLayout(cellsByShape[0], poolSize)];

  for (let k = 1; k < shapes.length; k += 1) {
    layouts.push(assignLayout(layouts[k - 1], cellsByShape[k], ring));
  }
  layouts.push(layouts[0].map((tile) => ({ ...tile })));
  return layouts;
}
