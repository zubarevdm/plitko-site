/**
 * Логика конструктора стены: сетка 50 мм, плитки кратны ячейке.
 * Чистые функции, состояние не мутируется: каждая операция возвращает новый объект.
 */

export const CELL_MM = 50;

export const SIZES = Object.freeze({
  big: { w: 2, h: 2, label: '100×100' },
  wide: { w: 2, h: 1, label: '100×50' },
  tall: { w: 1, h: 2, label: '50×100' },
  small: { w: 1, h: 1, label: '50×50' },
});

export function createBoard(cols, rows) {
  return Object.freeze({ cols, rows, tiles: Object.freeze([]), nextId: 1 });
}

function covers(tile, x, y) {
  const { w, h } = SIZES[tile.size];
  return x >= tile.x && x < tile.x + w && y >= tile.y && y < tile.y + h;
}

export function tileAt(board, x, y) {
  return board.tiles.find((tile) => covers(tile, x, y)) ?? null;
}

export function canPlace(board, size, x, y) {
  const dims = SIZES[size];
  if (!dims || x < 0 || y < 0 || x + dims.w > board.cols || y + dims.h > board.rows) return false;
  for (let dy = 0; dy < dims.h; dy += 1) {
    for (let dx = 0; dx < dims.w; dx += 1) {
      if (tileAt(board, x + dx, y + dy)) return false;
    }
  }
  return true;
}

export function placeTile(board, { size, color, x, y }) {
  if (!canPlace(board, size, x, y)) return { board, tile: null };
  const tile = Object.freeze({ id: board.nextId, size, color, x, y });
  const next = Object.freeze({ ...board, tiles: Object.freeze([...board.tiles, tile]), nextId: board.nextId + 1 });
  return { board: next, tile };
}

export function removeTileAt(board, x, y) {
  const tile = tileAt(board, x, y);
  if (!tile) return { board, tile: null };
  const tiles = Object.freeze(board.tiles.filter((t) => t.id !== tile.id));
  return { board: Object.freeze({ ...board, tiles }), tile };
}

export function clearBoard(board) {
  return createBoard(board.cols, board.rows);
}

export function summarize(board) {
  const bySize = Object.fromEntries(Object.keys(SIZES).map((key) => [key, 0]));
  let cells = 0;
  for (const tile of board.tiles) {
    bySize[tile.size] += 1;
    cells += SIZES[tile.size].w * SIZES[tile.size].h;
  }
  const total = board.cols * board.rows;
  return {
    count: board.tiles.length,
    bySize,
    filled: total ? cells / total : 0,
    areaM2: (cells * CELL_MM * CELL_MM) / 1e6,
  };
}

/** Заполняет доску по узору: pick(x, y) -> { size, color } | null. Пустоты закрывает малой плиткой. */
export function fillPattern(board, pick, fallbackColor) {
  let next = clearBoard(board);
  for (let y = 0; y < next.rows; y += 1) {
    for (let x = 0; x < next.cols; x += 1) {
      if (tileAt(next, x, y)) continue;
      const choice = pick(x, y);
      if (choice && canPlace(next, choice.size, x, y)) {
        next = placeTile(next, { ...choice, x, y }).board;
      } else {
        next = placeTile(next, { size: 'small', color: choice?.color ?? fallbackColor, x, y }).board;
      }
    }
  }
  return next;
}
