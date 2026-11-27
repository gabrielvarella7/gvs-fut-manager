/**
 * Cloudflare Worker — proxy Gemini para o Mestre Mou (GitHub Pages).
 *
 * Deploy:
 *   cd workers/assistente
 *   npx wrangler secret put GEMINI_API_KEY
 *   npx wrangler deploy
 *
 * No build do Pages (ou Vercel só estático), defina:
 *   VITE_ASSISTENTE_API_URL=https://mestre-mou-assistente.<sua-conta>.workers.dev
 */
import { handleAssistenteRequest } from '../../server/assistente/geminiAssistente.mjs';

export default {
  /**
   * @param {Request} request
   * @param {{ GEMINI_API_KEY?: string, GEMINI_MODEL?: string }} env
   */
  async fetch(request, env) {
    const method = request.method || 'GET';
    let body;
    if (method === 'POST') {
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: 'JSON inválido.' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    const out = await handleAssistenteRequest({
      method,
      body,
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
    });
    return new Response(out.body, { status: out.status, headers: out.headers });
  },
};
