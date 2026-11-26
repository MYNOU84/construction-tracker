/**
 * Hides controls the signed-in user may not use, so nobody is offered an action that the server will refuse.
 * The server is the authority: it refuses every write from public demo accounts and checks every project write
 * against the role's permission matrix. This module only keeps the interface honest.
 *
 * Each button is classified into the action it performs (create, edit, delete, submit, approve) from its label or
 * icon. Exports and navigation stay. A control can opt out with the data-allow-demo attribute.
 */
import type { PermissionAction } from '../../types';

/** 'write' = a generic save (type="submit", "Save"): shown to anyone who may create or edit. */
export type ControlAction = Exclude<PermissionAction, 'view' | 'export' | 'review'> | 'write';

const LABEL_ACTIONS: [RegExp, ControlAction][] = [
  [/^(\+\s*)?(delete|remove|deactivate)\b/i, 'delete'],
  [/^(\+\s*)?(approve|reject|close ncr)\b/i, 'approve'],
  [/^(\+\s*)?(submit|send|issue)\b/i, 'submit'],
  [/^(\+\s*)?(new|add|create|generate|upload|import|duplicate|invite)\b/i, 'create'],
  [/^(\+\s*)?(edit|update|archive|unarchive|manage|reset|activate|mark)\b/i, 'edit'],
  [/^(\+\s*)?save\b/i, 'write'],
];
const ICON_ACTIONS: [RegExp, ControlAction][] = [
  [/lucide-(trash|trash-2)\b/, 'delete'],
  [/lucide-(check-circle|circle-check)\b/, 'approve'],
  [/lucide-send\b/, 'submit'],
  [/lucide-(plus|upload|user-plus)\b/, 'create'],
  [/lucide-(pencil|pen|pen-line|square-pen|edit|edit-2|edit-3|archive|archive-restore)\b/, 'edit'],
  [/lucide-save\b/, 'write'],
];
const HIDDEN = 'data-demo-hidden';

const iconAction = (svg: Element | null): ControlAction | null => {
  const cls = svg?.getAttribute('class') || '';
  for (const [re, a] of ICON_ACTIONS) if (re.test(cls)) return a;
  return null;
};

/** The write action a control performs, or null for reading, exporting and navigation. */
export function controlAction(el: HTMLElement): ControlAction | null {
  if (el.closest('[data-allow-demo]')) return null;
  if (el instanceof HTMLInputElement) return 'create'; // file inputs
  const text = (el.textContent || '').trim();
  if (el.closest('[role="dialog"]') && /^(cancel|close)$/i.test(text)) return null;
  const label = (el.getAttribute('aria-label') || el.getAttribute('title') || text).trim();
  for (const [re, a] of LABEL_ACTIONS) if (re.test(label)) return a;
  if (el.getAttribute('type') === 'submit') return 'write';
  const svg = el.querySelector('svg');
  // Icon-only buttons (no visible text) are judged by their icon.
  if (svg && !text) return iconAction(svg);
  // Labelled buttons whose leading icon is a write icon (e.g. "+ Equipment").
  if (svg && el.firstElementChild === svg && !/export|pdf|excel|download|view|open/i.test(label)) return iconAction(svg);
  return null;
}

function sweep(root: ParentNode, allowed: (a: ControlAction) => boolean) {
  root.querySelectorAll<HTMLElement>('button, a[href], [role="button"], input[type="file"]').forEach(el => {
    if (el.hasAttribute(HIDDEN)) return;
    const action = controlAction(el);
    if (action && !allowed(action)) {
      el.setAttribute(HIDDEN, '');
      el.style.display = 'none';
    }
  });
}

/** Starts hiding the controls whose action is not allowed; returns a function that stops and restores them. */
export function enableReadOnly(allowed: (a: ControlAction) => boolean, mode = 'role'): () => void {
  document.documentElement.dataset.readonly = mode;
  sweep(document.body, allowed);
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; sweep(document.body, allowed); });
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return () => {
    observer.disconnect();
    delete document.documentElement.dataset.readonly;
    document.querySelectorAll<HTMLElement>(`[${HIDDEN}]`).forEach(el => { el.removeAttribute(HIDDEN); el.style.display = ''; });
  };
}

/** Public demo accounts: every write control is hidden. */
export const enableDemoReadOnly = () => enableReadOnly(() => false, 'demo');
