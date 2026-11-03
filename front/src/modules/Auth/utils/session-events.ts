export const SESSION_CHANGED = 'fairy-world:session-changed';

export function notifySessionChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent?.(new Event(SESSION_CHANGED));
}
