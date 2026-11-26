import type { FinancasClube, Jogador, Time } from '../types/schema';
import type { LinhaReceita } from './types';
import { inicializarFinancasClube } from './financasMensais';

/** Converte saves antigos (caixa + receitas simples) para o modelo contábil. */
export function migrarFinancasLegado(
  legado: unknown,
  time: Time,
  elenco: Jogador[],
): FinancasClube {
  const base = inicializarFinancasClube(time, elenco);
  if (!legado || typeof legado !== 'object') return base;

  const f = legado as FinancasClube & { caixa?: number; receitas?: LinhaReceita[] };
  if (typeof f.saldo_caixa === 'number') {
    return {
      ...base,
      ...f,
      lancamentos: f.lancamentos ?? [],
      mesContabilAtual: f.mesContabilAtual ?? 1,
      rodadaUltimoFechamento: f.rodadaUltimoFechamento ?? 0,
    };
  }

  const saldo = typeof f.caixa === 'number' ? f.caixa : base.saldo_caixa;
  const lancamentos = (f.receitas ?? []).map((r, i) => ({
    time_id: time.id,
    rodada: 0,
    mes: 1,
    tipo: 'RECEITA' as const,
    categoria:
      r.tipo === 'bilheteria'
        ? ('BILHETERIA' as const)
        : r.tipo === 'patrocinio'
          ? ('PATROCINIO' as const)
          : r.tipo === 'transferencia'
            ? ('VENDA_ATLETA' as const)
            : ('DIREITOS_TV' as const),
    descricao: r.descricao,
    valor: r.valor,
    id: i,
  }));

  return {
    ...base,
    saldo_caixa: saldo,
    lancamentos,
  };
}