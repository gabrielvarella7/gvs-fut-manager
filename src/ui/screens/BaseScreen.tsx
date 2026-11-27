import {
  chancePromocaoBase,
  investimentoBaseMensal,
  rotuloFocoBase,
} from '../../career/mundoParalelo';
import { nivelDiretorBase } from '../../career/staffEfeitos';
import {
  ctBaseNivel5,
  MSG_PLANTEL_CHEIO,
  pesosTierBase,
  plantelProfissionalCount,
  rotuloTierBase,
  TETO_PLANTEL_PROFISSIONAL,
} from '../../career/youthAcademy';
import type { FocoCategoriaBase, NivelInvestimentoBase } from '../../types/mundoClube';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmBtn, CmPanel } from '../cm/CmShell';

const NIVEIS: { nivel: NivelInvestimentoBase; rotulo: string }[] = [
  { nivel: 0, rotulo: 'Mínimo' },
  { nivel: 1, rotulo: 'Básico' },
  { nivel: 2, rotulo: 'Intermediário' },
  { nivel: 3, rotulo: 'Elite' },
];

const FOCOS: { id: FocoCategoriaBase; titulo: string; detalhe: string }[] = [
  {
    id: 'VENDER_PROFISSIONALIZAR',
    titulo: 'Vender / profissionalizar',
    detalhe:
      'Prioriza atacantes, pontas e meias criativos — liquidez no mercado e ativos negociáveis.',
  },
  {
    id: 'TITULARES_CLUBE',
    titulo: 'Titulares do clube',
    detalhe:
      'Forma para posições carentes ou envelhecidas do plantel profissional.',
  },
  {
    id: 'EQUILIBRADO',
    titulo: 'Equilibrado',
    detalhe: 'Distribui indicações entre os setores com equilíbrio.',
  },
];

export function BaseScreen() {
  const mundo = useGameStore((s) => s.mundoClube);
  const jogadores = useGameStore((s) => s.jogadoresReais);
  const clubeId = useGameStore((s) => s.clubeRealId);
  const definir = useGameStore((s) => s.definirInvestimentoBase);
  const definirFoco = useGameStore((s) => s.definirFocoBase);
  const promover = useGameStore((s) => s.promoverJovemDaBase);
  const irPara = useGameStore((s) => s.irPara);
  const base = mundo?.base;
  const chance = base ? Math.round(chancePromocaoBase(mundo!) * 100) : 0;
  const diretor = mundo ? nivelDiretorBase(mundo) : 10;
  const sub20 = base?.elencoSub20 ?? [];
  const sugestoes = base?.sugestoesPromocao ?? [];
  const plantel = clubeId ? plantelProfissionalCount(jogadores, clubeId) : 0;
  const pesos = base ? pesosTierBase(base.qualidade, diretor) : null;
  const ct5 = base ? ctBaseNivel5(base.qualidade) : false;

  return (
    <CmCareerShell titulo="Categorias de base" subtitulo="Sub-20, safras e promoção ao profissional">
      {base && (
        <>
          <CmPanel className="mb-4">
            <p className="text-xs text-zinc-500">Qualidade do CT Base</p>
            <p className="text-2xl font-semibold text-zinc-100">
              {base.qualidade}/20
              {ct5 && <span className="ml-2 text-sm font-normal text-emerald-400">· Nv5+</span>}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              {rotuloFocoBase(base.foco)} · promoções na temporada: {base.promocoesTemporada}
              {base.ultimaPromocaoRodada > 0 && ` · última na rodada ${base.ultimaPromocaoRodada}`}
            </p>
            <p className="mt-1 text-xs text-amber-200/90">
              Diretor da base nível {diretor}/20 · plantel {plantel}/{TETO_PLANTEL_PROFISSIONAL}
              {base.identidadeBaseAtiva && ' · identidade da base ativa na torcida'}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Sub-20 alimenta a formação; o Sub-23 disputa o Brasileirão Sub23 (IA).
              {plantel >= TETO_PLANTEL_PROFISSIONAL ? ` ${MSG_PLANTEL_CHEIO}` : ''}
            </p>
            <div className="mt-2">
              <CmBtn variant="ghost" onClick={() => irPara('sub23')}>
                Abrir modo Sub23
              </CmBtn>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Safra anual (4–7) + gotejamento a cada 12–13 rodadas · chance de fluxo ~{chance}%
            </p>
            {pesos && (
              <p className="mt-2 text-xs text-zinc-500">
                Tiers (Fraco {pesos.FRACO}% · Médio {pesos.MEDIO}% · Bom {pesos.BOM}% · Craque{' '}
                {pesos.CRAQUE}%)
                {ct5 && diretor >= 18 ? ' — CT Nv5 + diretor 18+ turbinam Bons/Craques.' : ''}
              </p>
            )}
          </CmPanel>

          <h2 className="mb-2 text-sm font-semibold text-emerald-400">Foco do diretor</h2>
          <p className="mb-3 text-xs text-zinc-500">
            Define o perfil das próximas safras e indicações. Jovens já no Sub-20 mantêm o foco da
            geração.
          </p>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {FOCOS.map((f) => (
              <CmPanel key={f.id} className={base.foco === f.id ? 'border-emerald-700/60' : ''}>
                <CmBtn
                  variant={base.foco === f.id ? 'primary' : 'ghost'}
                  onClick={() => definirFoco(f.id)}
                >
                  {f.titulo}
                </CmBtn>
                <p className="mt-2 text-xs text-zinc-400">{f.detalhe}</p>
              </CmPanel>
            ))}
          </div>

          <h2 className="mb-2 text-sm font-semibold text-emerald-400">Investimento mensal</h2>
          <p className="mb-3 text-xs text-zinc-500">
            Debitado no fechamento mensal. Eleva a qualidade do CT e a frequência de talentos.
          </p>
          <div className="mb-6 flex flex-wrap gap-2">
            {NIVEIS.map(({ nivel, rotulo }) => (
              <CmBtn
                key={nivel}
                variant={base.investimentoNivel === nivel ? 'primary' : 'ghost'}
                onClick={() => definir(nivel)}
              >
                {rotulo} · R$ {investimentoBaseMensal(nivel).toLocaleString('pt-BR')}/mês
              </CmBtn>
            ))}
          </div>

          {sugestoes.length > 0 && (
            <>
              <h2 className="mb-2 text-sm font-semibold text-amber-300">Sugestões do diretor</h2>
              <div className="mb-6 space-y-2">
                {sugestoes.map((s) => (
                  <CmPanel key={`${s.jovemId}_${s.rodada}`}>
                    <p className="text-sm text-zinc-200">{s.mensagem}</p>
                    <div className="mt-2">
                      <CmBtn variant="primary" onClick={() => promover(s.jovemId)}>
                        Promover ao profissional
                      </CmBtn>
                    </div>
                  </CmPanel>
                ))}
              </div>
            </>
          )}

          <h2 className="mb-2 text-sm font-semibold text-emerald-400">
            Elenco Sub-20 ({sub20.length})
          </h2>
          {sub20.length === 0 ? (
            <CmPanel className="text-sm text-zinc-400">
              Nenhum jovem no Sub-20. A safra anual e o gotejamento trimestral alimentam esta lista
              (veja Notícias).
            </CmPanel>
          ) : (
            <ul className="space-y-2">
              {sub20
                .slice()
                .sort((a, b) => b.overall - a.overall)
                .map((j) => (
                  <CmPanel key={j.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-zinc-100">
                          {j.nome}{' '}
                          <span className="text-xs font-normal text-zinc-500">
                            {j.idade} anos · {j.posicao}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          OVR {j.overall} · teto ~{j.potencialOvr} · {rotuloTierBase(j.tier)}
                          {j.precoceEstagnado ? ' · precoce (teto baixo)' : ''}
                          {j.diamanteBruto ? ' · diamante bruto' : ''}
                        </p>
                        {j.genetica && (
                          <p className="mt-1 text-xs text-zinc-500">{j.genetica.perfil_scout}</p>
                        )}
                      </div>
                      <CmBtn
                        variant="ghost"
                        onClick={() => promover(j.id)}
                        disabled={plantel >= TETO_PLANTEL_PROFISSIONAL}
                      >
                        1º contrato
                      </CmBtn>
                    </div>
                  </CmPanel>
                ))}
            </ul>
          )}
        </>
      )}
    </CmCareerShell>
  );
}
