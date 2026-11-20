/**
 * Единые токены анимации. Все модули берут значения отсюда:
 * никаких чисел и кривых в коде отдельных анимаций.
 * Те же значения продублированы в CSS-переменных (tokens.css).
 */
export const duration = Object.freeze({
  instant: 0.08,
  fast: 0.18,
  normal: 0.35,
  slow: 0.6,
  crawl: 1.0,
});

// Имена кривых GSAP
export const ease = Object.freeze({
  smooth: 'power4.out',
  sharp: 'power2.inOut',
  bounce: 'back.out(1.7)',
  linear: 'none',
});

// Смещения в пикселях
export const distance = Object.freeze({
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 48,
});

export const scale = Object.freeze({
  subtle: 0.98,
  press: 0.95,
  pop: 1.04,
  lift: 1.12,
});

// Шаг каскада: короче — выглядит механически, длиннее — вяло
export const stagger = Object.freeze({
  min: 0.05,
  max: 0.1,
  base: 0.08,
});

export function clampStagger(value) {
  return Math.min(stagger.max, Math.max(stagger.min, value));
}
