/**
 * Public demo accounts are read-only. The server refuses every write from them (403); this module only
 * keeps the interface honest by hiding controls that would write, so visitors are not offered actions that
 * cannot succeed. Exports and navigation stay. A control can opt out with the data-allow-demo attribute.
 */
const WRITE_LABEL = /^(\+\s*)?(new|add|create|edit|delete|remove|save|generate|upload|import|submit|approve|reject|update|archive|unarchive|manage|invite|reset|deactivate|activate|duplicate|close ncr|mark)\b/i;
const WRITE_ICON = /lucide-(plus|trash|trash-2|pencil|pen|pen-line|square-pen|edit|edit-2|edit-3|upload|save|user-plus|archive|archive-restore|check-circle|send)\b/;
const HIDDEN = 'data-demo-hidden';

function isWriteControl(el: HTMLElement): boolean {
  if (el.closest('[data-allow-demo]')) return false;
  if (el.closest('[role="dialog"]') && /^(cancel|close)$/i.test((el.textContent || '').trim())) return false;
  const label = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim();
  if (WRITE_LABEL.test(label)) return true;
  if (el.getAttribute('type') === 'submit') return true;
  const svg = el.querySelector('svg');
  // Icon-only buttons (no visible text) are judged by their icon.
  if (svg && !(el.textContent || '').trim() && WRITE_ICON.test(svg.getAttribute('class') || '')) return true;
  // Labelled buttons whose leading icon is a write icon (e.g. "+ Equipment").
  if (svg && el.firstElementChild === svg && WRITE_ICON.test(svg.getAttribute('class') || '') && !/export|pdf|excel|download|view|open/i.test(label)) return true;
  return false;
}

function sweep(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('button, a[href], [role="button"], input[type="file"]').forEach(el => {
    if (el.hasAttribute(HIDDEN)) return;
    if (el instanceof HTMLInputElement || isWriteControl(el)) {
      el.setAttribute(HIDDEN, '');
      el.style.display = 'none';
    }
  });
}

/** Starts hiding write controls; returns a function that stops and restores them. */
export function enableDemoReadOnly(): () => void {
  document.documentElement.dataset.readonly = 'demo';
  sweep(document.body);
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; sweep(document.body); });
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return () => {
    observer.disconnect();
    delete document.documentElement.dataset.readonly;
    document.querySelectorAll<HTMLElement>(`[${HIDDEN}]`).forEach(el => { el.removeAttribute(HIDDEN); el.style.display = ''; });
  };
}
