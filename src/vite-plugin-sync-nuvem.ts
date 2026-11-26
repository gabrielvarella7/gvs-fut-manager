import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import type { Plugin } from 'vite';

const execFileAsync = promisify(execFile);

const SITE_PUBLICO = 'https://gabrielvarella7.github.io/gvs-manager/';

function gitBin(): string {
  const candidates = [
    process.env.ProgramFiles && `${process.env.ProgramFiles}\\Git\\bin\\git.exe`,
    process.env['ProgramFiles(x86)'] && `${process.env['ProgramFiles(x86)']}\\Git\\bin\\git.exe`,
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return 'git';
}

async function runGit(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync(gitBin(), args, {
    cwd,
    maxBuffer: 4 * 1024 * 1024,
  });
  return String(stdout).trim();
}

export function vitePluginSyncNuvem(): Plugin {
  return {
    name: 'gvs-sync-nuvem',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/sync-nuvem' || req.method !== 'POST') {
          next();
          return;
        }
        const cwd = process.cwd();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        try {
          const status = await runGit(['status', '--porcelain'], cwd);
          if (!status) {
            try {
              await runGit(['push', 'origin', 'main'], cwd);
            } catch {
              /* remoto já atualizado */
            }
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                ok: true,
                noop: true,
                message: `Nada novo no projeto. Site: ${SITE_PUBLICO}`,
              }),
            );
            return;
          }
          const msg = `Sync ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
          await runGit(['add', '-A'], cwd);
          await runGit(['commit', '-m', msg], cwd);
          await runGit(['push', 'origin', 'main'], cwd);
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              ok: true,
              message: `Enviado! Em ~2 min atualize o celular: ${SITE_PUBLICO}`,
            }),
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, message: `Falha no sync: ${message}` }));
        }
      });
    },
  };
}