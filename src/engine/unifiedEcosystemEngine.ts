import { attr20ParaPct } from '../utils/attributeScale20';

export interface DiagnosticoLinhasTaticas {
  qtdGoleiros: number;
  qtdLinhaDefensiva: number;
  qtdLinhasMeio: number;
  qtdAtaqueCentral: number;
  alertaLinhaDefensivaCurta: boolean;
  alertaMeioCampoVazio: boolean;
  multiplicadorGolsPro: number;
  multiplicadorGolsSofridos: number;
  multiplicadorPosse: number;
  multiplicadorSprintsProprios: number;
  multiplicadorSprintsAdversario: number;
}

export function analisarEcossistemaTaticoConfronto(params: {
  titularesProprios: Array<{
    posicao: string;
    atributos: { defesa: number; passe: number; chute: number; velocidade: number };
    energia: number;
  }>;
  titularesAdversario: Array<{
    posicao: string;
    atributos: { defesa: number; passe: number; chute: number; velocidade: number };
    energia: number;
  }>;
}): DiagnosticoLinhasTaticas {
  const { titularesProprios, titularesAdversario } = params;

  const contarSetores = (lista: typeof titularesProprios) => {
    let gol = 0, def = 0, meio = 0, ata = 0;
    for (const j of lista) {
      const p = j.posicao.toUpperCase();
      if (p === 'GOL') gol++;
      else if (p === 'ZAG' || p === 'LAT') def++;
      else if (['VOL', 'MC', 'MEI', 'MD', 'ME', 'AE', 'AD'].includes(p)) meio++;
      else ata++;
    }
    return { gol, def, meio, ata };
  };

  const meuSetor = contarSetores(titularesProprios);
  const rivalSetor = contarSetores(titularesAdversario);

  const mediaVelPropria =
    titularesProprios.reduce((acc, j) => acc + attr20ParaPct(j.atributos.velocidade), 0) /
    Math.max(1, titularesProprios.length);

  const mediaVelRival =
    titularesAdversario.reduce((acc, j) => acc + attr20ParaPct(j.atributos.velocidade), 0) /
    Math.max(1, titularesAdversario.length);

  const mediaDefPropria =
    titularesProprios
      .filter((j) => j.posicao === 'ZAG' || j.posicao === 'LAT' || j.posicao === 'VOL')
      .reduce((acc, j) => acc + attr20ParaPct(j.atributos.defesa), 0) /
    Math.max(1, meuSetor.def + 1);

  let multPro = 1.0;
  let multSofridos = 1.0;
  let multPosse = 1.0;

  const alertaLinhaDefensivaCurta = meuSetor.def <= 2;
  if (alertaLinhaDefensivaCurta) {
    multPro *= 1.14;
    multSofridos *= 1.36;
    multPosse *= 1.04;
  } else if (meuSetor.def >= 5) {
    multPro *= 0.87;
    multSofridos *= 0.82;
  }

  const alertaMeioCampoVazio = meuSetor.meio <= 2;
  if (alertaMeioCampoVazio) {
    multPosse *= 0.78;
    multPro *= 1.09;
    multSofridos *= 1.26;
  } else if (meuSetor.meio > rivalSetor.meio) {
    const diffMeio = meuSetor.meio - rivalSetor.meio;
    multPosse *= 1 + Math.min(0.16, diffMeio * 0.06);
    multPro *= 1 + Math.min(0.10, diffMeio * 0.035);
  }

  const fatorVelocidadePropria = mediaVelPropria / 75;
  const dueloVelocidade = mediaVelPropria - mediaDefPropria;

  const multiplicadorSprintsProprios = Number(
    (fatorVelocidadePropria * (alertaMeioCampoVazio ? 1.12 : 1.0)).toFixed(3)
  );
  const multiplicadorSprintsAdversario = Number(
    ((mediaVelRival / 75) * (1 + Math.max(-0.1, (mediaVelPropria - 75) / 120))).toFixed(3)
  );

  if (dueloVelocidade > 6) {
    multPro *= 1 + Math.min(0.15, (dueloVelocidade - 6) * 0.012);
  }

  const ruidoPro = 0.90 + (Math.random() + Math.random()) * 0.10;
  const ruidoSofridos = 0.90 + (Math.random() + Math.random()) * 0.10;

  return {
    qtdGoleiros: meuSetor.gol,
    qtdLinhaDefensiva: meuSetor.def,
    qtdLinhasMeio: meuSetor.meio,
    qtdAtaqueCentral: meuSetor.ata,
    alertaLinhaDefensivaCurta,
    alertaMeioCampoVazio,
    multiplicadorGolsPro: Number((multPro * ruidoPro).toFixed(4)),
    multiplicadorGolsSofridos: Number((multSofridos * ruidoSofridos).toFixed(4)),
    multiplicadorPosse: Number(multPosse.toFixed(4)),
    multiplicadorSprintsProprios,
    multiplicadorSprintsAdversario,
  };
}

export function sortearEsquemaTreinadorCPU(esquemaPadraoClube: string): string {
  if (Math.random() < 0.01) {
    const ousados = ['2-4-4', '4-2-4', '5-2-3'];
    return ousados[Math.floor(Math.random() * ousados.length)];
  }
  return esquemaPadraoClube;
}
