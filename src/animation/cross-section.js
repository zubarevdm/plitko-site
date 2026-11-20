/**
 * Highlights one of five parts on the cross-section when the matching
 * list item is hovered, focused or toggled. Keyboard accessible (buttons).
 */
export function initCrossSection(figure, list) {
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
