import { somGolAtivo } from '../config/gamePreferences';

import { publicPath } from '../publicPath';

const SRC_GOL = publicPath('audio/gol-torcida.mp3');
/** Duração audível na transmissão (corte do trecho do arquivo). */
const DURACAO_S = 1;

let clip: HTMLAudioElement | null = null;
let pararTimer: ReturnType<typeof setTimeout> | null = null;

function obterClip(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!clip) {
    clip = new Audio(SRC_GOL);
    clip.preload = 'auto';
  }
  return clip;
}

/** ~1s — comemoração de torcida (MP3) ao marcar gol. */
export function tocarComemoracaoTorcidaGol(): void {
  if (!somGolAtivo()) return;
  const audio = obterClip();
  if (!audio) return;

  if (pararTimer != null) {
    window.clearTimeout(pararTimer);
    pararTimer = null;
  }

  audio.pause();
  audio.currentTime = 0;
  void audio.play().catch(() => {
    /* autoplay bloqueado até interação do usuário */
  });

  pararTimer = window.setTimeout(() => {
    audio.pause();
    pararTimer = null;
  }, DURACAO_S * 1000);
}