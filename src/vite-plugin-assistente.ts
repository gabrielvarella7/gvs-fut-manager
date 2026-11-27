import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
// Knowledge + Gemini proxy (server-only). Runtime ESM; types via ambient module.
import { handleAssistenteRequest } from '../server/assistente/geminiAssistente.mjs';

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function pathOf(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url, 'http://localhost').pathname;
  } catch {
    return url.split('?')[0] ?? '';
  }
}

/**
 * Em `npm run dev`, expõe GET/POST /api/assistente lendo GEMINI_API_KEY do ambiente.
 */
export function vitePluginAssistente(): Plugin {
  return {
    name: 'gvs-assistente-gemini',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = pathOf(req.url);
        if (path !== '/api/assistente') {
          next();
          return;
        }

        try {
          let body: unknown = undefined;
          if ((req.method || 'GET').toUpperCase() === 'POST') {
            try {
              body = await readJsonBody(req as IncomingMessage);
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ ok: false, error: 'JSON inválido.' }));
              return;
            }
          }

          const out = await handleAssistenteRequest({ method: req.method, body });
          (res as ServerResponse).statusCode = out.status;
          for (const [k, v] of Object.entries(out.headers)) {
            res.setHeader(k, String(v));
          }
          if (out.body == null) {
            res.end();
          } else {
            res.end(out.body);
          }
        } catch (e) {
          console.error('[assistente]', e);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, error: 'Erro interno no assistente.' }));
        }
      });
    },
  };
}
