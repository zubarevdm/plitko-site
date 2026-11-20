import {
  SIZES,
  canPlace,
  clearBoard,
  createBoard,
  fillPattern,
  placeTile,
  removeTileAt,
  summarize,
  tileAt,
} from './board.js';

const COLS = 12;
const ROWS = 6;
const CELL = 40; // px в координатах SVG = 50 мм
const GROUT = 1.6; // шов 2 мм
const LEAVE_MS = 260;
const SVG_NS = 'http://www.w3.org/2000/svg';

const COLORS = Object.freeze({
  cream: '#f7eedd',
  peach: '#daa38f',
  terra: '#b5573f',
  sage: '#92ada4',
  sand: '#c7a982',
  dark: '#3a2d26',
});

const HINT = Object.freeze({
  placed: 'Плитка на месте. Нажмите на неё, чтобы закрепить.',
  pressed: 'Щёлк. Штифты в гнёздах, плитка держится.',
  blocked: 'Сюда не помещается: мешает край или другая плитка.',
  removed: 'Сняли присоской. Основа цела, ставьте другую.',
  empty: 'Здесь пусто. Присоской снимают плитку.',
  preset: 'Готовая раскладка. Снимайте плитки присоской и ставьте свои.',
  cleared: 'Основа пустая. Выберите плитку и нажмите на основу.',
});

const PRESETS = Object.freeze({
  pinwheel: (x, y) =>
    (((x - 2 * y) % 5) + 5) % 5 === 0 ? { size: 'big', color: 'cream' } : { size: 'small', color: 'terra' },
  checker: (x, y) => ({ size: 'big', color: (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? 'sage' : 'cream' }),
  brick: (x, y) =>
    (x + (y % 2)) % 2 === 0 ? { size: 'wide', color: y === ROWS - 1 ? 'terra' : 'cream' } : { size: 'small', color: y === ROWS - 1 ? 'terra' : 'cream' },
  scatter: (x, y) => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const r = n - Math.floor(n);
    if (r < 0.28) return { size: 'small', color: r < 0.12 ? 'terra' : 'peach' };
    return { size: 'big', color: 'cream' };
  },
});

function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function tileRect(size, x, y) {
  const { w, h } = SIZES[size];
  return {
    x: x * CELL + GROUT / 2,
    y: y * CELL + GROUT / 2,
    width: w * CELL - GROUT,
    height: h * CELL - GROUT,
  };
}

function drawBase(svg) {
  const base = el('g', { class: 'builder__base' });
  base.append(el('rect', { x: 0, y: 0, width: COLS * CELL, height: ROWS * CELL, rx: 4, fill: '#7a5f47' }));
  for (let y = 0; y < ROWS * 2; y += 1) {
    for (let x = 0; x < COLS * 2; x += 1) {
      const cx = (x + 0.5) * (CELL / 2);
      const cy = (y + 0.5) * (CELL / 2);
      base.append(el('circle', { cx, cy, r: 4.6, fill: '#8d725a' }), el('circle', { cx, cy, r: 3, fill: '#3a2d26' }));
    }
  }
  svg.append(base);
}

function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function describeLayout(board) {
  const s = summarize(board);
  if (!s.count) return '';
  const parts = Object.entries(s.bySize)
    .filter(([, n]) => n)
    .map(([size, n]) => `${SIZES[size].label} — ${n}`);
  return `Моя раскладка из конструктора: ${parts.join(', ')} (${s.areaM2.toFixed(2).replace('.', ',')} м²)`;
}

export function initBuilder(root) {
  if (!root) return;
  const svg = root.querySelector('#builder-svg');
  const hintEl = root.querySelector('#builder-hint');
  const statsEl = root.querySelector('#builder-stats');
  const cta = root.querySelector('#builder-cta');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  svg.setAttribute('viewBox', `-6 -6 ${COLS * CELL + 12} ${ROWS * CELL + 12}`);
  drawBase(svg);
  const tilesLayer = el('g');
  const ghost = el('rect', { class: 'builder__ghost', rx: 3 });
  svg.append(tilesLayer, ghost);

  const state = {
    board: createBoard(COLS, ROWS),
    size: 'big',
    color: 'peach',
    tool: 'place',
    looseId: null,
    cursor: { x: 0, y: 0 },
  };
  const nodes = new Map();

  const setHint = (text) => {
    hintEl.textContent = text;
  };

  function renderStats() {
    const s = summarize(state.board);
    statsEl.textContent = `Плиток: ${s.count} · ${s.areaM2.toFixed(2).replace('.', ',')} м² · основа закрыта на ${Math.round(s.filled * 100)}%`;
  }

  function addNode(tile, loose) {
    const g = el('g', { class: `builder__tile${loose ? ' is-loose' : ''}`, 'data-id': tile.id });
    g.append(el('rect', { ...tileRect(tile.size, tile.x, tile.y), rx: 3, fill: COLORS[tile.color] }));
    tilesLayer.append(g);
    nodes.set(tile.id, g);
  }

  function rebuild() {
    tilesLayer.replaceChildren();
    nodes.clear();
    state.looseId = null;
    state.board.tiles.forEach((tile) => addNode(tile, false));
    renderStats();
  }

  function press(id) {
    const node = nodes.get(id);
    if (!node) return;
    node.classList.remove('is-loose');
    if (!reduceMotion) {
      node.classList.remove('is-pressing');
      node.getBBox();
      node.classList.add('is-pressing');
    }
    state.looseId = null;
  }

  function anchorFor(px, py) {
    const { w, h } = SIZES[state.size];
    const x = Math.min(Math.max(Math.round(px / CELL - w / 2), 0), COLS - w);
    const y = Math.min(Math.max(Math.round(py / CELL - h / 2), 0), ROWS - h);
    return { x, y };
  }

  function showGhost(x, y) {
    if (state.tool !== 'place' || tileAt(state.board, x, y)?.id === state.looseId) {
      ghost.style.display = 'none';
      return;
    }
    const ok = canPlace(state.board, state.size, x, y);
    for (const [key, value] of Object.entries(tileRect(state.size, x, y))) ghost.setAttribute(key, value);
    ghost.setAttribute('fill', COLORS[state.color]);
    ghost.classList.toggle('is-blocked', !ok);
    ghost.style.display = '';
  }

  function act(x, y, cellX = x, cellY = y) {
    const hit = tileAt(state.board, cellX, cellY);
    if (state.tool === 'place' && hit && hit.id === state.looseId) {
      press(hit.id);
      setHint(HINT.pressed);
      return;
    }
    if (state.tool === 'remove') {
      const { board, tile } = removeTileAt(state.board, cellX, cellY);
      if (!tile) {
        setHint(HINT.empty);
        return;
      }
      state.board = board;
      if (tile.id === state.looseId) state.looseId = null;
      const node = nodes.get(tile.id);
      nodes.delete(tile.id);
      node.classList.add('is-leaving');
      setTimeout(() => node.remove(), reduceMotion ? 0 : LEAVE_MS);
      setHint(HINT.removed);
      renderStats();
      return;
    }
    if (state.looseId) press(state.looseId);
    const { board, tile } = placeTile(state.board, { size: state.size, color: state.color, x, y });
    if (!tile) {
      setHint(HINT.blocked);
      ghost.classList.remove('is-shake');
      ghost.getBBox();
      ghost.classList.add('is-shake');
      return;
    }
    state.board = board;
    addNode(tile, true);
    state.looseId = tile.id;
    setHint(HINT.placed);
    renderStats();
    showGhost(x, y);
  }

  function toSvg(event) {
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  svg.addEventListener('pointerdown', () => svg.classList.remove('is-keyboard'));
  svg.addEventListener('pointermove', (event) => {
    const p = toSvg(event);
    const a = anchorFor(p.x, p.y);
    state.cursor = a;
    showGhost(a.x, a.y);
  });
  svg.addEventListener('pointerleave', () => {
    ghost.style.display = 'none';
  });
  svg.addEventListener('click', (event) => {
    const p = toSvg(event);
    const cx = Math.floor(p.x / CELL);
    const cy = Math.floor(p.y / CELL);
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
    const a = anchorFor(p.x, p.y);
    act(a.x, a.y, cx, cy);
  });

  svg.addEventListener('focus', () => showGhost(state.cursor.x, state.cursor.y));
  svg.addEventListener('blur', () => {
    ghost.style.display = 'none';
  });
  svg.addEventListener('keydown', (event) => {
    svg.classList.add('is-keyboard');
    const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    const { w, h } = SIZES[state.size];
    if (move) {
      event.preventDefault();
      state.cursor = {
        x: Math.min(Math.max(state.cursor.x + move[0], 0), COLS - w),
        y: Math.min(Math.max(state.cursor.y + move[1], 0), ROWS - h),
      };
      showGhost(state.cursor.x, state.cursor.y);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      act(state.cursor.x, state.cursor.y);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      const prev = state.tool;
      state.tool = 'remove';
      act(state.cursor.x, state.cursor.y);
      state.tool = prev;
    }
  });

  root.addEventListener('change', (event) => {
    const { name, value } = event.target;
    if (name === 'builder-size') state.size = value;
    if (name === 'builder-color') state.color = value;
    if (name === 'builder-tool') {
      state.tool = value;
      svg.dataset.tool = value;
    }
    ghost.style.display = 'none';
  });

  root.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      state.board = fillPattern(state.board, PRESETS[button.dataset.preset], 'cream');
      rebuild();
      setHint(HINT.preset);
    });
  });
  root.querySelector('#builder-clear').addEventListener('click', () => {
    state.board = clearBoard(state.board);
    rebuild();
    setHint(HINT.cleared);
  });

  cta.addEventListener('click', () => {
    const wall = document.getElementById('f-wall');
    const text = describeLayout(state.board);
    if (wall && text && !wall.value.trim()) wall.value = text;
  });

  // Стартовое состояние: половина основы уже выложена, одна плитка ждёт нажатия.
  let start = fillPattern(state.board, PRESETS.pinwheel, 'cream');
  for (const tile of start.tiles) {
    if (tile.x >= 6) start = removeTileAt(start, tile.x, tile.y).board;
  }
  state.board = start;
  rebuild();
  const demo = placeTile(state.board, { size: 'big', color: 'peach', x: 8, y: 2 });
  if (demo.tile) {
    state.board = demo.board;
    addNode(demo.tile, true);
    state.looseId = demo.tile.id;
    renderStats();
  }
}
