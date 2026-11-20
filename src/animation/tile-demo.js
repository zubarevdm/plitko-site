import { gsap } from 'gsap';
import { duration, ease, scale, stagger } from '../motion/tokens.js';
import { onReducedMotionChange, shouldAnimate } from '../motion/gate.js';

// Координаты в системе SVG (viewBox 640×400)
const HOLE = Object.freeze({ x: 266, y: 200 });
const SHELF_TOP = Object.freeze({ x: 530, y: 120 });
const SHELF_BOTTOM = Object.freeze({ x: 530, y: 272 });
const ABOVE_Y = -110;
const SHELF_TILT = 5;
const PULSE_GROWTH = 3;
// Центры четырёх втулок: масштабируем каждую относительно своего центра
const SLEEVE_CENTERS = Object.freeze(['244 178', '288 178', '244 222', '288 222']);
const sleeveOrigin = (index) => SLEEVE_CENTERS[index];

const CAPTIONS = Object.freeze({
  grip: ['Присоска прилипает к плитке', ''],
  pull: ['Снимаем за минуту', 'без инструментов и усилий'],
  base: ['Под плиткой — основа с мягкими втулками', 'никакого клея и затирки'],
  bring: ['Берём плитку другого цвета', 'старая лежит целой на полке'],
  click: ['Щёлк — и держится', 'штифты вошли во втулки, шов ровный'],
  still: ['Снимается присоской за минуту', 'встаёт со щелчком, старые плитки целы'],
});

function setCaption(el, [title, note]) {
  el.replaceChildren(document.createTextNode(title));
  if (!note) return;
  const small = document.createElement('small');
  small.textContent = note;
  el.append(small);
}

function collectParts(root) {
  const tile = (id) => {
    const el = root.querySelector(id);
    return { el, shadow: el.querySelector('.shadow') };
  };
  return {
    tileA: tile('#tile-a'),
    tileB: tile('#tile-b'),
    sucker: root.querySelector('#sucker'),
    pulse: root.querySelector('#pulse'),
    sleeves: root.querySelectorAll('#sleeves .sleeve'),
  };
}

const place = (target, point, extra = {}) => gsap.set(target, { x: point.x, y: point.y, ...extra });

/** Один оборот: плитка out уезжает на полку, плитка incoming встаёт в проём. */
function addCycle(tl, parts, say, { out, outTo, incoming, inFrom }) {
  const { sucker, sleeves, pulse } = parts;

  tl.call(say('grip'))
    .set(sucker, { x: HOLE.x, y: ABOVE_Y, opacity: 0, scale: 1 })
    .to(sucker, { y: HOLE.y, opacity: 1, duration: duration.slow, ease: ease.smooth })
    .to(sucker, { scale: scale.press, duration: duration.instant })
    .to(sucker, { scale: 1, duration: duration.fast })

    .call(say('pull'))
    .to([out.el, sucker], { scale: scale.lift, duration: duration.fast, ease: ease.smooth })
    .to(out.shadow, { opacity: 1, duration: duration.fast }, '<')
    .to([out.el, sucker], { x: outTo.x, y: outTo.y, duration: duration.slow, ease: ease.sharp })
    .to(out.el, { rotation: SHELF_TILT * outTo.tiltSign, duration: duration.slow, ease: ease.sharp }, '<')
    .to(out.el, { scale: 1, duration: duration.fast, ease: ease.bounce })
    .to(out.shadow, { opacity: 0, duration: duration.fast }, '<')
    .to(sucker, { scale: 1, y: ABOVE_Y, opacity: 0, duration: duration.normal, ease: ease.sharp })

    .call(say('base'))
    .to(sleeves, { scale: 1.2, duration: duration.fast, stagger: stagger.min, yoyo: true, repeat: 1, svgOrigin: sleeveOrigin })
    .to({}, { duration: duration.normal })

    .call(say('bring'))
    .set(sucker, { x: inFrom.x, y: ABOVE_Y, scale: 1, opacity: 0 })
    .to(sucker, { y: inFrom.y, opacity: 1, duration: duration.slow, ease: ease.smooth })
    .to([incoming.el, sucker], { scale: scale.lift, duration: duration.fast, ease: ease.smooth })
    .to(incoming.shadow, { opacity: 1, duration: duration.fast }, '<')
    .to([incoming.el, sucker], { x: HOLE.x, y: HOLE.y, duration: duration.slow, ease: ease.sharp })
    .to(incoming.el, { rotation: 0, duration: duration.slow, ease: ease.sharp }, '<')

    .call(say('click'))
    .to([incoming.el, sucker], { scale: 1, duration: duration.fast, ease: 'power4.in' })
    .to(incoming.shadow, { opacity: 0, duration: duration.fast }, '<')
    .to(sleeves, { scale: 0.8, duration: duration.instant, svgOrigin: sleeveOrigin }, '<')
    .to(sleeves, { scale: 1, duration: duration.slow, ease: ease.bounce, svgOrigin: sleeveOrigin })
    .fromTo(
      pulse,
      { scale: 1, opacity: 0.9, svgOrigin: `${HOLE.x} ${HOLE.y}` },
      { scale: PULSE_GROWTH, opacity: 0, duration: duration.normal, ease: ease.smooth },
      '<',
    )
    .to(sucker, { y: ABOVE_Y, opacity: 0, duration: duration.normal, ease: ease.sharp })
    .to({}, { duration: duration.crawl });
}

function buildTimeline(parts, captionEl) {
  const say = (key) => () => setCaption(captionEl, CAPTIONS[key]);
  const { tileA, tileB, sucker, pulse } = parts;
  const tl = gsap.timeline({ repeat: -1 });

  tl.add(() => {
    place(tileA.el, HOLE, { rotation: 0, scale: 1 });
    place(tileB.el, SHELF_TOP, { rotation: 0, scale: 1 });
    gsap.set([tileA.shadow, tileB.shadow, pulse], { opacity: 0 });
    gsap.set(sucker, { opacity: 0 });
  }, 0);

  // Оборот 1: A уезжает вниз на полку, B встаёт в проём.
  addCycle(tl, parts, say, {
    out: tileA,
    outTo: { ...SHELF_BOTTOM, tiltSign: 1 },
    incoming: tileB,
    inFrom: SHELF_TOP,
  });
  // Оборот 2: B возвращается на своё место на полке, A встаёт в проём. Цикл замкнут.
  addCycle(tl, parts, say, {
    out: tileB,
    outTo: { ...SHELF_TOP, tiltSign: 0 },
    incoming: tileA,
    inFrom: SHELF_BOTTOM,
  });
  return tl;
}

/** Демонстрация в FAQ: присоска снимает плитку, под ней основа, ставится новая. */
export function initTileDemo(root) {
  const captionEl = root.querySelector('#demo-caption');
  const replayBtn = root.querySelector('#demo-replay');
  const parts = collectParts(root);

  let timeline = null;
  let visible = false;

  const syncPlayback = () => {
    if (!timeline) return;
    if (visible && !document.hidden) timeline.play();
    else timeline.pause();
  };

  const showStill = () => {
    // Итог первого оборота: новая плитка в проёме, старая на полке.
    place(parts.tileB.el, HOLE, { rotation: 0, scale: 1 });
    place(parts.tileA.el, SHELF_BOTTOM, { rotation: SHELF_TILT, scale: 1 });
    gsap.set(parts.sucker, { opacity: 0 });
    setCaption(captionEl, CAPTIONS.still);
    replayBtn.hidden = true;
  };

  const start = () => {
    timeline?.kill();
    timeline = null;
    gsap.set(parts.sleeves, { scale: 1, svgOrigin: sleeveOrigin });
    if (!shouldAnimate({ essential: true })) {
      showStill();
      return;
    }
    replayBtn.hidden = false;
    timeline = buildTimeline(parts, captionEl);
    syncPlayback();
  };

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncPlayback();
  }).observe(root);
  document.addEventListener('visibilitychange', syncPlayback);
  replayBtn.addEventListener('click', () => timeline?.restart());
  onReducedMotionChange(start);
  start();
}
