const LOW_END_CORES = 4;
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

const defaultWindow = () => (typeof window === 'undefined' ? undefined : window);
const defaultNavigator = () => (typeof navigator === 'undefined' ? undefined : navigator);

/** Пользователь отключил анимации в системе. Без window считаем, что нет. */
export function prefersReducedMotion(win = defaultWindow()) {
  return Boolean(win?.matchMedia?.(REDUCED_QUERY)?.matches);
}

/** Слабое устройство: 4 ядра и меньше. Неизвестное значение слабым не считаем. */
export function isLowEnd(nav = defaultNavigator()) {
  const cores = nav?.hardwareConcurrency;
  return typeof cores === 'number' && cores <= LOW_END_CORES;
}

/**
 * Можно ли анимировать.
 * reduced-motion отключает всё, включая «важное».
 * Слабое устройство отключает только необязательное.
 */
export function shouldAnimate({ essential = false, win = defaultWindow(), nav = defaultNavigator() } = {}) {
  if (prefersReducedMotion(win)) return false;
  if (!essential && isLowEnd(nav)) return false;
  return true;
}

/** Подписка на смену системной настройки. Возвращает функцию отписки. */
export function onReducedMotionChange(callback, win = defaultWindow()) {
  const query = win?.matchMedia?.(REDUCED_QUERY);
  if (!query?.addEventListener) return () => {};
  const handler = (event) => callback(event.matches);
  query.addEventListener('change', handler);
  return () => query.removeEventListener('change', handler);
}
