import {
  chancePromocaoBase,
  investimentoBaseMensal,
  rotuloFocoBase,
} from '../../career/mundoParalelo';
import { nivelDiretorBase } from '../../career/staffEfeitos';
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
    id: 'VENDER',
    titulo: 'Vender',
    detalhe:
      'Revela mais cedo (16–17 anos), OVR inicial maior, valor de mercado turbinado e mais aberto a propostas.',
  },
  {
    id: 'PROFISSIONALIZAR',
    titulo: 'Profissionalizar',
    detalhe:
      'Entrada mais tarde (18–20), começa mais cru, mas com teto de potencial alto e saltos maiores ao evoluir (mais devagar).',
  },
];

export function BaseScreen() {
  const mundo = useGameStore((s) => s.mundoClube);
  const definir = useGameStore((s) => s.definirInvestimentoBase);
  const definirFoco = useGameStore((s) => s.definirFocoBase);
  const base = mundo?.base;
  const chance = base ? Math.round(chancePromocaoBase(mundo!) * 100) : 0;
  const diretor = mundo ? nivelDiretorBase(mundo) : 10;

  return (
    <CmCareerShell titulo="Categorias de base" subtitulo="Formação e promoção ao profissional">
      {base && (
        <>
          <CmPanel className="mb-4">
            <p className="text-xs text-zinc-500">Qualidade da estrutura</p>
            <p className="text-2xl font-semibold text-zinc-100">{base.qualidade}/20</p>
            <p className="mt-2 text-sm text-zinc-400">
              {rotuloFocoBase(base.foco ?? 'PROFISSIONALIZAR')} · promoções: {base.promocoesTemporada}
              {base.ultimaPromocaoRodada > 0 && ` · última na rodada ${base.ultimaPromocaoRodada}`}
            </p>
            <p className="mt-1 text-xs text-amber-200/90">
              Chance aproximada de revelação por rodada: {chance}% · Diretor da base nível {diretor}/20
              (quanto maior, mais frequentes e fortes os jovens no foco atual)
            </p>
          </CmPanel>

          <h2 className="mb-2 text-sm font-semibold text-emerald-400">Foco da formação</h2>
          <p className="mb-3 text-xs text-zinc-500">
            Vale para as próximas promoções da base. Jovens já no elenco mantêm o foco com que foram
            revelados.
          </p>
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
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
            Valor debitado no fechamento mensal. Quanto maior o investimento, mais frequente a chegada de
            promessas.
          </p>
          <div className="flex flex-wrap gap-2">
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
        </>
      )}
    </CmCareerShell>
  );
}