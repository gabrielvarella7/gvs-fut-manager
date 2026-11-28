import type { Posicao } from '../types/schema';
import { gerarIdentidadeJogadorFicticio } from '../utils/playerNameGenerator';
import { calcularOverallDeAtributos20, normalizarParaEscala20 } from '../utils/attributeScale20';
import type { ProgressaoCM } from './cmEvolutionEngine';

export interface JovemBaseGerado {
  nome: string;
  nome_completo: string;
  idade: number;
  posicao: Posicao;
  atributos: {
    defesa: number;     // 1..20
    passe: number;      // 1..20
    chute: number;      // 1..20
    velocidade: number; // 1..20
  };
  overall: number;
  progressao: ProgressaoCM;
  arquetipoScout:
    | 'JOIA_GERACIONAL'
    | 'PROMESSA_ELITE'
    | 'DIAMANTE_BRUTO'
    | 'PRECOCE_LIMITADO'
    | 'COMPOSICAO_ELENCO'
    | 'BAIXO_POTENCIAL';
  descricaoOlheiro: string;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function gerarFornadaJovensBase(params: {
  quantidade: number;
  nivelCTBase: 1 | 2 | 3 | 4 | 5;
  nivelDiretorBase: number; // 1..20
  focoBase: 'VENDER_PROFISSIONALIZAR' | 'TITULARES_CLUBE' | 'EQUILIBRADO';
  posicaoCarente?: Posicao;
  nomesEmUso?: Set<string>;
}): JovemBaseGerado[] {
  const {
    quantidade,
    nivelCTBase,
    nivelDiretorBase,
    focoBase,
    posicaoCarente,
    nomesEmUso,
  } = params;

  const bonusEstrutura = (nivelCTBase - 1) * 3.5 + (nivelDiretorBase / 20) * 8;
  const safra: JovemBaseGerado[] = [];

  for (let i = 0; i < quantidade; i++) {
    const identidade = gerarIdentidadeJogadorFicticio(nomesEmUso);
    const idade = randInt(16, 18);

    let posicao: Posicao = 'MEI';
    const roletaPos = Math.random();
    if (focoBase === 'VENDER_PROFISSIONALIZAR') {
      posicao =
        roletaPos < 0.38
          ? 'ATA'
          : roletaPos < 0.68
          ? 'MEI'
          : roletaPos < 0.82
          ? 'LAT'
          : roletaPos < 0.94
          ? 'VOL'
          : 'ZAG';
    } else if (focoBase === 'TITULARES_CLUBE' && posicaoCarente && i === 0) {
      posicao = posicaoCarente;
    } else {
      const todas: Posicao[] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
      posicao = todas[randInt(0, todas.length - 1)];
    }

    const roll = Math.min(100, Math.random() * 100 + bonusEstrutura * 0.65);

    let caAlvo = 58;
    let paAlvo = 66;
    let arquetipoScout: JovemBaseGerado['arquetipoScout'] = 'COMPOSICAO_ELENCO';
    let descricaoOlheiro = 'Jovem disciplinado com margem moderada de evolução.';

    if (roll >= 96.5) {
      caAlvo = randInt(70, 74);
      paAlvo = randInt(89, 95);
      arquetipoScout = 'JOIA_GERACIONAL';
      descricaoOlheiro = 'Talento geracional raro. Potencial para se tornar estrela de seleção.';
    } else if (roll >= 87) {
      caAlvo = randInt(66, 70);
      paAlvo = randInt(83, 88);
      arquetipoScout = 'PROMESSA_ELITE';
      descricaoOlheiro = 'Excelente leitura de jogo e teto altíssimo; pronto para ganhar minutos.';
    } else if (roll >= 74 && Math.random() < 0.35) {
      caAlvo = randInt(56, 60);
      paAlvo = randInt(84, 89);
      arquetipoScout = 'DIAMANTE_BRUTO';
      descricaoOlheiro = 'Ainda cru fisicamente, mas demonstra lampejos técnicos de craque.';
    } else if (roll >= 56) {
      caAlvo = randInt(63, 67);
      paAlvo = randInt(76, 82);
      arquetipoScout = 'COMPOSICAO_ELENCO';
      descricaoOlheiro = 'Promessa consistente; pode virar titular sólido em 2 temporadas.';
    } else if (roll >= 42 && Math.random() < 0.30) {
      caAlvo = randInt(65, 68);
      paAlvo = caAlvo + randInt(2, 4);
      arquetipoScout = 'PRECOCE_LIMITADO';
      descricaoOlheiro = 'Maturação física precoce, mas margem técnica limitada.';
    } else {
      caAlvo = randInt(52, 58);
      paAlvo = randInt(60, 66);
      arquetipoScout = 'BAIXO_POTENCIAL';
      descricaoOlheiro = 'Composição para categorias de base.';
    }

    const base20 = normalizarParaEscala20(caAlvo);
    const atributos = {
      defesa: normalizarParaEscala20(posicao === 'GOL' || posicao === 'ZAG' ? base20 + 2 : base20 - 3),
      passe: normalizarParaEscala20(posicao === 'MEI' || posicao === 'VOL' ? base20 + 2 : base20 - 1),
      chute: normalizarParaEscala20(posicao === 'ATA' ? base20 + 2 : posicao === 'GOL' ? 4 : base20 - 2),
      velocidade: normalizarParaEscala20(posicao === 'LAT' || posicao === 'ATA' ? base20 + 2 : base20),
    };

    const overall = calcularOverallDeAtributos20(posicao, atributos);

    safra.push({
      nome: identidade.nomeConhecido,
      nome_completo: identidade.nomeCompleto,
      idade,
      posicao,
      atributos,
      overall,
      progressao: {
        xp_defesa: 0,
        xp_passe: 0,
        xp_chute: 0,
        xp_velocidade: 0,
        potencial_maximo: Math.max(overall + 2, paAlvo),
        profissionalismo: Number((0.8 + Math.random() * 0.55).toFixed(2)),
        propensao_lesao: Number((0.65 + Math.random() * 0.9).toFixed(2)),
      },
      arquetipoScout,
      descricaoOlheiro,
    });
  }

  return safra;
}
