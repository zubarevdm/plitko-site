import { describe, expect, it } from 'vitest';
import { GRID, SHAPE_SIZE, assignLayout, parseShape, planSequence, ringCells } from '../src/figures/plan.js';
import { SHAPES, POOL_SIZE } from '../src/figures/shapes.js';
import { planBackdrop } from '../src/figures/backdrop.js';

const key = (cell) => `${cell.col},${cell.row}`;

describe('shapes data', () => {
  it.each(SHAPES.map((shape) => [shape.name, shape]))('%s fits the 7x7 box', (_name, shape) => {
    expect(shape.rows.length).toBeLessThanOrEqual(SHAPE_SIZE);
    shape.rows.forEach((row) => expect(row).toHaveLength(SHAPE_SIZE));
  });

  it('never needs more tiles than the pool holds', () => {
    SHAPES.forEach((shape) => expect(parseShape(shape.rows).length).toBeLessThanOrEqual(POOL_SIZE));
  });

  it('has at least four shapes', () => {
    expect(SHAPES.length).toBeGreaterThanOrEqual(4);
  });
});

describe('parseShape', () => {
  it('keeps every cell inside the inner 7x7 area of the 9x9 stage', () => {
    SHAPES.forEach((shape) => {
      parseShape(shape.rows).forEach(({ col, row }) => {
        expect(col).toBeGreaterThanOrEqual(1);
        expect(col).toBeLessThanOrEqual(GRID - 2);
        expect(row).toBeGreaterThanOrEqual(1);
        expect(row).toBeLessThanOrEqual(GRID - 2);
      });
    });
  });

  it('centers a short shape vertically', () => {
    const cells = parseShape(['#######']);
    expect(new Set(cells.map((c) => c.row))).toEqual(new Set([4]));
  });
});

describe('ringCells', () => {
  it('returns the 32 border cells of the 9x9 stage', () => {
    expect(ringCells()).toHaveLength(32);
  });
});

describe('assignLayout', () => {
  const ring = ringCells();
  const prev = Array.from({ length: 6 }, (_, i) => ({ col: i, row: 0, parked: false }));
  const targets = [{ col: 2, row: 3 }, { col: 3, row: 3 }, { col: 4, row: 3 }];

  it('fills every target exactly once and parks the rest', () => {
    const next = assignLayout(prev, targets, ring);
    expect(next).toHaveLength(prev.length);
    expect(next.filter((t) => !t.parked)).toHaveLength(targets.length);
    expect(new Set(next.map(key)).size).toBe(next.length);
  });

  it('does not mutate the previous layout', () => {
    const frozen = Object.freeze(prev.map((t) => Object.freeze({ ...t })));
    expect(() => assignLayout(frozen, targets, ring)).not.toThrow();
  });
});

describe('planSequence', () => {
  const layouts = planSequence(SHAPES, POOL_SIZE);

  it('returns one layout per shape plus the return to the start', () => {
    expect(layouts).toHaveLength(SHAPES.length + 1);
  });

  it('shows exactly the shape cells in every layout, without overlaps', () => {
    layouts.forEach((layout, index) => {
      const shape = SHAPES[index % SHAPES.length];
      expect(layout.filter((t) => !t.parked)).toHaveLength(parseShape(shape.rows).length);
      expect(new Set(layout.map(key)).size).toBe(POOL_SIZE);
    });
  });

  it('colors figure tiles with the shape tones', () => {
    layouts.forEach((layout, index) => {
      const shape = SHAPES[index % SHAPES.length];
      layout.filter((t) => !t.parked).forEach((t) => expect(shape.colors).toContain(t.color));
    });
  });

  it('loops seamlessly: the last layout equals the first', () => {
    expect(layouts[layouts.length - 1]).toEqual(layouts[0]);
  });

  it('is deterministic', () => {
    expect(planSequence(SHAPES, POOL_SIZE)).toEqual(layouts);
  });
});

describe('planBackdrop', () => {
  const items = planBackdrop(24);

  it('returns the requested number of tiles', () => {
    expect(items).toHaveLength(24);
  });

  it('keeps positions inside the screen and tiles faint enough to read text over', () => {
    items.forEach((item) => {
      expect(item.left).toBeGreaterThanOrEqual(0);
      expect(item.left).toBeLessThanOrEqual(1);
      expect(item.top).toBeGreaterThanOrEqual(0);
      expect(item.top).toBeLessThanOrEqual(1);
      expect(item.opacity).toBeLessThanOrEqual(0.35);
    });
  });

  it('drifts in both directions', () => {
    expect(items.some((item) => item.drift > 0)).toBe(true);
    expect(items.some((item) => item.drift < 0)).toBe(true);
  });

  it('is deterministic', () => {
    expect(planBackdrop(24)).toEqual(items);
  });
});
