export function geminiConfigured(opts?: { apiKey?: string }): boolean;

export function parseAssistenteBody(body: unknown):
  | { ok: true; mensagem: string; historico: { role: 'user' | 'model'; text: string }[] }
  | { ok: false; error: string; status: number };

export function perguntarGemini(input: {
  mensagem: string;
  historico: { role: 'user' | 'model'; text: string }[];
  apiKey?: string;
  model?: string;
}): Promise<
  | { ok: true; resposta: string; modelo: string }
  | { ok: false; status: number; code: string; error: string }
>;

export function handleAssistenteRequest(req: {
  method?: string;
  body?: unknown;
  apiKey?: string;
  model?: string;
}): Promise<{
  status: number;
  headers: Record<string, string>;
  body: string | null;
}>;
