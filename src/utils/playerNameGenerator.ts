const NOMES_BRASIL = [
  'Gabriel', 'Lucas', 'Matheus', 'Pedro', 'Guilherme', 'Gustavo', 'Rafael', 'Felipe',
  'Bruno', 'Eduardo', 'Rodrigo', 'Thiago', 'Leonardo', 'Daniel', 'Vinícius', 'Caio',
  'Henrique', 'Arthur', 'Bernardo', 'Heitor', 'Davi', 'Lorenzo', 'Théo', 'Samuel',
  'João', 'Enzo', 'Murilo', 'Lucca', 'Nicolas', 'Joaquim', 'Benício', 'Isaac',
  'Antônio', 'Miguel', 'Noah', 'Gael', 'Vitor', 'Igor', 'Diego', 'André',
  'Marcelo', 'Renato', 'Fábio', 'Leandro', 'Alexandre', 'Fernando', 'Ricardo', 'Paulo',
  'Carlos', 'Jorge', 'Luiz', 'Marcos', 'Sérgio', 'Márcio', 'Rogério', 'Adriano',
  'Anderson', 'Emerson', 'Robson', 'Wellington', 'Everton', 'Douglas', 'Jeferson', 'William',
  'Wesley', 'Jean', 'Jhonatan', 'Kauan', 'Kauã', 'Ryan', 'Ruan', 'Breno',
  'Otávio', 'Augusto', 'César', 'Raul', 'Hugo', 'Yuri', 'Ian', 'Nathan',
  'Érick', 'Danilo', 'Denílson', 'Edson', 'Gilberto', 'Humberto', 'Luciano', 'Maurício',
  'Natan', 'Patrick', 'Renan', 'Rômulo', 'Sandro', 'Tiago', 'Valdir', 'Wagner',
  'Wallace', 'Yago', 'Zé', 'Cássio'
];

const SOBRENOMES_BRASIL = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
  'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
  'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade',
  'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas', 'Cardoso', 'Ramos',
  'Gonçalves', 'Santana', 'Teixeira', 'Moura', 'Cavalcanti', 'Pinto', 'Correia', 'Araújo',
  'Melo', 'Castro', 'Campos', 'Bezerra', 'Duarte', 'Monteiro', 'Borges', 'Coelho',
  'Tavares', 'Viana', 'Nogueira', 'Aguiar', 'Farias', 'Cunha', 'Pires', 'Azevedo',
  'Siqueira', 'Batista', 'Fonseca', 'Guimarães', 'Miranda', 'Barros', 'Pinheiro', 'Reis',
  'Sales', 'Cruz', 'Macedo', 'Franco', 'Medeiros', 'Neves', 'Camargo', 'Vargas',
  'Brito', 'Leite', 'Rangel', 'Dantas', 'Guedes', 'Amaral', 'Pacheco', 'Lacerda',
  'Chaves', 'Peixoto', 'Coutinho', 'Paiva', 'Queiroz', 'Sampaio', 'Magalhães', 'Toledo',
  'Assis', 'Valente', 'Moraes', 'Couto', 'Galvão', 'Vasconcelos', 'Bueno', 'Xavier',
  'Brandão', 'Rezende', 'Varella', 'Silveira'
];

const APELIDOS_FUTEBOL = [
  'Nenê', 'Dudu', 'Gabigol', 'Hulk', 'Ganso', 'Keno', 'Tiquinho', 'Marinho',
  'Vina', 'Dodô', 'Pepê', 'Cacá', 'Kanu', 'Gil', 'Jair', 'Biel',
  'Rony', 'Deyverson', 'Soteldo', 'Vitinho', 'Paulinho', 'Pedrinho', 'Juninho', 'Fabinho',
  'Zé Rafael', 'Zé Roberto', 'Zé Ivaldo', 'Léo Ortiz', 'Léo Pereira', 'Léo Jardim', 'Léo Pelé', 'Neto',
  'Betão', 'Chicão', 'Alef Manga', 'Rato', 'Pitta', 'Tchê Tchê', 'Yago Pikachu', 'Paraíba',
  'Baiano', 'Mineiro', 'Gaúcho', 'Carioca', 'Paulista', 'Cearense', 'Alagoano', 'Potiguar',
  'Pará', 'Maranhão', 'Cuiabano', 'Acreano', 'Capixaba', 'Sergipano', 'Piauí', 'Tocantins',
  'Fumaça', 'Foguete', 'Flecha', 'Tanque', 'Muralha', 'Paredão', 'Xerife', 'Pitbull',
  'Maestro', 'Mago', 'Imperador', 'Faraó', 'Fenômeno', 'Bruxo', 'Animal', 'Matador',
  'Artilheiro', 'Canhotinha', 'Bala', 'Raio', 'Relâmpago', 'Trovão', 'Furacão', 'Tsunami',
  'Boneco', 'Bolinha', 'Formiga', 'Mosquito', 'Gafanhoto', 'Tubarão', 'Pantera', 'Leão',
  'Falcão', 'Gavião', 'Periquito', 'Canário', 'Sabiá', 'Cobra', 'Escorpião', 'Lobo',
  'Urso', 'Touro', 'Búfalo', 'Júnior'
];

function sortear<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

export interface IdentidadeJogadorGerada {
  nomeCompleto: string;
  nomeConhecido: string;
  apelido: string | null;
}

/**
 * Gera identidade fictícia realista (70% Nome + Sobrenome | 30% Apelido/Primeiro/Segundo/Primeiro+Apelido)
 * Nunca gera "Sobrenome + Apelido" e nunca gera "Atleta MEI 26".
 */
export function gerarIdentidadeJogadorFicticio(
  nomesJaEmUso?: Set<string>
): IdentidadeJogadorGerada {
  for (let tentativa = 0; tentativa < 25; tentativa++) {
    const primeiroNome = sortear(NOMES_BRASIL);
    const sobrenome1 = sortear(SOBRENOMES_BRASIL);
    let sobrenome2 = sortear(SOBRENOMES_BRASIL);
    while (sobrenome2 === sobrenome1) {
      sobrenome2 = sortear(SOBRENOMES_BRASIL);
    }

    const temApelido = Math.random() < 0.32;
    const apelido = temApelido ? sortear(APELIDOS_FUTEBOL) : null;

    const conector = Math.random() < 0.35 ? ' da ' : Math.random() < 0.5 ? ' de ' : ' ';
    const baseNomeCompleto = `${primeiroNome} ${sobrenome1}${conector}${sobrenome2}`;
    const nomeCompleto = apelido ? `${baseNomeCompleto} (${apelido})` : baseNomeCompleto;

    let nomeConhecido = '';
    if (Math.random() < 0.70) {
      nomeConhecido = `${primeiroNome} ${sobrenome1}`;
    } else {
      const modos30 = temApelido
        ? ['SO_APELIDO', 'SO_PRIMEIRO', 'SO_SEGUNDO', 'PRIMEIRO_E_APELIDO']
        : ['SO_PRIMEIRO', 'SO_SEGUNDO'];
      const modoEscolhido = sortear(modos30);

      if (modoEscolhido === 'SO_APELIDO' && apelido) nomeConhecido = apelido;
      else if (modoEscolhido === 'PRIMEIRO_E_APELIDO' && apelido) nomeConhecido = `${primeiroNome} ${apelido}`;
      else if (modoEscolhido === 'SO_SEGUNDO') nomeConhecido = sobrenome1;
      else nomeConhecido = primeiroNome;
    }

    if (!nomesJaEmUso || !nomesJaEmUso.has(nomeConhecido)) {
      nomesJaEmUso?.add(nomeConhecido);
      return { nomeCompleto, nomeConhecido, apelido };
    }
  }

  const p = sortear(NOMES_BRASIL);
  const s1 = sortear(SOBRENOMES_BRASIL);
  const s2 = sortear(SOBRENOMES_BRASIL);
  return { nomeCompleto: `${p} ${s1} ${s2}`, nomeConhecido: `${p} ${s1}`, apelido: null };
}

export function garantirNomeRealJogador<T extends { nome: string; nome_completo?: string }>(
  jogador: T,
  nomesJaEmUso?: Set<string>
): T {
  const padraoPlaceholder = /^(atleta|jogador|player|regen)/i;
  if (!jogador.nome || padraoPlaceholder.test(jogador.nome.trim())) {
    const id = gerarIdentidadeJogadorFicticio(nomesJaEmUso);
    return { ...jogador, nome: id.nomeConhecido, nome_completo: id.nomeCompleto };
  }
  return jogador;
}
