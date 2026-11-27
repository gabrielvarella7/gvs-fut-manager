import { useCallback, useState } from 'react';
import { lerPreferencias, salvarPreferencias } from '../../config/gamePreferences';
import { formatarDataSalvo, type SaveSlotMeta } from '../../career/saveSlots';
import { tocarComemoracaoTorcidaGol } from '../../audio/torcidaGol';
import { useGameStore } from '../../store/useGameStore';
import { CmBtn, CmPanel, CmShell } from '../cm/CmShell';

export function SettingsScreen() {
  const irPara = useGameStore((s) => s.irPara);
  const listar = useGameStore((s) => s.listarSaves);
  const excluirSave = useGameStore((s) => s.excluirCarreiraSalva);

  const [somGol, setSomGol] = useState(() => lerPreferencias().somGol);
  const [saves, setSaves] = useState<SaveSlotMeta[]>(() => listar());
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const SITE_NUVEM = 'https://gabrielvarella7.github.io/gvs-manager/';
  const REPO_GITHUB = 'https://github.com/gabrielvarella7/gvs-manager';
  const emDev = import.meta.env.DEV;

  const syncNuvem = async () => {
    if (!emDev) {
      setMensagem(
        'No celular não dá enviar código. No PC: duplo clique em "Sync na nuvem.bat" ou rode npm run sync.',
      );
      window.setTimeout(() => setMensagem(null), 8000);
      return;
    }
    setSyncing(true);
    setMensagem(null);
    try {
      const res = await fetch('/api/sync-nuvem', { method: 'POST' });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      setMensagem(data.message ?? (data.ok ? 'Sync ok.' : 'Falha no sync.'));
    } catch {
      setMensagem('Servidor local não respondeu. Rode npm run dev e tente de novo.');
    } finally {
      setSyncing(false);
      window.setTimeout(() => setMensagem(null), 12000);
    }
  };

  const recarregarLista = useCallback(() => {
    setSaves(listar());
  }, [listar]);

  const alternarSom = () => {
    const next = !somGol;
    setSomGol(next);
    salvarPreferencias({ somGol: next });
    if (next) {
      tocarComemoracaoTorcidaGol();
    }
  };

  const excluir = (s: SaveSlotMeta) => {
    const ok = window.confirm(
      `Excluir o save de "${s.nomeTecnico}" (${formatarDataSalvo(s.salvoEm)})? Essa ação não pode ser desfeita.`,
    );
    if (!ok) return;
    if (!excluirSave(s.id)) {
      setMensagem('Não foi possível excluir este save.');
      return;
    }
    recarregarLista();
    setMensagem('Save excluído.');
    window.setTimeout(() => setMensagem(null), 3000);
  };

  return (
    <CmShell
      titulo="Configurações"
      subtitulo="Som e salvamentos"
      rodape={
        <CmBtn variant="ghost" onClick={() => irPara('menu')}>
          Voltar ao menu
        </CmBtn>
      }
    >
      {mensagem && (
        <p className="mb-3 rounded border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-200">
          {mensagem}
        </p>
      )}

      <CmPanel className="mb-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
          Celular e nuvem
        </h2>
        <p className="mb-2 text-sm text-zinc-300">
          <strong className="text-zinc-100">Jogar no celular:</strong> abra o link abaixo no navegador (Chrome/Safari).
          Opcional: menu do navegador → &quot;Adicionar à tela inicial&quot; para atalho tipo app.
        </p>
        <a
          href={SITE_NUVEM}
          target="_blank"
          rel="noreferrer"
          className="mb-3 block break-all text-sm text-emerald-400 underline"
        >
          {SITE_NUVEM}
        </a>
        <p className="mb-2 text-sm text-zinc-300">
          <strong className="text-zinc-100">Editar o jogo pelo celular:</strong> abra o repositório no app GitHub ou
          no navegador, edite arquivos (ex. <code className="text-zinc-400">public/database/</code>, telas em{' '}
          <code className="text-zinc-400">src/</code>) e faça commit na branch{' '}
          <code className="text-zinc-400">gvs-manager</code> (não use main — é outro projeto). O site
          atualiza em 1–2 min após o commit.
        </p>
        <a
          href={REPO_GITHUB}
          target="_blank"
          rel="noreferrer"
          className="mb-3 block text-sm text-emerald-400 underline"
        >
          {REPO_GITHUB}
        </a>
        <p className="mb-3 text-xs text-amber-200/90">
          Saves da carreira ficam no navegador de cada aparelho — não sincronizam entre PC e celular automaticamente.
        </p>
        <div className="flex flex-wrap gap-2">
          <CmBtn variant="primary" onClick={syncNuvem} disabled={syncing}>
            {syncing ? 'Enviando…' : 'Sync — atualizar site (PC)'}
          </CmBtn>
          {!emDev && (
            <span className="self-center text-xs text-zinc-500">
              Sync de código: PC (.bat) ou commit pelo GitHub no celular.
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {emDev
            ? 'No localhost, Sync commita e envia para o GitHub (deploy automático via GitHub Actions).'
            : 'No PC: Sync na nuvem.bat. No celular: edite no GitHub e salve na main.'}
        </p>
      </CmPanel>

      <CmPanel className="mb-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">Áudio</h2>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-600"
            checked={somGol}
            onChange={alternarSom}
          />
          <span>
            <span className="block font-medium text-zinc-100">Som de gol (torcida)</span>
            <span className="text-sm text-zinc-500">
              Toca o clipe de torcida (~1 s) na transmissão quando sair gol.
            </span>
          </span>
        </label>
      </CmPanel>

      <CmPanel>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
          Jogos salvos
        </h2>
        {saves.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum save na lista. Salve uma carreira no escritório ou torneio.</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {saves.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-zinc-100">{s.nomeTecnico}</p>
                  <p className="text-xs text-zinc-500">{formatarDataSalvo(s.salvoEm)}</p>
                </div>
                <CmBtn variant="danger" onClick={() => excluir(s)}>
                  Excluir
                </CmBtn>
              </li>
            ))}
          </ul>
        )}
      </CmPanel>
    </CmShell>
  );
}