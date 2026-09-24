import { payloadText, quickStartCommand } from './resources.js';

function initializeDocs() {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const toastElement = $('#toast');
  let toastTimer;

  function toast(message) {
    if (!toastElement) return;
    clearTimeout(toastTimer);
    toastElement.textContent = message;
    toastElement.classList.add('show');
    toastTimer = setTimeout(() => toastElement.classList.remove('show'), 3000);
  }

  const examples = { payload: payloadText, setup: quickStartCommand };
  $$('[data-example]').forEach(element => {
    element.textContent = examples[element.dataset.example] || '';
  });

  function highlightCode(element) {
    const source = element.textContent;
    const language = element.dataset.language;
    const comments = {
      rust: '//[^\\n]*',
      lua: '--[^\\n]*',
      bash: '#[^\\n]*'
    };
    const comment = comments[language] || '(?!)';
    const strings = '"(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'';
    const keywords = '\\b(?:true|false|null|if|then|end|async|fn|let|await|import)\\b';
    const numbers = '-?\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b';
    const pattern = new RegExp(`${comment}|${strings}|${keywords}|${numbers}`, 'gm');
    const fragment = document.createDocumentFragment();
    let cursor = 0;

    for (const match of source.matchAll(pattern)) {
      fragment.append(document.createTextNode(source.slice(cursor, match.index)));
      const token = document.createElement('span');
      const value = match[0];
      const isComment = (language === 'rust' && value.startsWith('//')) ||
        (language === 'lua' && value.startsWith('--')) ||
        (language === 'bash' && value.startsWith('#'));

      let kind = 'keyword';
      if (isComment) kind = 'comment';
      else if (/^["']/.test(value)) {
        kind = language === 'json' && /^\s*:/.test(source.slice(match.index + value.length))
          ? 'key' : 'string';
      } else if (/^-?\d/.test(value)) kind = 'number';

      token.className = `token-${kind}`;
      token.textContent = value;
      fragment.append(token);
      cursor = match.index + value.length;
    }
    fragment.append(document.createTextNode(source.slice(cursor)));
    element.replaceChildren(fragment);
  }

  $$('code[data-language]').forEach(highlightCode);

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const field = document.createElement('textarea');
      const previousFocus = document.activeElement;
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.append(field);
      let copied = false;
      try {
        field.select();
        copied = document.execCommand('copy');
      } catch {
        copied = false;
      } finally {
        field.remove();
        previousFocus?.focus?.({ preventScroll: true });
      }
      return copied;
    }
  }

  $$('[data-copy-block]').forEach(button => {
    button.addEventListener('click', async () => {
      const code = button.closest('.doc-code')?.querySelector('code');
      if (!code) return;
      const copied = await copyText(code.textContent);
      toast(copied ? 'Copied. Go make something peachy.' : 'Please select and copy the example manually.');
      if (!copied) return;
      const label = button.querySelector('span');
      if (label) label.textContent = 'Copied';
      button.disabled = true;
      setTimeout(() => {
        if (label) label.textContent = 'Copy';
        button.disabled = false;
      }, 1600);
    });
  });

  const sections = $$('.doc-section');
  const navLinks = $$('.docs-sidebar .sidebar-link, #page-outline a');
  const select = $('#chapter-select');
  const progress = $('#reading-progress');
  let activeSection = '';
  let ticking = false;

  function syncNavigation() {
    const offset = window.innerWidth <= 620 ? 155 : 135;
    let current = sections[0]?.id;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= offset) current = section.id;
    }

    if (current && activeSection !== current) {
      activeSection = current;
      navLinks.forEach(link => {
        const active = link.hash === `#${current}`;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      if (select) select.value = current;
    }

    const distance = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 1;
    if (progress) progress.style.transform = `scaleX(${fraction})`;
    ticking = false;
  }

  function scheduleNavigation() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(syncNavigation);
  }

  function jumpTo(id) {
    const section = document.getElementById(id);
    if (!section) return;
    section.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start'
    });
    try {
      history.replaceState(null, '', `#${id}`);
    } catch {
      // Scrolling remains available when history access is restricted.
    }
    section.setAttribute('tabindex', '-1');
    section.focus({ preventScroll: true });
    section.addEventListener('blur', () => section.removeAttribute('tabindex'), { once: true });
  }

  select?.addEventListener('change', () => jumpTo(select.value));
  window.addEventListener('scroll', scheduleNavigation, { passive: true });
  window.addEventListener('resize', scheduleNavigation, { passive: true });
  document.addEventListener('toggle', scheduleNavigation, true);
  window.addEventListener('load', syncNavigation, { once: true });
  document.fonts?.ready.then(scheduleNavigation);
  syncNavigation();

  const dialog = $('#docs-search');
  const openButton = $('#open-search');
  const closeButton = $('#close-search');
  const input = $('#docs-search-input');
  const results = $('#search-results');
  const caption = $('#search-caption');
  let previousFocus;

  const searchIndex = sections.map(section => ({
    id: section.id,
    title: section.dataset.title,
    group: section.dataset.group,
    preview: section.querySelector('p')?.textContent.trim() || '',
    text: section.textContent.toLowerCase()
  }));

  function renderSearch() {
    if (!input || !results) return;
    const query = input.value.trim().toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    const matches = searchIndex
      .filter(item => terms.every(term => `${item.title.toLowerCase()} ${item.text}`.includes(term)))
      .sort((a, b) => Number(b.title.toLowerCase().includes(query)) - Number(a.title.toLowerCase().includes(query)));

    results.replaceChildren();
    if (caption) {
      caption.textContent = query
        ? `${matches.length} ${matches.length === 1 ? 'chapter' : 'chapters'} found`
        : 'EXPLORE THE GUIDE';
    }

    if (!matches.length) {
      const empty = document.createElement('p');
      empty.className = 'search-empty';
      empty.textContent = 'No chapters found. Try “equilibrium”, “schema”, or “Ableton”.';
      results.append(empty);
      return;
    }

    matches.forEach(item => {
      const link = document.createElement('a');
      link.href = `#${item.id}`;
      link.className = 'search-result';
      const group = document.createElement('span');
      const title = document.createElement('strong');
      const preview = document.createElement('p');
      group.textContent = item.group.toUpperCase();
      title.textContent = item.title;
      preview.textContent = item.preview;
      link.append(group, title, preview);
      link.addEventListener('click', event => {
        event.preventDefault();
        dialog?.close();
        requestAnimationFrame(() => jumpTo(item.id));
      });
      results.append(link);
    });
  }

  function openSearch() {
    if (!dialog || !input || dialog.open) return;
    previousFocus = document.activeElement;
    input.value = '';
    renderSearch();
    dialog.showModal();
    document.body.classList.add('modal-open');
    input.focus();
  }

  openButton?.addEventListener('click', openSearch);
  closeButton?.addEventListener('click', () => dialog?.close());
  input?.addEventListener('input', renderSearch);
  dialog?.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    previousFocus?.focus?.({ preventScroll: true });
  });

  dialog?.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });

  dialog?.addEventListener('keydown', event => {
    const links = results ? [...results.querySelectorAll('a')] : [];
    if (!links.length) return;
    const index = links.indexOf(document.activeElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      links[(index + 1) % links.length].focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (index <= 0) input?.focus();
      else links[index - 1].focus();
    } else if (event.key === 'Enter' && document.activeElement === input) {
      event.preventDefault();
      links[0].click();
    }
  });

  document.addEventListener('keydown', event => {
    const typing = event.target instanceof Element &&
      (event.target.matches('input,textarea,select') || event.target.closest('[contenteditable="true"]'));
    const shortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    if (shortcut || (event.key === '/' && !typing && !event.altKey && !event.metaKey && !event.ctrlKey)) {
      event.preventDefault();
      openSearch();
    }
  });

  const shortcutLabel = openButton?.querySelector('kbd');
  if (shortcutLabel && !/Mac|iPhone|iPad/.test(navigator.platform)) shortcutLabel.textContent = 'Ctrl K';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDocs, { once: true });
} else {
  initializeDocs();
}