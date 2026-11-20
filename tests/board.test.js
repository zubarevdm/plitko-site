import { describe, expect, it } from 'vitest';
import {
  canPlace,
  clearBoard,
  createBoard,
  fillPattern,
  placeTile,
  removeTileAt,
  summarize,
  tileAt,
} from '../src/builder/board.js';

describe('board', () => {
  it('places a tile on free cells', () => {
    const { board, tile } = placeTile(createBoard(4, 4), { size: 'big', color: 'a', x: 1, y: 1 });
    expect(tile).not.toBeNull();
    expect(tileAt(board, 2, 2)?.id).toBe(tile.id);
    expect(tileAt(board, 0, 0)).toBeNull();
  });

  it('rejects overlapping tiles', () => {
    const first = placeTile(createBoard(4, 4), { size: 'big', color: 'a', x: 0, y: 0 }).board;
    expect(canPlace(first, 'small', 1, 1)).toBe(false);
    const { board, tile } = placeTile(first, { size: 'wide', color: 'b', x: 1, y: 0 });
    expect(tile).toBeNull();
    expect(board).toBe(first);
  });

  it('rejects tiles that leave the board', () => {
    const board = createBoard(3, 2);
    expect(canPlace(board, 'big', 2, 0)).toBe(false);
    expect(canPlace(board, 'tall', 0, 1)).toBe(false);
    expect(canPlace(board, 'small', -1, 0)).toBe(false);
    expect(canPlace(board, 'nope', 0, 0)).toBe(false);
  });

  it('removes the tile under any of its cells', () => {
    const placed = placeTile(createBoard(4, 4), { size: 'tall', color: 'a', x: 2, y: 1 }).board;
    const { board, tile } = removeTileAt(placed, 2, 2);
    expect(tile?.size).toBe('tall');
    expect(board.tiles).toHaveLength(0);
    expect(removeTileAt(board, 0, 0).tile).toBeNull();
  });

  it('does not mutate the previous board', () => {
    const empty = createBoard(4, 4);
    placeTile(empty, { size: 'small', color: 'a', x: 0, y: 0 });
    expect(empty.tiles).toHaveLength(0);
    expect(Object.isFrozen(empty)).toBe(true);
  });

  it('summarizes counts, filled share and area', () => {
    let board = createBoard(4, 2);
    board = placeTile(board, { size: 'big', color: 'a', x: 0, y: 0 }).board;
    board = placeTile(board, { size: 'wide', color: 'a', x: 2, y: 0 }).board;
    const s = summarize(board);
    expect(s.count).toBe(2);
    expect(s.bySize).toEqual({ big: 1, wide: 1, tall: 0, small: 0 });
    expect(s.filled).toBeCloseTo(6 / 8);
    expect(s.areaM2).toBeCloseTo(0.015);
  });

  it('fills a pattern completely, closing gaps with small tiles', () => {
    const board = fillPattern(createBoard(5, 3), () => ({ size: 'big', color: 'a' }), 'b');
    expect(summarize(board).filled).toBe(1);
    expect(summarize(board).bySize.big).toBe(2);
    expect(clearBoard(board).tiles).toHaveLength(0);
  });
});
