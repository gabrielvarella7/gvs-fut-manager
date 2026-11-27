/**
 * Proxy fino para Google Gemini — só regras do Mestre Mou.
 * Usa GEMINI_API_KEY do ambiente (nunca no bundle do cliente).
 */
import { montarSystemInstruction } from './conhecimento.mjs';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const MAX_MESSAGE_CHARS = 1200;
const MAX_HISTORY = 8;

/**
 * @param {{ apiKey?: string }} [opts]
 */
export function geminiConfigured(opts = {}) {
  return Boolean((opts.apiKey ?? process.env.GEMINI_API_KEY)?.trim());
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, mensagem: string, historico: { role: 'user'|'model', text: string }[] } | { ok: false, error: string, status: number }}
 */
export function parseAssistenteBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Corpo JSON inválido.', status: 400 };
  }
  const mensagem = typeof body.mensagem === 'string' ? body.mensagem.trim() : '';
  if (!mensagem) {
    return { ok: false, error: 'Envie uma pergunta no campo "mensagem".', status: 400 };
  }
  if (mensagem.length > MAX_MESSAGE_CHARS) {
    return {
      ok: false,
      error: `Pergunta muito longa (máx. ${MAX_MESSAGE_CHARS} caracteres).`,
      status: 400,
    };
  }
  const historicoRaw = Array.isArray(body.historico) ? body.historico : [];
  /** @type {{ role: 'user'|'model', text: string }[]} */
  const historico = [];
  for (const item of historicoRaw.slice(-MAX_HISTORY)) {
    if (!item || typeof item !== 'object') continue;
    const role = item.role === 'model' || item.role === 'user' ? item.role : null;
    const text = typeof item.text === 'string' ? item.text.trim() : '';
    if (!role || !text) continue;
    historico.push({ role, text: text.slice(0, MAX_MESSAGE_CHARS) });
  }
  return { ok: true, mensagem, historico };
}

/**
 * @param {{ mensagem: string, historico: { role: 'user'|'model', text: string }[], apiKey?: string, model?: string }} input
 */
export async function perguntarGemini(input) {
  const apiKey = (input.apiKey ?? process.env.GEMINI_API_KEY)?.trim();
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      code: 'assistente_indisponivel',
      error:
        'Assistente indisponível: configure a variável de ambiente GEMINI_API_KEY no servidor (nunca no Vite público).',
    };
  }

  const contents = [
    ...input.historico.map((h) => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }],
    })),
    { role: 'user', parts: [{ text: input.mensagem }] },
  ];

  const model = input.model || process.env.GEMINI_MODEL || GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: montarSystemInstruction() }] },
        contents,
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 768,
        },
      }),
    });
  } catch {
    return {
      ok: false,
      status: 502,
      code: 'rede',
      error: 'Não foi possível contactar o Gemini. Verifique a rede e tente de novo.',
    };
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      data?.error?.message && typeof data.error.message === 'string'
        ? data.error.message
        : `HTTP ${res.status}`;
    const status = res.status === 429 ? 429 : res.status >= 500 ? 502 : 400;
    return {
      ok: false,
      status,
      code: 'gemini_erro',
      error: `Gemini recusou a chamada: ${detail}`,
    };
  }

  const texto =
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => (typeof p?.text === 'string' ? p.text : ''))
      .join('')
      .trim() || '';

  if (!texto) {
    return {
      ok: false,
      status: 502,
      code: 'resposta_vazia',
      error: 'O Gemini não devolveu texto. Tente reformular a pergunta.',
    };
  }

  return { ok: true, resposta: texto, modelo: model };
}

/**
 * Handler HTTP compartilhado (Vite middleware, Vercel, Cloudflare via adaptador).
 * @param {{ method?: string, body?: unknown, apiKey?: string, model?: string }} req
 */
export async function handleAssistenteRequest(req) {
  const method = (req.method || 'GET').toUpperCase();
  const envOpts = { apiKey: req.apiKey, model: req.model };

  if (method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders(), body: null };
  }

  if (method === 'GET') {
    const configured = geminiConfigured(envOpts);
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() },
      body: JSON.stringify({
        ok: true,
        configured,
        message: configured
          ? 'Assistente pronto.'
          : 'Assistente indisponível: defina GEMINI_API_KEY no ambiente do servidor.',
      }),
    };
  }

  if (method !== 'POST') {
    return {
      status: 405,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() },
      body: JSON.stringify({ ok: false, error: 'Use GET (status) ou POST (pergunta).' }),
    };
  }

  const parsed = parseAssistenteBody(req.body);
  if (!parsed.ok) {
    return {
      status: parsed.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() },
      body: JSON.stringify({ ok: false, error: parsed.error }),
    };
  }

  const result = await perguntarGemini({ ...parsed, ...envOpts });
  if (!result.ok) {
    return {
      status: result.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() },
      body: JSON.stringify({
        ok: false,
        code: result.code,
        error: result.error,
      }),
    };
  }

  return {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() },
    body: JSON.stringify({ ok: true, resposta: result.resposta, modelo: result.modelo }),
  };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
