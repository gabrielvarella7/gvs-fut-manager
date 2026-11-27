import { useEffect, useState } from 'react';
import { esquemaOuPadrao } from '../../data/esquemasTaticos';
import { simularPartida, type MatchSimResult } from '../../engine/matchEngine';
import { taticaCpuAutomatica } from '../../engine/tacticsEngine';
import { carregarDatabaseTaticas } from '../../db/tacticsDatabase';
import { publicPath } from '../../publicPath';
import type { Jogador, Time } from '../../types/schema';
import { MatchEventTimeline } from './MatchEventTimeline';
import { MatchPlayback } from '../MatchPlayback';

/**
 * Preview isolado: `?preview=timeline`
 * Simula uma partida real e anima a timeline acima do comentário.
 */
export function TimelinePreviewPage() {
  const [result, setResult] = useState<MatchSimResult | null>(null);
  const [nomes, setNomes] = useState({ m: 'Mandante', v: 'Visitante' });
  const [erro, setErro] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [placar, setPlacar] = useState({ m: 0, v: 0 });

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const [dbTaticas, timesRes, jogsRes] = await Promise.all([
          carregarDatabaseTaticas(),
          fetch(publicPath('database/times.json')),
          fetch(publicPath('database/jogadores.json')),
        ]);
        if (!timesRes.ok || !jogsRes.ok) throw new Error('Falha ao carregar base');
        const times = (await timesRes.json()) as Time[];
        const jogadoresBrutos = (await jogsRes.json()) as Jogador[];

        const porSlugOuId = new Map<string, string>();
        for (const t of times) {
          porSlugOuId.set(t.id, t.id);
          porSlugOuId.set(t.id.toLowerCase(), t.id);
          if (t.slug) {
            porSlugOuId.set(t.slug, t.id);
            porSlugOuId.set(t.slug.toLowerCase(), t.id);
          }
        }
        const jogadores = jogadoresBrutos.map((j) => {
          const bruto = j.time_id?.trim() ?? '';
          const time_id = bruto
            ? (porSlugOuId.get(bruto) ?? porSlugOuId.get(bruto.toLowerCase()) ?? bruto)
            : '';
          return { ...j, time_id };
        });

        const porTime = new Map<string, Jogador[]>();
        for (const j of jogadores) {
          if (!j.time_id) continue;
          const list = porTime.get(j.time_id) ?? [];
          list.push(j);
          porTime.set(j.time_id, list);
        }

        const m = times.find((t) => t.id === 'FLA') ?? times[0]!;
        const v = times.find((t) => t.id === 'PAL') ?? times.find((t) => t.id !== m.id)!;
        const elencoM = porTime.get(m.id) ?? [];
        const elencoV = porTime.get(v.id) ?? [];
        if (elencoM.length < 14 || elencoV.length < 14) {
          throw new Error(`Elenco insuficiente (${elencoM.length}/${elencoV.length})`);
        }

        const esqM = esquemaOuPadrao(m.esquema_tatico_padrao);
        const esqV = esquemaOuPadrao(v.esquema_tatico_padrao);
        const sim = simularPartida({
          mandante: {
            timeId: m.id,
            nomeCurto: m.nome_completo || m.nome,
            esquema: esqM,
            elenco: elencoM,
            mandoDeCampo: true,
            tatica: taticaCpuAutomatica(esqM, m.id),
          },
          visitante: {
            timeId: v.id,
            nomeCurto: v.nome_completo || v.nome,
            esquema: esqV,
            elenco: elencoV,
            tatica: taticaCpuAutomatica(esqV, v.id),
          },
          dbTaticas,
          config: { bonusMandoCampo: 1.05 },
          estadio: m.estadio,
          seed: 42,
        });
        if (!cancelado) {
          setResult(sim);
          setNomes({
            m: m.nome_completo || m.nome,
            v: v.nome_completo || v.nome,
          });
        }
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  if (erro) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 text-rose-300">
        Erro no preview: {erro}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 text-zinc-400">
        Gerando partida para preview da timeline…
      </div>
    );
  }

  const visiveis = result.lancamentos.slice(0, idx);

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100">
      <div className="mx-auto max-w-2xl space-y-3">
        <p className="text-xs uppercase tracking-widest text-emerald-400">Mestre Mou · Preview</p>
        <h1 className="text-lg font-semibold text-emerald-50">Comentário — linha do tempo</h1>
        <nav className="flex gap-1 border-b border-zinc-800 pb-2 text-xs">
          <span className="rounded bg-emerald-900 px-2 py-1 font-medium text-emerald-100">
            Comentário
          </span>
          <span className="rounded px-2 py-1 text-zinc-500">Estatísticas</span>
        </nav>
        <MatchEventTimeline
          lancamentos={visiveis}
          mandanteId={result.mandanteId}
          placarAtual={placar}
        />
        <MatchPlayback
          result={result}
          mandanteNome={nomes.m}
          visitanteNome={nomes.v}
          velocidade={4}
          onProgress={(p) => {
            setIdx(p.idx);
            setPlacar({ m: p.golsM, v: p.golsV });
          }}
        />
      </div>
    </div>
  );
}
