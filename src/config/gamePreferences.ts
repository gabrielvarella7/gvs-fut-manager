const KEY = 'gvs_game_preferences';

export interface GamePreferences {
  somGol: boolean;
}

const PADRAO: GamePreferences = {
  somGol: true,
};

function lerBruto(): GamePreferences {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...PADRAO };
    const parsed = JSON.parse(raw) as Partial<GamePreferences>;
    return {
      somGol: parsed.somGol !== false,
    };
  } catch {
    return { ...PADRAO };
  }
}

export function lerPreferencias(): GamePreferences {
  return lerBruto();
}

export function salvarPreferencias(patch: Partial<GamePreferences>): GamePreferences {
  const atual = lerBruto();
  const next: GamePreferences = {
    somGol: patch.somGol ?? atual.somGol,
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function somGolAtivo(): boolean {
  return lerBruto().somGol;
}