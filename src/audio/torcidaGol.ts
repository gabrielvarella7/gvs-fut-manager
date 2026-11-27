import { somGolAtivo } from '../config/gamePreferences';

import { publicPath } from '../publicPath';

const SRC_GOL = publicPath('audio/gol-torcida.mp3');
/** Duração audível na transmissão (corte do trecho do arquivo). */
const DURACAO_S = 1;

let clip: HTMLAudioElement | null = null;
let pararTimer: number | null = null;

function obterClip(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!clip) {
    clip = new Audio(SRC_GOL);
    clip.preload = 'auto';
  }
  return clip;
}

function limparPararTimer(): void {
  if (pararTimer != null) {
    window.clearTimeout(pararTimer);
    pararTimer = null;
  }
}

/** ~1s — comemoração de torcida (MP3) ao marcar gol. */
export function tocarComemoracaoTorcidaGol(): void {
  if (!somGolAtivo()) return;
  const audio = obterClip();
  if (!audio) return;

  limparPararTimer();

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

/**
 * Áudio de gol completo na tela de boas-vindas.
 * Tenta tocar ao montar a splash; se o autoplay for bloqueado, chame de novo no Clique em Começar.
 * Se já estiver tocando, não reinicia (evita duplicar no Começar).
 */
export function tocarAudioGolBoasVindas(): void {
  if (!somGolAtivo()) return;
  const audio = obterClip();
  if (!audio) return;

  if (!audio.paused && audio.currentTime > 0.05) return;

  limparPararTimer();

  audio.pause();
  audio.currentTime = 0;
  void audio.play().catch(() => {
    /* autoplay bloqueado até interação do usuário */
  });
}