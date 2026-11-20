import { stagger } from './tokens.js';
import { shouldAnimate } from './gate.js';

/** Сколько элементов группы получают нарастающую задержку; дальше задержка не растёт. */
export const REVEAL_MAX_STEPS = 5;

const VIEWPORT_MARGIN = '0px 0px -8% 0px';
const VISIBLE_THRESHOLD = 0.12;

/** Одиночные блоки: каждый появляется сам по себе. */
const SINGLE_SELECTORS = [
  'main > .section > h2',
  'main > .section > .section__lead',
  '.table-wrap',
  '.price',
  '.order',
];

/** Группы: дети появляются по очереди с шагом stagger.base. */
const GROUP_SELECTORS = ['.steps', '.perks', '.faq'];

/** Задержка появления элемента с номером index внутри группы, в секундах. */
export function revealDelay(index) {
  return Math.min(index, REVEAL_MAX_STEPS) * stagger.base;
}

function isInViewport(el) {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 0;
}

function prepare(el, delay) {
  el.classList.add('reveal');
  el.style.setProperty('--reveal-delay', `${delay}s`);
}

function cleanup(el) {
  el.classList.remove('reveal', 'is-visible');
  el.style.removeProperty('--reveal-delay');
}

/**
 * Появление блоков при прокрутке: один раз, без повторов при прокрутке назад.
 * Блоки, видимые сразу при загрузке, не скрываются. Без JS и при отключённых
 * системных анимациях ничего не прячется.
 */
export function initReveal(root = document) {
  if (!shouldAnimate({ essential: true })) return;

  const targets = [];
  SINGLE_SELECTORS.forEach((selector) => {
    root.querySelectorAll(selector).forEach((el) => targets.push({ el, delay: 0 }));
  });
  GROUP_SELECTORS.forEach((selector) => {
    root.querySelectorAll(selector).forEach((group) => {
      [...group.children].forEach((el, index) => targets.push({ el, delay: revealDelay(index) }));
    });
  });

  const pending = targets.filter(({ el }) => !isInViewport(el));
  if (pending.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);
        el.classList.add('is-visible');
        const onEnd = (event) => {
          if (event.target !== el) return;
          el.removeEventListener('transitionend', onEnd);
          cleanup(el);
        };
        el.addEventListener('transitionend', onEnd);
      });
    },
    { threshold: VISIBLE_THRESHOLD, rootMargin: VIEWPORT_MARGIN },
  );

  pending.forEach(({ el, delay }) => {
    prepare(el, delay);
    observer.observe(el);
  });
}
