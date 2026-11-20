import '@fontsource-variable/geologica';
import '@fontsource-variable/onest';
import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/figures.css';
import './styles/motion.css';
import './styles/faq-visuals.css';
import './styles/builder.css';

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { config } from './config.js';
import { initFigureStage } from './figures/figure-stage.js';
import { initBackdrop } from './figures/backdrop.js';
import { initReveal } from './motion/reveal.js';
import { initTileDemo } from './animation/tile-demo.js';
import { initCrossSection } from './animation/cross-section.js';
import { initBuilder } from './builder/builder.js';
import { validateLead } from './form/validate.js';
import { submitLead } from './form/submit.js';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

const STATUS_TEXT = Object.freeze({
  success: 'Спасибо! Мы свяжемся с вами и посчитаем комплект.',
  network: 'Не получилось отправить. Проверьте соединение и попробуйте ещё раз.',
  server: 'Сервер не принял заявку. Попробуйте ещё раз или напишите в Telegram:',
  'no-endpoint': 'Приём заявок временно недоступен. Напишите нам в Telegram:',
});

function readUtm() {
  const params = new URLSearchParams(location.search);
  return Object.fromEntries(UTM_KEYS.filter((key) => params.has(key)).map((key) => [key, params.get(key)]));
}

function reachGoal(goal) {
  if (config.metrikaId && typeof window.ym === 'function') {
    window.ym(Number(config.metrikaId), 'reachGoal', goal);
  }
}

function showErrors(form, errors) {
  form.querySelectorAll('.field').forEach((field) => {
    const message = errors[field.dataset.field] ?? '';
    field.toggleAttribute('data-invalid', Boolean(message));
    field.querySelector('.field__error').textContent = message;
  });
}

function setStatus(el, state, text, withTelegramLink = false) {
  el.dataset.state = state;
  el.textContent = text;
  if (withTelegramLink) {
    const link = document.createElement('a');
    link.href = config.telegramUrl;
    link.rel = 'noopener';
    link.textContent = ` ${config.telegramHandle}`;
    el.append(link);
  }
}

function readForm(form) {
  const data = new FormData(form);
  return {
    name: data.get('name'),
    contact: data.get('contact'),
    wall: data.get('wall'),
    website: data.get('website'),
    consent: data.get('consent') === 'on',
  };
}

function initForm(form) {
  const statusEl = form.querySelector('#form-status');
  const submitBtn = form.querySelector('#f-submit');
  const utm = readUtm();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitBtn.disabled) return;

    const lead = readForm(form);
    const result = validateLead(lead);
    if (result.spam) {
      showErrors(form, {});
      setStatus(statusEl, 'success', STATUS_TEXT.success);
      return;
    }
    showErrors(form, result.errors);
    if (!result.valid) {
      setStatus(statusEl, 'error', 'Проверьте поля формы.');
      return;
    }

    submitBtn.disabled = true;
    setStatus(statusEl, 'pending', 'Отправляем…');
    const outcome = await submitLead(lead, { endpoint: config.formEndpoint, utm });
    submitBtn.disabled = false;

    if (outcome.ok) {
      form.reset();
      setStatus(statusEl, 'success', STATUS_TEXT.success);
      reachGoal('preorder_submitted');
      return;
    }
    console.warn('Lead submit failed:', outcome.reason);
    setStatus(statusEl, 'error', STATUS_TEXT[outcome.reason], true);
  });
}

/**
 * Сайт всегда открывается с верха. Браузерное восстановление прокрутки
 * плохо сочетается с закреплённым первым экраном, поэтому отключаем его.
 * Ссылки с якорем (#order и т.п.) работают как обычно.
 */
function startAtTop() {
  // ScrollTrigger сам запоминает позицию и возвращает её после перезагрузки: сбрасываем.
  ScrollTrigger.clearScrollMemory('manual');
  if (!location.hash) window.scrollTo(0, 0);
}

function init() {
  startAtTop();
  initBackdrop();
  initFigureStage(document.getElementById('figure-stage'));
  document.getElementById('year').textContent = String(new Date().getFullYear());
  initTileDemo(document.getElementById('tile-demo'));
  initCrossSection(document.getElementById('anatomy-figure'), document.getElementById('parts'));
  initBuilder(document.getElementById('builder'));
  initForm(document.getElementById('order-form'));
  initReveal();
}

init();
