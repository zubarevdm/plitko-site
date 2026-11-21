/**
 * Highlights one of five parts on the cross-section when the matching
 * list item is hovered, focused or toggled. Keyboard accessible (buttons).
 */
const FULL_VIEW = '0 0 640 300';
// На телефоне показываем одну плитку крупно, а не две мелко
const PHONE_VIEW = '10 24 330 276';
const PHONE_QUERY = '(max-width: 559px)';

function fitViewBox(svg) {
  const media = window.matchMedia(PHONE_QUERY);
  const apply = () => svg.setAttribute('viewBox', media.matches ? PHONE_VIEW : FULL_VIEW);
  media.addEventListener('change', apply);
  apply();
}

export function initCrossSection(figure, list) {
  const svg = figure.querySelector('svg');
  if (svg) fitViewBox(svg);
  const parts = figure.querySelectorAll('.part');
  const buttons = list.querySelectorAll('button[data-part]');
  let pinned = null;

  const show = (id) => {
    if (id === null) {
      figure.removeAttribute('data-active');
    } else {
      figure.setAttribute('data-active', id);
    }
    parts.forEach((part) => part.classList.toggle('is-active', part.dataset.part === id));
  };

  const sync = () => {
    show(pinned);
    buttons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.part === pinned)));
  };

  buttons.forEach((btn) => {
    const id = btn.dataset.part;
    btn.addEventListener('click', () => {
      pinned = pinned === id ? null : id;
      sync();
    });
    btn.addEventListener('pointerenter', () => show(id));
    btn.addEventListener('pointerleave', () => show(pinned));
    btn.addEventListener('focus', () => show(id));
    btn.addEventListener('blur', () => show(pinned));
  });
}
