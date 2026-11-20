import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onReducedMotionChange, shouldAnimate } from '../motion/gate.js';

gsap.registerPlugin(ScrollTrigger);

const COLORS = Object.freeze(['#daa38f', '#9b7d61', '#92ada4', '#fed8a6', '#b5573f']);
const SEED = 11;
const MOBILE_QUERY = '(max-width: 719px)';
const COUNT_DESKTOP = 24;
const COUNT_MOBILE = 11;
const SIZE_MIN = 34;
const SIZE_MAX = 72;
const OPACITY_MIN = 0.18;
const OPACITY_MAX = 0.32;
const DRIFT_VH_MAX = 0.9;
const SPIN_MAX = 40;

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Редкие плитки на фоне страницы. Чистая функция: координаты в долях экрана,
 * дрейф (смещение при прокрутке) в долях высоты экрана.
 */
export function planBackdrop(count, seed = SEED) {
  const rng = mulberry32(seed);
  return Array.from({ length: count }, (_, index) => {
    const direction = index % 2 === 0 ? -1 : 1;
    return {
      left: rng(),
      top: rng(),
      size: SIZE_MIN + rng() * (SIZE_MAX - SIZE_MIN),
      rotation: (rng() - 0.5) * 50,
      opacity: OPACITY_MIN + rng() * (OPACITY_MAX - OPACITY_MIN),
      color: COLORS[index % COLORS.length],
      drift: direction * (0.25 + rng() * (DRIFT_VH_MAX - 0.25)),
      spin: (rng() - 0.5) * 2 * SPIN_MAX,
    };
  });
}

/** Фоновый слой: разбросанные плитки, которые при прокрутке плавно смещаются. */
export function initBackdrop() {
  const layer = document.createElement('div');
  layer.className = 'tile-backdrop';
  layer.setAttribute('aria-hidden', 'true');
  document.body.prepend(layer);

  let timeline = null;
  let trigger = null;
  let lastWidth = 0;

  const stop = () => {
    trigger?.kill();
    timeline?.kill();
    trigger = null;
    timeline = null;
  };

  const build = () => {
    stop();
    layer.replaceChildren();
    lastWidth = window.innerWidth;
    const count = window.matchMedia(MOBILE_QUERY).matches ? COUNT_MOBILE : COUNT_DESKTOP;
    const items = planBackdrop(count);
    const tiles = items.map((item) => {
      const el = document.createElement('span');
      el.className = 'backdrop-tile';
      layer.append(el);
      gsap.set(el, {
        left: `${item.left * 100}%`,
        top: `${item.top * 100}%`,
        width: item.size,
        height: item.size,
        backgroundColor: item.color,
        opacity: item.opacity,
        rotation: item.rotation,
      });
      return el;
    });

    if (!shouldAnimate({ essential: true })) return;
    timeline = gsap.timeline({ paused: true });
    tiles.forEach((el, index) => {
      const { drift, spin, rotation } = items[index];
      timeline.to(el, { y: drift * window.innerHeight, rotation: rotation + spin, ease: 'none', duration: 1 }, 0);
    });
    trigger = ScrollTrigger.create({
      animation: timeline,
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      invalidateOnRefresh: true,
    });
  };

  window.addEventListener('resize', () => {
    if (window.innerWidth !== lastWidth) build();
  });
  onReducedMotionChange(build);
  build();
}
