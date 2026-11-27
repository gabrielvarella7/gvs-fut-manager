import { useEffect } from 'react';
import { tocarAudioGolBoasVindas } from '../../audio/torcidaGol';
import { publicPath } from '../../publicPath';

type Props = {
  onComecar: () => void;
};

export function WelcomeSplashScreen({ onComecar }: Props) {
  useEffect(() => {
    tocarAudioGolBoasVindas();
  }, []);

  const handleComecar = () => {
    tocarAudioGolBoasVindas();
    onComecar();
  };

  return (
    <div className="welcome-splash flex min-h-screen flex-col items-center justify-center px-4 py-8 text-center">
      <div className="welcome-splash__glow" aria-hidden />
      <p className="cm-brand mb-2 text-xs uppercase tracking-[0.2em] text-emerald-400">Mestre Mou</p>
      <h1 className="mb-6 max-w-lg text-3xl font-semibold tracking-tight text-emerald-50 sm:text-4xl">
        Bem-vindo ao Mestre Mou
      </h1>

      <div className="welcome-splash__photo mb-8 inline-block max-w-full overflow-hidden rounded-lg border border-emerald-700/40 shadow-lg shadow-black/40">
        <img
          src={publicPath('assets/mourinho-welcome.jpg')}
          alt="José Mourinho de terno, sorrindo"
          className="welcome-splash__img block h-auto max-w-full"
          width={1008}
          height={900}
        />
      </div>

      <button
        type="button"
        onClick={handleComecar}
        className="welcome-splash__cta rounded-md bg-emerald-700 px-10 py-3.5 text-lg font-semibold text-white shadow-md transition hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
      >
        Começar
      </button>

      <p className="mt-6 max-w-sm text-[10px] leading-relaxed text-zinc-500">
        Foto: Chelsea Debs (@cfcunofficial) —{' '}
        <a
          className="underline decoration-zinc-600 underline-offset-2 hover:text-zinc-400"
          href="https://commons.wikimedia.org/wiki/File:Chelsea_2_Spurs_0_Capital_One_Cup_winners_2015_(16507117799).jpg"
          target="_blank"
          rel="noreferrer"
        >
          Wikimedia Commons
        </a>
        , CC BY-SA 2.0
      </p>
    </div>
  );
}
