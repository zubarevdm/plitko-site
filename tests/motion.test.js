import { describe, expect, it, vi } from 'vitest';
import { clampStagger, duration, stagger } from '../src/motion/tokens.js';
import { revealDelay, REVEAL_MAX_STEPS } from '../src/motion/reveal.js';
import { isLowEnd, onReducedMotionChange, prefersReducedMotion, shouldAnimate } from '../src/motion/gate.js';

const fakeWindow = (matches) => ({
  matchMedia: () => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
});

describe('motion tokens', () => {
  it('keeps durations ordered from fastest to slowest', () => {
    const values = Object.values(duration);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });

  it.each([
    [0.01, stagger.min],
    [0.08, 0.08],
    [0.5, stagger.max],
  ])('clamps stagger %s to %s', (input, expected) => {
    expect(clampStagger(input)).toBe(expected);
  });

  it('is frozen so tokens cannot be mutated', () => {
    expect(Object.isFrozen(duration)).toBe(true);
  });
});

describe('prefersReducedMotion', () => {
  it('is true when the media query matches', () => {
    expect(prefersReducedMotion(fakeWindow(true))).toBe(true);
  });

  it('is false when it does not match', () => {
    expect(prefersReducedMotion(fakeWindow(false))).toBe(false);
  });

  it('is false without a window (SSR-safe)', () => {
    expect(prefersReducedMotion(undefined)).toBe(false);
  });
});

describe('isLowEnd', () => {
  it('flags 4 or fewer cores', () => {
    expect(isLowEnd({ hardwareConcurrency: 4 })).toBe(true);
  });

  it('does not flag 8 cores', () => {
    expect(isLowEnd({ hardwareConcurrency: 8 })).toBe(false);
  });

  it('does not flag when the value is unknown', () => {
    expect(isLowEnd({})).toBe(false);
    expect(isLowEnd(undefined)).toBe(false);
  });
});

describe('shouldAnimate', () => {
  it('is false when the user prefers reduced motion, even for essential motion', () => {
    expect(shouldAnimate({ essential: true, win: fakeWindow(true), nav: { hardwareConcurrency: 8 } })).toBe(false);
  });

  it('skips non-essential motion on low-end devices', () => {
    expect(shouldAnimate({ win: fakeWindow(false), nav: { hardwareConcurrency: 2 } })).toBe(false);
  });

  it('keeps essential motion on low-end devices', () => {
    expect(shouldAnimate({ essential: true, win: fakeWindow(false), nav: { hardwareConcurrency: 2 } })).toBe(true);
  });

  it('allows motion on a capable device', () => {
    expect(shouldAnimate({ win: fakeWindow(false), nav: { hardwareConcurrency: 8 } })).toBe(true);
  });
});

describe('onReducedMotionChange', () => {
  it('subscribes and unsubscribes the listener', () => {
    const add = vi.fn();
    const remove = vi.fn();
    const win = { matchMedia: () => ({ matches: false, addEventListener: add, removeEventListener: remove }) };
    const stop = onReducedMotionChange(() => {}, win);
    expect(add).toHaveBeenCalledWith('change', expect.any(Function));
    stop();
    expect(remove).toHaveBeenCalled();
  });

  it('returns a no-op without a window', () => {
    expect(() => onReducedMotionChange(() => {}, undefined)()).not.toThrow();
  });
});

describe('revealDelay', () => {
  it('starts at zero for the first item', () => {
    expect(revealDelay(0)).toBe(0);
  });

  it('steps by the base stagger, inside the allowed 0.05-0.10 range', () => {
    const step = revealDelay(2) - revealDelay(1);
    expect(step).toBeGreaterThanOrEqual(stagger.min);
    expect(step).toBeLessThanOrEqual(stagger.max);
  });

  it('caps the delay so long lists do not feel sluggish', () => {
    expect(revealDelay(50)).toBe(revealDelay(REVEAL_MAX_STEPS));
  });
});
