import type { EstadoCarreira } from './types';

export interface SaveSlotMeta {
  id: string;
  nomeTecnico: string;
  salvoEm: string;
}

const INDEX_KEY = 'gvs_saves_index';

export function formatarDataSalvo(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function chaveTecnico(nome: string): string {
  return nome.trim().toLowerCase();
}

/** Um slot por nome de técnico — fica o mais recente. */
function deduplicarPorTecnico(lista: SaveSlotMeta[]): SaveSlotMeta[] {
  const porNome = new Map<string, SaveSlotMeta>();
  const ordenada = [...lista].sort((a, b) => b.salvoEm.localeCompare(a.salvoEm));
  for (const s of ordenada) {
    const chave = chaveTecnico(s.nomeTecnico);
    if (!porNome.has(chave)) porNome.set(chave, s);
  }
  return [...porNome.values()].sort((a, b) => b.salvoEm.localeCompare(a.salvoEm));
}

export function listarSaves(): SaveSlotMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const lista = JSON.parse(raw) as SaveSlotMeta[];
    return Array.isArray(lista) ? deduplicarPorTecnico(lista) : [];
  } catch {
    return [];
  }
}

function corpoSalvavel(estado: EstadoCarreira): EstadoCarreira {
  return {
    perfil: estado.perfil,
    timesFicticios: estado.timesFicticios,
    timeUsuarioId: estado.timeUsuarioId,
    esquemaAtual: estado.esquemaAtual,
    alinhamento11: estado.alinhamento11 ?? null,
    usoTaticaPersonalizada: estado.usoTaticaPersonalizada ?? false,
    gradeTatica11: estado.gradeTatica11 ?? null,
    jogos: estado.jogos,
    desempenho: estado.desempenho,
    propostas: estado.propostas,
    torneioConcluido: estado.torneioConcluido,
    timesReais: [],
    partidaAtual: null,
    partidaJogoEmCurso: null,
    clubeRealId: estado.clubeRealId,
    propostaSelecionadaId: estado.propostaSelecionadaId,
    noticias: estado.noticias,
    brasileirao: estado.brasileirao ?? null,
    partidaRetornoTatica: estado.partidaRetornoTatica ?? false,
    financas: estado.financas ?? null,
    comercial: estado.comercial ?? null,
    mundoClube: estado.mundoClube ?? null,
    negociacoesTransferencia: estado.negociacoesTransferencia ?? [],
    elencoPersistido: estado.elencoPersistido,
    transmissaoCheckpoint: null,
    pendingResumePartida: false,
    tela:
      estado.tela === 'partida'
        ? estado.clubeRealId
          ? 'escritorio'
          : 'hub_torneio'
        : estado.tela,
  };
}

export function gravarSlot(
  estado: EstadoCarreira,
  nomeTecnico: string,
): SaveSlotMeta {
  const salvoEm = new Date().toISOString();
  const chave = chaveTecnico(nomeTecnico);
  const listaAtual = listarSaves();
  const anterior = listaAtual.find((s) => chaveTecnico(s.nomeTecnico) === chave);

  if (anterior) {
    localStorage.removeItem(anterior.id);
  }

  const id = `save_${Date.now()}`;
  const meta: SaveSlotMeta = { id, nomeTecnico: nomeTecnico.trim(), salvoEm };
  const payload = corpoSalvavel(estado);
  localStorage.setItem(id, JSON.stringify(payload));

  const lista = listaAtual.filter(
    (s) => chaveTecnico(s.nomeTecnico) !== chave && s.id !== id,
  );
  lista.unshift(meta);
  localStorage.setItem(INDEX_KEY, JSON.stringify(lista.slice(0, 10)));
  return meta;
}

export function carregarSlot(id: string): EstadoCarreira | null {
  try {
    const raw = localStorage.getItem(id);
    if (!raw) return null;
    return JSON.parse(raw) as EstadoCarreira;
  } catch {
    return null;
  }
}

/** Remove o payload do slot e tira da lista de salvamentos. */
export function excluirSlot(id: string): boolean {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    const listaRaw = raw ? (JSON.parse(raw) as SaveSlotMeta[]) : [];
    const lista = Array.isArray(listaRaw) ? listaRaw : [];
    const noIndice = lista.some((s) => s.id === id);
    const noStorage = localStorage.getItem(id) != null;
    if (!noIndice && !noStorage) return false;

    localStorage.removeItem(id);
    const filtrada = lista.filter((s) => s.id !== id);
    localStorage.setItem(INDEX_KEY, JSON.stringify(filtrada));
    return true;
  } catch {
    return false;
  }
}