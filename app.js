import {
  payloadText,
  repositoryURL,
  quickStartCommand
} from './resources.js';

function initializePage() {
  const $ = selector => document.querySelector(selector);
  const dialog = $('#site-dialog');
  const content = $('#dialog-content');
  const dialogClose = $('.dialog-close');
  const heroMedia = $('.hero-media');
  const animationButton = $('#animation-toggle');
  const menuButton = $('#menu-button');
  const mobileNav = $('#mobile-nav');
  const toastElement = $('#toast');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let toastTimeout;
  let previousFocus;
  let userPaused = false;

  const icon = name =>
    `<svg class="icon small" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  const copyValues = {
    payload: payloadText,
    command: 'cargo run -p primeswarm-pchi',
    setup: quickStartCommand
  };

  function escapeHTML(text) {
    return String(text).replace(/[&<>"]/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    })[character]);
  }

  function highlightJSON(text) {
    return escapeHTML(text).replace(
      /(&quot;(?:\\.|[^&])*?&quot;)(\s*:)?|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/g,
      (match, string, colon, boolean, number) => {
        if (string) {
          return `<span class="${colon ? 'json-key' : 'json-string'}">${string}</span>${colon || ''}`;
        }
        return `<span class="${boolean ? 'json-boolean' : 'json-number'}">${boolean || number}</span>`;
      }
    );
  }

  const payloadCode = $('#payload-code');
  if (payloadCode) payloadCode.innerHTML = highlightJSON(payloadText);

  function toast(message) {
    if (!toastElement) return;
    clearTimeout(toastTimeout);
    toastElement.textContent = message;
    toastElement.classList.add('show');
    toastTimeout = setTimeout(() => toastElement.classList.remove('show'), 3200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard.');
      return;
    } catch {
      const field = document.createElement('textarea');
      const focusedElement = document.activeElement;
      field.value = text;
      field.readOnly = true;
      field.style.cssText = 'position:fixed;left:-9999px;top:0';
      (dialog?.open && content ? content : document.body).appendChild(field);

      let copied = false;
      try {
        field.select();
        copied = document.execCommand('copy');
      } catch {
        copied = false;
      } finally {
        field.remove();
        focusedElement?.focus?.({ preventScroll: true });
      }

      toast(copied
        ? 'Copied to clipboard.'
        : 'Copy unavailable. Please select and copy the text.');
    }
  }

  function setAnimationUI() {
    const paused = userPaused || reducedMotion.matches;
    heroMedia?.classList.toggle('motion-paused', paused || document.hidden);
    if (!animationButton) return;

    const label = reducedMotion.matches
      ? 'Background animation disabled by reduced motion preference'
      : paused ? 'Play background animation' : 'Pause background animation';

    animationButton.disabled = reducedMotion.matches;
    animationButton.setAttribute('aria-label', label);
    animationButton.title = label;
    animationButton.innerHTML = icon(paused ? 'play' : 'pause');
  }

  animationButton?.addEventListener('click', () => {
    userPaused = !userPaused;
    setAnimationUI();
  });

  document.addEventListener('visibilitychange', setAnimationUI);

  if (typeof reducedMotion.addEventListener === 'function') {
    reducedMotion.addEventListener('change', setAnimationUI);
  } else {
    reducedMotion.addListener?.(setAnimationUI);
  }

  function closeMenu() {
    if (mobileNav) mobileNav.hidden = true;
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Open navigation');
  }

  menuButton?.addEventListener('click', () => {
    if (!mobileNav) return;
    const opening = mobileNav.hidden;
    mobileNav.hidden = !opening;
    menuButton.setAttribute('aria-expanded', String(opening));
    menuButton.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation');
  });

  mobileNav?.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('a,button')) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });

  function closeDialog() {
    if (dialog?.open) dialog.close();
  }

  dialogClose?.addEventListener('click', closeDialog);

  dialog?.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom
    ) closeDialog();
  });

  dialog?.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    if (previousFocus?.isConnected) previousFocus.focus?.();
  });

  $('.dialog-header .brand')?.addEventListener('click', closeDialog);

  function showStart() {
    if (!dialog || !content) return;
    closeMenu();
    if (!dialog.open) previousFocus = document.activeElement;

    content.innerHTML = `
      <div class="eyebrow">PCHI 2.0 / GET STARTED</div>
      <h2 id="dialog-title">Let’s get everything in sync.</h2>
      <p>Start with the PCHI repository, connect your creative tools, and pass a verified scene state through your system.</p>

      <h3>01 — Clone the repository</h3>
      <p>With Git, Rust, and Cargo installed, clone <strong>vdmo/pchi</strong> and run the conductor. Check the repository README for current prerequisites and configuration.</p>
      <div class="dialog-code"><button class="copy-button" data-copy="setup" aria-label="Copy setup commands">${icon('copy')}</button>${escapeHTML(quickStartCommand)}</div>

      <h3>02 — Connect your creative stack</h3>
      <p>Browse the integration sources in <strong>tools</strong> and protocol definitions in <strong>pchi-schema</strong>. Match each integration’s transport, ports, and serialization to your conductor.</p>
      <div class="dialog-actions">
        <a class="button button-glass" href="${repositoryURL}/tree/main/tools" target="_blank" rel="noopener noreferrer">Integration Files ${icon('up-right')}</a>
        <a class="button button-glass" href="${repositoryURL}/tree/main/pchi-schema" target="_blank" rel="noopener noreferrer">Protocol Schemas ${icon('up-right')}</a>
      </div>

      <h3>03 — Verify before rendering</h3>
      <p>Use the repository’s implementation and documentation to configure state verification. Structural schema validation does not replace mathematical verification.</p>
      <div class="doc-callout"><p>All source and documentation links point to <strong>github.com/vdmo/pchi</strong>. To download an individual file, open it on GitHub and use its raw-file download control.</p></div>

      <div class="dialog-actions">
        <a class="button button-dark" href="${repositoryURL}/" target="_blank" rel="noopener noreferrer">Open Repository ${icon('github')}</a>
        <a class="button button-glass" href="./docs.html">Read the Docs ${icon('arrow')}</a>
      </div>
    `;

    if (!dialog.open) dialog.showModal();
    document.body.classList.add('modal-open');
    dialog.scrollTop = 0;
    dialogClose?.focus();
  }

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;

    if (
      mobileNav && !mobileNav.hidden &&
      !mobileNav.contains(event.target) &&
      !menuButton?.contains(event.target)
    ) closeMenu();

    const target = event.target.closest('button, a');
    if (!target) return;

    if (target.dataset.dialog === 'start') showStart();

    const copyKey = target.dataset.copy;
    if (copyKey && Object.hasOwn(copyValues, copyKey)) {
      copyText(copyValues[copyKey]);
    }
  });

  setAnimationUI();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage, { once: true });
} else {
  initializePage();
}