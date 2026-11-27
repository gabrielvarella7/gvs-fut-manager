import type { MatchHighlightManager } from './MatchHighlightManager';
import type { HighlightMode } from './types';

const MODE_BY_VALUE: Record<string, HighlightMode> = {
  ON: 'ON',
  ONLY_GOALS: 'ONLY_GOALS',
  OFF: 'OFF',
  // Portuguese labels used in the live selector
  'APENAS GOLS': 'ONLY_GOALS',
  APENAS_GOLS: 'ONLY_GOALS',
};

/**
 * Bind a &lt;select id="…"&gt; (or any changeable control) to HighlightMode.
 * Port of Gabriel’s bindHighlightControls.
 */
export function bindHighlightControls(
  elementId: string,
  manager: MatchHighlightManager,
): () => void {
  const el = document.getElementById(elementId);
  if (!el) return () => undefined;

  const apply = () => {
    const raw =
      el instanceof HTMLSelectElement || el instanceof HTMLInputElement
        ? el.value
        : (el.getAttribute('data-mode') ?? 'ON');
    const mode = MODE_BY_VALUE[raw] ?? MODE_BY_VALUE[raw.toUpperCase()] ?? 'ON';
    manager.setMode(mode);
  };

  apply();
  el.addEventListener('change', apply);
  return () => el.removeEventListener('change', apply);
}
