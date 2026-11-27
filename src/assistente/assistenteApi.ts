export type AssistenteMsg = { role: 'user' | 'model'; text: string };

export type AssistenteStatus = {
  ok: boolean;
  configured: boolean;
  message?: string;
};

export type AssistenteResposta =
  | { ok: true; resposta: string; modelo?: string }
  | { ok: false; error: string; code?: string };

/**
 * URL do proxy. Em dev/Vercel: `/api/assistente`.
 * No GitHub Pages: defina `VITE_ASSISTENTE_API_URL` apontando ao Worker/Vercel.
 */
export function assistenteEndpoint(): string {
  const fromEnv = (import.meta.env.VITE_ASSISTENTE_API_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const base = String(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  return `${base}api/assistente`;
}

export async function checarAssistente(): Promise<AssistenteStatus> {
  try {
    const res = await fetch(assistenteEndpoint(), { method: 'GET' });
    const data = (await res.json()) as AssistenteStatus;
    if (!res.ok) {
      return {
        ok: false,
        configured: false,
        message: data?.message || 'Assistente indisponível.',
      };
    }
    return {
      ok: true,
      configured: Boolean(data.configured),
      message: data.message,
    };
  } catch {
    return {
      ok: false,
      configured: false,
      message:
        'Assistente indisponível. No PC use npm run dev com GEMINI_API_KEY; no site estático configure um proxy (veja docs/ASSISTENTE-GEMINI.md).',
    };
  }
}

export async function perguntarAssistente(
  mensagem: string,
  historico: AssistenteMsg[],
): Promise<AssistenteResposta> {
  try {
    const res = await fetch(assistenteEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem, historico }),
    });
    const data = (await res.json()) as AssistenteResposta & { error?: string; code?: string };
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        code: 'code' in data ? data.code : undefined,
        error:
          ('error' in data && data.error) ||
          (res.status === 404
            ? 'Assistente indisponível neste host (sem proxy /api). Configure VITE_ASSISTENTE_API_URL ou faça deploy com funções serverless.'
            : 'Não foi possível obter resposta.'),
      };
    }
    return data;
  } catch {
    return {
      ok: false,
      error: 'Falha de rede ao contactar o assistente.',
    };
  }
}
