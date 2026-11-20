import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { duration, ease, scale, stagger } from '../motion/tokens.js';
import { onReducedMotionChange, shouldAnimate } from '../motion/gate.js';
import { GRID, planSequence } from './plan.js';
import { POOL_SIZE, SHAPES } from './shapes.js';

gsap.registerPlugin(ScrollTrigger);

const TILE_FILL = 0.9;
const PARKED_SCALE = 0.62;
const PARKED_OPACITY = 0.4;
const DWELL = 0.9; // пауза между фигурами (в единицах таймлайна)
const SCROLL_VH_PER_SHAPE = 55; // сколько прокрутки (в % высоты экрана) на одну смену фигуры
const PIN_TOP = 16;
const WIDE_QUERY = '(min-width: 900px)';
const SCRUB_SECONDS = 0.6;

const parkedRotation = (index) => ((index * 37) % 25) - 12;

function buildSlots(root) {
  const slots = document.createElement('div');
  slots.className = 'figure-stage__slots';
  for (let i = 0; i < (GRID - 2) ** 2; i += 1) {
    const slot = document.createElement('span');
    slot.className = 'figure-stage__slot';
    slots.append(slot);
  }
  root.append(slots);
}

function buildTiles(root) {
  return Array.from({ length: POOL_SIZE }, () => {
    const el = document.createElement('span');
    el.className = 'figure-tile';
    root.append(el);
    return el;
  });
}

function stateFor(tile, index, cell) {
  const inset = (cell * (1 - TILE_FILL)) / 2;
  return {
    x: tile.col * cell + inset,
    y: tile.row * cell + inset,
    scale: tile.parked ? PARKED_SCALE : 1,
    rotation: tile.parked ? parkedRotation(index) : 0,
    opacity: tile.parked ? PARKED_OPACITY : 1,
    backgroundColor: tile.color,
  };
}

function placeLayout(tiles, layout, cell) {
  tiles.forEach((el, index) => {
    gsap.set(el, { ...stateFor(layout[index], index, cell), '--lift': 0, zIndex: 1 });
  });
}

function addTileMove(tl, el, target, at) {
  const travelAt = at + duration.fast;
  const landAt = travelAt + duration.slow;
  tl.set(el, { zIndex: 5 }, at)
    .to(el, { scale: scale.lift, '--lift': 1, duration: duration.fast, ease: ease.smooth }, at)
    .to(
      el,
      {
        x: target.x,
        y: target.y,
        rotation: target.rotation,
        opacity: target.opacity,
        backgroundColor: target.backgroundColor,
        duration: duration.slow,
        ease: ease.sharp,
      },
      travelAt,
    )
    .to(el, { scale: target.scale, '--lift': 0, duration: duration.fast, ease: ease.bounce }, landAt)
    .set(el, { zIndex: 1 }, landAt + duration.fast);
}

const hasChanged = (from, to) => from.col !== to.col || from.row !== to.row || from.color !== to.color;

/** Одна смена фигуры: плитки по очереди снизу вверх «переставляются». */
function addTransition(tl, tiles, from, to, cell, startAt) {
  const moving = tiles
    .map((el, index) => ({ el, index, target: stateFor(to[index], index, cell), tile: to[index] }))
    .filter(({ index }) => hasChanged(from[index], to[index]))
    .sort((a, b) => b.tile.row - a.tile.row || a.tile.col - b.tile.col);

  moving.forEach(({ el, target }, order) => {
    addTileMove(tl, el, target, startAt + order * stagger.min);
  });
  return startAt + moving.length * stagger.min + duration.fast * 3 + duration.slow;
}

function buildTimeline(tiles, layouts, cell) {
  const tl = gsap.timeline({ paused: true });
  let cursor = DWELL / 2;
  for (let k = 0; k < layouts.length - 1; k += 1) {
    cursor = addTransition(tl, tiles, layouts[k], layouts[k + 1], cell, cursor) + DWELL;
  }
  return tl;
}

const scrollDistance = (shapeCount) => () => `+=${Math.round((window.innerHeight * (shapeCount - 1) * SCROLL_VH_PER_SHAPE) / 100)}`;
const fitsViewport = (el) => el.offsetHeight + PIN_TOP * 2 <= window.innerHeight;

/**
 * Привязка к прокрутке: фигуры меняются при прокрутке вниз и возвращаются при прокрутке вверх.
 * Широкий экран: закрепляем весь первый экран. Узкий: закрепляем только сцену.
 * Если закреплять нечего (низкое окно), фигуры меняются, пока сцена проходит через экран.
 */
function createScrollTrigger(root, timeline, shapeCount, onProgress) {
  const base = {
    animation: timeline,
    scrub: SCRUB_SECONDS,
    invalidateOnRefresh: true,
    onUpdate: (self) => onProgress(Math.round(self.progress * (shapeCount - 1))),
  };
  const hero = root.closest('.hero');
  const figure = root.parentElement;
  const wide = window.matchMedia(WIDE_QUERY).matches;

  if (wide && hero && fitsViewport(hero)) {
    // Закрепляем на месте, без скачка: экран стоит, пока фигуры меняются.
    const heroTop = Math.round(hero.getBoundingClientRect().top + window.scrollY);
    return ScrollTrigger.create({
      ...base,
      trigger: hero,
      start: `top ${heroTop}px`,
      end: scrollDistance(shapeCount),
      pin: true,
      anticipatePin: 1,
    });
  }
  if (!wide && fitsViewport(figure)) {
    return ScrollTrigger.create({
      ...base,
      trigger: figure,
      start: 'center center',
      end: scrollDistance(shapeCount),
      pin: true,
      anticipatePin: 1,
    });
  }
  return ScrollTrigger.create({ ...base, trigger: root, start: 'top 85%', end: 'bottom 15%' });
}

/** Сцена в первом экране: плитки складываются в фигуры при прокрутке. */
function buildDots(container, count) {
  if (!container) return () => {};
  container.replaceChildren();
  const dots = Array.from({ length: count }, () => {
    const dot = document.createElement('span');
    container.append(dot);
    return dot;
  });
  return (active) => dots.forEach((dot, index) => dot.classList.toggle('is-active', index === active));
}

export function initFigureStage(root) {
  const layouts = planSequence(SHAPES, POOL_SIZE).slice(0, -1);
  buildSlots(root);
  const tiles = buildTiles(root);
  const showActive = buildDots(document.querySelector('#hero-cue .hero__dots'), layouts.length);
  showActive(0);

  let timeline = null;
  let trigger = null;
  let lastWidth = 0;

  const stop = () => {
    trigger?.kill(true);
    timeline?.kill();
    trigger = null;
    timeline = null;
  };

  const start = () => {
    stop();
    const cell = root.clientWidth / GRID;
    root.style.setProperty('--cell', `${cell}px`);
    lastWidth = root.clientWidth;
    placeLayout(tiles, layouts[0], cell);
    showActive(0);
    // Движение здесь существенное: отключаем его только по системной настройке пользователя.
    if (!shouldAnimate({ essential: true })) return;
    timeline = buildTimeline(tiles, layouts, cell);
    trigger = createScrollTrigger(root, timeline, layouts.length, showActive);
  };

  let resizeTimer = 0;
  new ResizeObserver(() => {
    if (root.clientWidth === lastWidth) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(start, 150);
  }).observe(root);

  onReducedMotionChange(start);
  start();
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
