import { simularPartida, type MatchSimInput, type MatchSimResult } from './matchEngine';
import type {
  SimulationWorkerRequest,
  SimulationWorkerResponse,
} from './simulation.worker';

function simularPartidaNoWorkerInner(input: MatchSimInput): Promise<MatchSimResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), {
      type: 'module',
    });

    const onMessage = (event: MessageEvent<SimulationWorkerResponse>) => {
      worker.terminate();
      const data = event.data;
      if (data.type === 'SIMULATE_MATCH_RESULT') {
        resolve(data.result);
      } else {
        reject(new Error(data.message));
      }
    };

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', (e) => {
      worker.terminate();
      reject(e);
    });

    const request: SimulationWorkerRequest = { type: 'SIMULATE_MATCH', input };
    worker.postMessage(request);
  });
}

/** Worker em produção (GitHub Pages); cai para simulação na thread principal se falhar. */
export async function simularPartidaNoWorker(input: MatchSimInput): Promise<MatchSimResult> {
  try {
    return await simularPartidaNoWorkerInner(input);
  } catch (err) {
    console.warn('Worker indisponível — simulando na thread principal', err);
    return simularPartida(input);
  }
}