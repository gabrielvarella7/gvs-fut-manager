import {
  multChanceLesaoFisiologista,
  multDuracaoFisioterapeuta,
  multFadigaPreparadorFisico,
} from '../../career/staffEfeitos';
import { rotuloCargoStaff } from '../../career/mundoParalelo';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmPanel } from '../cm/CmShell';

export function StaffScreen() {
  const mundo = useGameStore((s) => s.mundoClube);
  const pedidos = mundo?.pedidosRenovacao ?? [];
  const clima = mundo?.climaTorcedor;
  const abrirPerfil = useGameStore((s) => s.abrirPerfilJogador);
  const jogadores = useGameStore((s) => s.jogadoresReais);

  return (
    <CmCareerShell titulo="Staff" subtitulo="Profissionais de apoio e clima do vestiário">
      {clima && (
        <CmPanel className="mb-4">
          <p className="text-xs text-zinc-500">Clima da torcida</p>
          <p className="text-2xl font-semibold text-zinc-100">{Math.round(clima.indice)}%</p>
          <p className="mt-1 text-sm text-zinc-400">
            Sequência ruim: {clima.sequenciaRuim} · boa: {clima.sequenciaBoa}
          </p>
        </CmPanel>
      )}

      <h2 className="mb-2 text-sm font-semibold text-emerald-400">Corpo técnico (1–20)</h2>
      <p className="mb-3 text-xs text-zinc-500">
        Médico elite preserva 100% na alta · Fisioterapeuta até −40% tempo fora · Preparador 18+ até +25%
        recuperação e menos drain nos 90&apos; · Fisiologista até ×0,30 no risco de lesão · Olheiro Pot estima
        teto oculto.
      </p>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {(mundo?.staff ?? []).map((p) => {
          let efeito = '';
          if (p.cargo === 'MEDICO') {
            efeito =
              p.nivel >= 17 ? 'Alta próxima do nível pré-lesão'
              : p.nivel <= 8 ? 'Risco de perder atributos na volta'
              : 'Recuperação com pequenas perdas possíveis';
          } else if (p.cargo === 'FISIOTERAPEUTA') {
            efeito = `Tempo fora ×${multDuracaoFisioterapeuta(p.nivel).toFixed(2)}`;
          } else if (p.cargo === 'PREPARADOR_FISICO') {
            efeito = `Fadiga em jogo ×${multFadigaPreparadorFisico(p.nivel).toFixed(2)}`;
          } else if (p.cargo === 'FISIOLOGISTA') {
            efeito = `Chance lesão ×${multChanceLesaoFisiologista(p.nivel).toFixed(2)}`;
          } else if (p.cargo === 'OLHEIRO') {
            efeito = p.atributosOlheiro
              ? `Téc ${p.atributosOlheiro.tecnicos} · Fís ${p.atributosOlheiro.fisicos} · Men ${p.atributosOlheiro.mentais} · Pot ${p.atributosOlheiro.potencial} — relatórios na aba Notícias`
              : 'Indica reforços por notícias';
          } else if (p.cargo === 'DIRETOR_BASE') {
            efeito = `Safras Sub-20 e promoções (nível ${p.nivel}) · foco vender, titulares ou equilibrado`;
          } else if (p.cargo === 'ASSISTENTE_TECNICO') {
            efeito =
              p.nivel >= 14 ?
                'Dicas de mercado e escalação nas notícias'
              : 'Pode errar indicações de compra (confira o OVR)';
          }
          return (
            <CmPanel key={p.id}>
              <p className="font-medium text-zinc-100">{p.nome}</p>
              <p className="text-xs text-zinc-500">{rotuloCargoStaff(p.cargo)}</p>
              <p className="mt-2 text-lg text-emerald-300">Nível {p.nivel}/20</p>
              {efeito && <p className="mt-1 text-xs text-zinc-400">{efeito}</p>}
            </CmPanel>
          );
        })}
      </div>

      <h2 className="mb-2 text-sm font-semibold text-amber-300">Pedidos de renovação</h2>
      {pedidos.length === 0 ? (
        <CmPanel className="text-sm text-zinc-400">Nenhum jogador pediu renovação agora.</CmPanel>
      ) : (
        <ul className="space-y-2">
          {pedidos.map((p) => {
            const j = jogadores.find((x) => x.id === p.jogadorId);
            return (
              <CmPanel key={p.id}>
                <button
                  type="button"
                  className="text-left text-sm font-medium text-zinc-100 hover:text-emerald-200"
                  onClick={() => abrirPerfil(p.jogadorId)}
                >
                  {j?.nome ?? `Jogador #${p.jogadorId}`}
                </button>
                <p className="mt-1 text-xs text-zinc-500">{p.mensagem}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Pretensão salarial: R$ {p.salarioPretendido.toLocaleString('pt-BR')}/mês ·{' '}
                  {Math.round(p.duracaoMeses / 12)} ano(s)
                </p>
              </CmPanel>
            );
          })}
        </ul>
      )}
    </CmCareerShell>
  );
}