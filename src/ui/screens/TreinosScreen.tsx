import { useMemo, useState } from 'react';
import { nivelStaff } from '../../career/staffEfeitos';
import { formacaoIdDeEsquema } from '../../engine/tacticsEngine';
import type {
  PlanoIndividualId,
  RegimeIntensidadeId,
} from '../../types/training';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmBtn, CmPanel } from '../cm/CmShell';

export function TreinosScreen() {
  const clubeRealId = useGameStore((s) => s.clubeRealId);
  const jogadores = useGameStore((s) => s.jogadoresReais);
  const mundo = useGameStore((s) => s.mundoClube);
  const brasileirao = useGameStore((s) => s.brasileirao);
  const esquema = useGameStore((s) => s.esquemaAtual);
  const dbTreinos = useGameStore((s) => s.dbTreinos);
  const aplicar = useGameStore((s) => s.aplicarTreinoSemana);
  const atualizarProgramacao = useGameStore((s) => s.atualizarProgramacaoTreino);
  const definirPlano = useGameStore((s) => s.definirPlanoIndividualTreino);

  const [feedback, setFeedback] = useState<string | null>(null);

  const rodada = brasileirao?.rodadaAtual ?? 0;
  const jaTreinou = mundo?.ultimoTreino?.rodadaAplicada === rodada;
  const prep = mundo ? nivelStaff(mundo, 'PREPARADOR_FISICO') : 10;
  const prog = mundo?.programacaoTreino;

  const formacaoId = formacaoIdDeEsquema(esquema);
  const fam = prog?.familiaridade_formacoes[formacaoId] ?? 55;
  const entros = prog?.entrosamento_elenco ?? 60;

  const elenco = useMemo(
    () =>
      clubeRealId
        ? [...jogadores.filter((j) => j.time_id === clubeRealId)].sort(
            (a, b) => b.overall - a.overall,
          )
        : [],
    [jogadores, clubeRealId],
  );

  const executar = () => {
    const err = aplicar();
    setFeedback(err ?? 'Semana processada — bônus ativos no próximo jogo.');
    window.setTimeout(() => setFeedback(null), 6000);
  };

  if (!dbTreinos || !prog) {
    return (
      <CmCareerShell titulo="Treinos" subtitulo="Carregando base…">
        <p className="text-zinc-400">Aguarde o banco de treinos.</p>
      </CmCareerShell>
    );
  }

  return (
    <CmCareerShell
      titulo="Treinos"
      subtitulo={`Rodada ${rodada} · Prep. físico ${prep}/20 · Familiaridade ${formacaoId}: ${Math.round(fam)}% · Entrosamento ${entros}%`}
    >
      {feedback && (
        <p className="mb-3 rounded border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {feedback}
        </p>
      )}

      {mundo?.bonusTreinoProximoJogo &&
        Object.keys(mundo.bonusTreinoProximoJogo).length > 0 && (
          <CmPanel className="mb-4 border-emerald-800/50">
            <p className="text-xs font-semibold uppercase text-emerald-300">Bônus para o próximo jogo</p>
            <p className="mt-1 text-sm text-zinc-300">
              Execução tática ×{(mundo.multiplicadorExecucaoTaticaTreino ?? 1).toFixed(2)} ·{' '}
              {Object.entries(mundo.bonusTreinoProximoJogo)
                .slice(0, 4)
                .map(([k, v]) => `${k.replace(/_/g, ' ')} ×${v}`)
                .join(' · ')}
            </p>
          </CmPanel>
        )}

      {jaTreinou && (
        <CmPanel className="mb-4 border-amber-800/60">
          <p className="text-sm text-amber-100">
            Treino desta rodada já aplicado. Dispute o jogo ou avance o calendário para treinar de
            novo.
          </p>
        </CmPanel>
      )}

      <CmPanel className="mb-4">
        <h2 className="mb-2 text-sm font-semibold text-emerald-400">Regime de intensidade</h2>
        <motionRegimes
          regimes={dbTreinos.regimes_intensidade}
          selecionado={prog.regime_id}
          onChange={(id) => atualizarProgramacao({ regime_id: id as RegimeIntensidadeId })}
        />
      </CmPanel>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <CmPanel>
          <h2 className="mb-2 text-sm font-semibold text-emerald-400">Sessão principal</h2>
          <SessaoSelect
            sessoes={dbTreinos.sessoes_coletivas}
            value={prog.sessao_principal_id}
            onChange={(id) => atualizarProgramacao({ sessao_principal_id: id })}
          />
        </CmPanel>
        <CmPanel>
          <h2 className="mb-2 text-sm font-semibold text-emerald-400">Sessão secundária</h2>
          <SessaoSelect
            sessoes={dbTreinos.sessoes_coletivas}
            value={prog.sessao_secundaria_id}
            onChange={(id) => atualizarProgramacao({ sessao_secundaria_id: id })}
          />
        </CmPanel>
      </div>

      <CmPanel className="mb-4">
        <h2 className="mb-2 text-sm font-semibold text-emerald-400">Plano individual (elenco)</h2>
        <p className="mb-2 text-xs text-zinc-500">
          XP acumula entre rodadas; a 100 XP sobe +1 no atributo. Polivalência reduz improvisação
          na partida.
        </p>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {elenco.slice(0, 22).map((j) => {
            const est = mundo?.estadosTreino?.find((e) => e.jogador_id === j.id);
            const plano = est?.plano_individual_id ?? 'MAESTRO_DISTRIBUICAO';
            const lesao = j.lesao && j.lesao.diasRestantes > 0;
            return (
              <motionLinhaPlano
                key={j.id}
                nome={j.nome}
                pos={j.posicao}
                ovr={j.overall}
                energia={Math.round(j.energia)}
                lesao={lesao}
                plano={plano}
                planos={dbTreinos.planos_individuais}
                poliv={est?.progresso_polivalencia ?? 0}
                onPlano={(p) => definirPlano(j.id, p)}
              />
            );
          })}
        </div>
      </CmPanel>

      <CmBtn onClick={executar} disabled={jaTreinou}>
        {jaTreinou ? 'Treino feito' : 'Processar semana de treinos'}
      </CmBtn>
    </CmCareerShell>
  );
}

function motionRegimes({
  regimes,
  selecionado,
  onChange,
}: {
  regimes: { id: string; nome: string; descricao: string }[];
  selecionado: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {regimes.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          className={`rounded-lg border p-3 text-left text-sm ${
            selecionado === r.id
              ? 'border-emerald-600 bg-emerald-950/50'
              : 'border-zinc-700 hover:border-zinc-500'
          }`}
        >
          <p className="font-medium text-zinc-100">{r.nome}</p>
          <p className="mt-1 text-xs text-zinc-500">{r.descricao}</p>
        </button>
      ))}
    </div>
  );
}

function SessaoSelect({
  sessoes,
  value,
  onChange,
}: {
  sessoes: { id: string; nome: string; pilar: string; descricao: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
    >
      {sessoes.map((s) => (
        <option key={s.id} value={s.id}>
          [{s.pilar}] {s.nome}
        </option>
      ))}
    </select>
  );
}

function motionLinhaPlano({
  nome,
  pos,
  ovr,
  energia,
  lesao,
  plano,
  planos,
  poliv,
  onPlano,
}: {
  nome: string;
  pos: string;
  ovr: number;
  energia: number;
  lesao: boolean;
  plano: PlanoIndividualId;
  planos: { id: PlanoIndividualId; nome: string }[];
  poliv: number;
  onPlano: (p: PlanoIndividualId) => void;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded px-2 py-1.5 text-sm ${
        lesao ? 'opacity-50' : 'bg-zinc-900/50'
      }`}
    >
      <span className="min-w-[120px] text-zinc-200">
        {nome}{' '}
        <span className="text-xs text-zinc-500">
          {pos} {ovr} · {energia}%
        </span>
      </span>
      <select
        disabled={lesao}
        value={plano}
        onChange={(e) => onPlano(e.target.value as PlanoIndividualId)}
        className="ml-auto max-w-[200px] flex-1 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-xs text-zinc-200"
      >
        {planos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
      {poliv > 0 && (
        <span className="text-[10px] text-emerald-400">Poliv. {poliv}%</span>
      )}
    </div>
  );
}