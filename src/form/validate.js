export const LIMITS = Object.freeze({
  nameMin: 2,
  nameMax: 80,
  wallMax: 1000,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEGRAM_RE = /^@[A-Za-z0-9_]{5,32}$/;
const PHONE_MIN_DIGITS = 10;
const PHONE_MAX_DIGITS = 15;

function isPhone(value) {
  if (!/^[+\d][\d\s()\-]*$/.test(value)) return false;
  const digits = value.replace(/\D/g, '').length;
  return digits >= PHONE_MIN_DIGITS && digits <= PHONE_MAX_DIGITS;
}

function isContact(value) {
  return EMAIL_RE.test(value) || TELEGRAM_RE.test(value) || isPhone(value);
}

/**
 * Pure validation of the pre-order form.
 * Returns a new object; never mutates the input.
 */
export function validateLead(input) {
  const name = String(input.name ?? '').trim();
  const contact = String(input.contact ?? '').trim();
  const wall = String(input.wall ?? '').trim();

  if (String(input.website ?? '').trim() !== '') {
    return { valid: false, spam: true, errors: {} };
  }

  const errors = {};
  if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) {
    errors.name = 'Укажите имя';
  }
  if (!isContact(contact)) {
    errors.contact = 'Телефон, Telegram (@имя) или e-mail';
  }
  if (wall.length > LIMITS.wallMax) {
    errors.wall = `Не длиннее ${LIMITS.wallMax} символов`;
  }
  if (input.consent !== true) {
    errors.consent = 'Нужно согласие на обработку данных';
  }

  return { valid: Object.keys(errors).length === 0, spam: false, errors };
}
