import type { Jogador } from '../types/schema';

/** Limiar: lesionado com energia abaixo disto não pode jogar. */
export const ENERGIA_MINIMA_COM_LESAO = 60;

/** Lesão ativa no departamento médico (contusão / LEVE ou pior). */
export function temLesaoAtiva(j: Jogador): boolean {
  return Boolean(j.lesao && j.lesao.diasRestantes > 0);
}

/**
 * Regra de escalação:
 * lesionado (contusão ou pior) E energia &lt; 60% → não pode jogar
 * (substituir ou ficar fora da lista).
 */
export function bloqueadoPorLesaoComEnergiaBaixa(j: Jogador): boolean {
  return temLesaoAtiva(j) && (j.energia ?? 0) < ENERGIA_MINIMA_COM_LESAO;
}

/** Pode entrar em campo / ser titular no XI. */
export function jogadorPodeJogar(j: Jogador): boolean {
  return !bloqueadoPorLesaoComEnergiaBaixa(j);
}

/** Mensagem curta para UI (PT). */
export function rotuloBloqueioLesaoEnergia(j: Jogador): string | null {
  if (!bloqueadoPorLesaoComEnergiaBaixa(j)) return null;
  const desc = j.lesao?.descricao ?? 'lesão';
  return `Lesionado (${desc}) · energia ${Math.round(j.energia)}% — não pode jogar (<${ENERGIA_MINIMA_COM_LESAO}%)`;
}

/** Mensagem completa para avisos / narração (PT). */
export function mensagemBloqueioLesaoEnergia(j: Jogador): string | null {
  if (!bloqueadoPorLesaoComEnergiaBaixa(j)) return null;
  const desc = j.lesao?.descricao ?? 'contusão';
  return (
    `${j.nome} está lesionado (${desc}) com energia abaixo de ${ENERGIA_MINIMA_COM_LESAO}% ` +
    `(${Math.round(j.energia)}%) e não pode jogar — precisa ser substituído ou ficar fora da escalação.`
  );
}

/** Filtra elenco removendo quem está bloqueado pela regra. */
export function filtrarAptosParaJogar(elenco: Jogador[]): Jogador[] {
  return elenco.filter(jogadorPodeJogar);
}

/**
 * Apto para o Assistente 11+11 (auto-pick):
 * - mesma trava manual: lesão + energia &lt;60% → fora
 * - e qualquer lesão ativa (schema: indisponível enquanto diasRestantes &gt; 0)
 */
export function jogadorAptoAssistente(j: Jogador): boolean {
  return jogadorPodeJogar(j) && !temLesaoAtiva(j);
}

/** Elenco elegível ao botão “Assistente escolhe os melhores”. */
export function filtrarAptosAssistente(elenco: Jogador[]): Jogador[] {
  return elenco.filter(jogadorAptoAssistente);
}

/**
 * Sanitiza um XI: troca bloqueados por reservas aptas (mesmo pos quando possível).
 * Mantém 11 ids quando o elenco permitir.
 */
export function sanitizarAlinhamento11(
  elenco: Jogador[],
  ids: number[],
): { ids: number[]; trocas: { saiu: string; entrou: string; motivo: string }[] } {
  const porId = new Map(elenco.map((j) => [j.id, j]));
  const usados = new Set<number>();
  const trocas: { saiu: string; entrou: string; motivo: string }[] = [];
  const next: number[] = [];

  const banco = () =>
    elenco
      .filter((j) => !usados.has(j.id) && jogadorPodeJogar(j))
      .sort((a, b) => b.overall - a.overall);

  for (const id of ids.slice(0, 11)) {
    const j = porId.get(id);
    if (j && jogadorPodeJogar(j) && !usados.has(j.id)) {
      next.push(j.id);
      usados.add(j.id);
      continue;
    }
    const motivo = j ? mensagemBloqueioLesaoEnergia(j) ?? 'Indisponível' : 'Jogador ausente';
    const pos = j?.posicao;
    const candidatos = banco();
    const substituto =
      (pos ? candidatos.find((c) => c.posicao === pos) : undefined) ?? candidatos[0];
    if (substituto) {
      if (j) {
        trocas.push({
          saiu: j.nome,
          entrou: substituto.nome,
          motivo,
        });
      }
      next.push(substituto.id);
      usados.add(substituto.id);
    }
  }

  // Completa até 11 se faltou.
  while (next.length < 11) {
    const extra = banco()[0];
    if (!extra) break;
    next.push(extra.id);
    usados.add(extra.id);
  }

  return { ids: next, trocas };
}
