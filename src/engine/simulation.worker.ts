import { simularPartida, type MatchSimInput, type MatchSimResult } from './matchEngine';

export type SimulationWorkerRequest = {
  type: 'SIMULATE_MATCH';
  input: MatchSimInput;
};

export type SimulationWorkerResponse =
  | { type: 'SIMULATE_MATCH_RESULT'; result: MatchSimResult }
  | { type: 'ERROR'; message: string };

self.onmessage = (event: MessageEvent<SimulationWorkerRequest>) => {
  try {
    if (event.data.type !== 'SIMULATE_MATCH') {
      throw new Error(`Mensagem desconhecida: ${event.data.type}`);
    }
    const t0 = performance.now();
    const result = simularPartida(event.data.input);
    result.duracaoMs = performance.now() - t0;
    const response: SimulationWorkerResponse = { type: 'SIMULATE_MATCH_RESULT', result };
    self.postMessage(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const response: SimulationWorkerResponse = { type: 'ERROR', message };
    self.postMessage(response);
  }
};