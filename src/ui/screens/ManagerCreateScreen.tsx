import { useState } from 'react';
import { LISTA_ESQUEMAS, RESUMO_ESQUEMAS } from '../../data/esquemasTaticos';
import type { EsquemaTatico } from '../../types/schema';
import { useGameStore } from '../../store/useGameStore';
import { CmBtn, CmShell } from '../cm/CmShell';
const NACIONALIDADES = ['Brasil', 'Argentina', 'Portugal', 'Uruguai', 'Espanha', 'Itália'];

export function ManagerCreateScreen() {
  const times = useGameStore((s) => s.timesReais);
  const salvarPerfil = useGameStore((s) => s.salvarPerfil);
  const irPara = useGameStore((s) => s.irPara);

  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState(35);
  const [timeCoracaoId, setTimeCoracaoId] = useState(times[0]?.id ?? 'FLA');
  const [nacionalidade, setNacionalidade] = useState('Brasil');
  const [esquema, setEsquema] = useState<EsquemaTatico>('4-4-2');

  const continuar = () => {
    if (!nome.trim()) return;
    salvarPerfil({
      nome: nome.trim(),
      idade,
      timeCoracaoId,
      nacionalidade,
      esquemaPreferido: esquema,
    });
  };

  return (
    <CmShell
      titulo="Novo técnico"
      subtitulo="Dados pessoais"
      rodape={
        <div className="flex gap-2">
          <CmBtn variant="ghost" onClick={() => irPara('menu')}>
            Voltar
          </CmBtn>
          <CmBtn onClick={continuar} disabled={!nome.trim()}>
            Continuar
          </CmBtn>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Nome completo
          <input
            className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Idade
          <input
            type="number"
            min={25}
            max={70}
            className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2"
            value={idade}
            onChange={(e) => setIdade(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Time do coração
          <select
            className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2"
            value={timeCoracaoId}
            onChange={(e) => setTimeCoracaoId(e.target.value)}
          >
            {times.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} — {t.nome_completo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Nacionalidade
          <select
            className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2"
            value={nacionalidade}
            onChange={(e) => setNacionalidade(e.target.value)}
          >
            {NACIONALIDADES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Esquema preferido (inicialmente)
          <select
            className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2"
            value={esquema}
            onChange={(e) => setEsquema(e.target.value as EsquemaTatico)}
          >
            {LISTA_ESQUEMAS.map((e) => (
              <option key={e} value={e}>
                {e} — {RESUMO_ESQUEMAS[e]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </CmShell>
  );
}