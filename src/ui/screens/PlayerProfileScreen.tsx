import { useState } from 'react';
import {
  corClasseEnergia,
  faixaRecuperacaoLabel,
  overallEfetivoPorEnergia,
} from '../../career/energia';
import {
  particularidadesJogador,
  resumoFinanceiro,
  rotuloPosicao,
  rotuloStatus,
  visaoGeralAtributos,
  visaoGeralReferencia,
} from '../../career/perfilJogador';
import { AtributosDetalhe } from '../components/AtributosDetalhe';
import { AtributosRadar } from '../components/AtributosRadar';
import { ModalVisaoAtributos } from '../components/ModalVisaoAtributos';
import { pretensaoClubeVendedor } from '../../career/transfers';
import { useGameStore } from '../../store/useGameStore';
import { CmCareerShell } from '../cm/CmCareerShell';
import { CmBtn, CmPanel } from '../cm/CmShell';

export function PlayerProfileScreen() {
  const jogadorId = useGameStore((s) => s.jogadorPerfilId);
  const jogadoresReais = useGameStore((s) => s.jogadoresReais);
  const timesFicticios = useGameStore((s) => s.timesFicticios);
  const clubeRealId = useGameStore((s) => s.clubeRealId);
  const voltarElenco = useGameStore((s) => s.fecharPerfilJogador);
  const iniciarCompra = useGameStore((s) => s.iniciarNegociacaoCompra);
  const iniciarVenda = useGameStore((s) => s.iniciarNegociacaoVenda);
  const irPara = useGameStore((s) => s.irPara);

  const jogador =
    jogadoresReais.find((j) => j.id === jogadorId) ??
    timesFicticios.flatMap((t) => t.jogadores).find((j) => j.id === jogadorId);

  if (!jogador) {
    return (
      <CmCareerShell
        titulo="Jogador"
        acoesExtras={
          <CmBtn variant="ghost" onClick={voltarElenco}>
            Voltar ao elenco
          </CmBtn>
        }
      >
        <p className="text-sm text-zinc-500">Jogador não encontrado.</p>
      </CmCareerShell>
    );
  }

  const fin = resumoFinanceiro(jogador);
  const partes = particularidadesJogador(jogador);
  const profissional = !!clubeRealId;
  const visao = visaoGeralAtributos(jogador);
  const refVisao = visaoGeralReferencia(jogador);
  const [modalVisao, setModalVisao] = useState(false);

  return (
    <CmCareerShell
      titulo={jogador.nome}
      subtitulo={`${rotuloPosicao(jogador.posicao)} · ${jogador.idade} anos · OVR ${jogador.overall} · Energia ${Math.round(jogador.energia)}%`}
      acoesExtras={
        <>
          {profissional && jogador && clubeRealId && jogador.time_id !== clubeRealId && (
            <CmBtn
              variant="primary"
              onClick={() => {
                iniciarCompra(jogador.id);
                irPara('transferencias');
              }}
            >
              Negociar compra
            </CmBtn>
          )}
          {profissional && jogador && clubeRealId && jogador.time_id === clubeRealId && (
            <CmBtn
              variant="ghost"
              onClick={() => {
                iniciarVenda(jogador.id, pretensaoClubeVendedor(jogador));
                irPara('transferencias');
              }}
            >
              Colocar à venda
            </CmBtn>
          )}
          <CmBtn variant="ghost" onClick={voltarElenco}>
            Voltar ao elenco
          </CmBtn>
        </>
      }
    >
      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_auto]">
        <CmPanel>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-emerald-400">Visão geral dos atributos</h2>
            <button
              type="button"
              className="text-xs text-sky-400 hover:text-sky-300"
              onClick={() => setModalVisao(true)}
            >
              O que significa?
            </button>
          </div>
          <AtributosRadar jogador={visao} referencia={refVisao} />
          <p className="mt-2 text-center text-[10px] text-zinc-500">
            Contorno âmbar = referência pela posição · Área verde = jogador
          </p>
        </CmPanel>
        <CmPanel>
          <p className="mb-2 text-xs text-zinc-500">Escala 1–20 em técnicos, mentais e físicos.</p>
          <AtributosDetalhe atributos={jogador.atributos} compacto />
          <p className="mt-3 text-sm text-zinc-400">
            Status: <strong className="text-zinc-200">{rotuloStatus(jogador.status_escalacao)}</strong>
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            Energia:{' '}
            <strong className={corClasseEnergia(jogador.energia)}>
              {Math.round(jogador.energia)}%
            </strong>
            {jogador.energia < 92 && (
              <>
                {' '}
                · OVR em campo ~{overallEfetivoPorEnergia(jogador.overall, jogador.energia)}
              </>
            )}
            <span className="mt-0.5 block text-xs text-zinc-500">
              {faixaRecuperacaoLabel(jogador.idade)}
            </span>
          </p>
          {jogador.lesao && jogador.lesao.diasRestantes > 0 && (
            <p className="mt-2 text-sm text-rose-300">
              Lesionado ({jogador.lesao.gravidade.toLowerCase()}): {jogador.lesao.descricao} ·{' '}
              {jogador.lesao.diasRestantes} dia(s) restantes
              {jogador.lesao.overallReferencia != null && (
                <> · OVR pré-lesão {jogador.lesao.overallReferencia}</>
              )}
            </p>
          )}
          {profissional && (
            <p className="mt-1 text-sm text-zinc-400">
              Valor: {fin.valor} · Salário: {fin.salario}/mês · {fin.nacionalidade}
            </p>
          )}
          {jogador.formacaoBase && (
            <p className="mt-2 text-xs text-zinc-500">
              Cria da base
              {jogador.formacaoBase.tier ? ` · ${jogador.formacaoBase.tier.toLowerCase()}` : ''}
              {jogador.formacaoBase.potencialOvr != null &&
                ` · potencial ~${jogador.formacaoBase.potencialOvr} OVR`}
              {jogador.formacaoBase.precoceEstagnado ? ' · precoce estagnado' : ''}
              {jogador.formacaoBase.diamanteBruto ? ' · diamante bruto' : ''}
              {(jogador.formacaoBase.rodadasBancoSeguidas ?? 0) >= 10 &&
                ` · ${jogador.formacaoBase.rodadasBancoSeguidas} rodadas fora da lista`}
            </p>
          )}
          {jogador.genetica && (
            <p className="mt-1 text-xs text-zinc-500">
              Genética · teto {jogador.genetica.potencial_maximo} · absorção{' '}
              {jogador.genetica.fator_absorcao.toFixed(2)}× · lesão ×
              {jogador.genetica.propensao_lesao.toFixed(2)}
              <span className="mt-0.5 block">{jogador.genetica.perfil_scout}</span>
            </p>
          )}
        </CmPanel>
      </div>

      {modalVisao && <ModalVisaoAtributos onFechar={() => setModalVisao(false)} />}

      <h2 className="mb-2 text-sm font-medium text-emerald-400">Relatório do jogador</h2>
      <ul className="space-y-2">
        {partes.map((p) => (
          <li key={p.rotulo}>
            <CmPanel>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{p.rotulo}</p>
              <p className="mt-1 text-sm text-zinc-300">{p.detalhe}</p>
            </CmPanel>
          </li>
        ))}
      </ul>
    </CmCareerShell>
  );
}
