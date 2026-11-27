/**
 * Vercel Serverless Function — POST/GET /api/assistente
 * Segredo: GEMINI_API_KEY (Project → Settings → Environment Variables).
 */
import { handleAssistenteRequest } from '../server/assistente/geminiAssistente.mjs';

export default async function handler(req, res) {
  try {
    const out = await handleAssistenteRequest({
      method: req.method,
      body: req.body,
    });
    for (const [k, v] of Object.entries(out.headers)) {
      res.setHeader(k, v);
    }
    if (out.status === 204) {
      res.status(204).end();
      return;
    }
    res.status(out.status).send(out.body);
  } catch (e) {
    console.error('[api/assistente]', e);
    res.status(500).json({ ok: false, error: 'Erro interno no assistente.' });
  }
}
