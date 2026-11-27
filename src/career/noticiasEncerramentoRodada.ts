import type { NoticiaCarreira } from './types';
import type { Jogador, Time } from '../types/schema';
import {
  ordenarTabela,
  partidasDaRodada,
  posicaoDoTime,
  type EstadoTemporada,
} from './brasileirao';
import { marcarClube, marcarJogador } from './noticiasMarkup';

export type BlocoEncerramento =
  | 'tabela'
  | 'zebra'
  | 'craque'
  | 'curiosidade'
  | 'analise';

export interface TemplateEncerramentoRodada {
  id: number;
  bloco: BlocoEncerramento;
  template: string;
}


/** Banco de 100 templates de encerramento de rodada (estilo imprensa). */
export const TEMPLATES_ENCERRAMENTO_RODADA: TemplateEncerramentoRodada[] = [
  { id: 1, bloco: 'tabela', template: 'Rodada {RODADA} encerrada: {LIDER} segura a ponta com autoridade, enquanto o {CLUBE} fecha o fim de semana firme em {POSICAO}º lugar com {PONTOS} pontos.' },
  { id: 2, bloco: 'tabela', template: 'Fim da {RODADA}ª rodada! A briga pelo topo pegou fogo: {LIDER} e {VICE} seguem colados, e o {CLUBE} aparece logo atrás na {POSICAO}ª colocação.' },
  { id: 3, bloco: 'tabela', template: 'Balanço da Rodada {RODADA}: {GOLS_RODADA} gols balançaram as redes pelo Brasil. Na tabela, o {CLUBE} soma pontos preciosos e sustenta o {POSICAO}º posto.' },
  { id: 4, bloco: 'tabela', template: 'Virou o turno, virou a chave! Com o encerramento da {RODADA}ª rodada, o {CLUBE} se consolida em {POSICAO}º lugar e já faz contas para a Libertadores.' },
  { id: 5, bloco: 'tabela', template: 'Olho na parte de baixo: após {RODADA} rodadas, o {LANTERNA} segue afundado na lanterna, enquanto lá em cima o {CLUBE} respira tranquilo na {POSICAO}ª posição.' },
  { id: 6, bloco: 'tabela', template: 'Rodada {RODADA} de tirar o fôlego! A diferença entre o líder {LIDER} e o pelotão do G4 caiu, colocando o {CLUBE} ({POSICAO}º) de vez na disputa.' },
  { id: 7, bloco: 'tabela', template: 'Fim de expediente na {RODADA}ª rodada: nenhum time disparou isolado, e a regularidade mantém o {CLUBE} na {POSICAO}ª colocação com {PONTOS} pontos.' },
  { id: 8, bloco: 'tabela', template: 'Alerta vermelho na zona da degola após a {RODADA}ª rodada; na metade superior da tabela, o {CLUBE} faz campanha sólida e ocupa o {POSICAO}º lugar.' },
  { id: 9, bloco: 'tabela', template: 'O Brasileirão não dá trégua! Encerrada a {RODADA}ª rodada, o {CLUBE} fecha a semana em {POSICAO}º e vê a concorrência tropeçar nos jogos fora de casa.' },
  { id: 10, bloco: 'tabela', template: 'Retrato da {RODADA}ª rodada: defesas prevaleceram nos clássicos, mas a tabela mexeu — o {CLUBE} agora figura na {POSICAO}ª posição.' },
  { id: 11, bloco: 'tabela', template: 'Fechamento da Rodada {RODADA}: {LIDER} mantém o aproveitamento de campeão, seguido de perto por {VICE} e pelo {CLUBE}, que aparece em {POSICAO}º.' },
  { id: 12, bloco: 'tabela', template: 'Contas da {RODADA}ª rodada: o corte para o G6 ficou mais caro após os resultados do fim de semana, e o {CLUBE} sustenta o {POSICAO}º lugar.' },
  { id: 13, bloco: 'tabela', template: 'Rodada {RODADA} concluída com equilíbrio absurdo: apenas três pontos separam o 2º do 6º colocado, bloco onde o {CLUBE} ({POSICAO}º) marca presença.' },
  { id: 14, bloco: 'tabela', template: 'Fim da {RODADA}ª jornada da Série A! O {CLUBE} soma {PONTOS} pontos, segura o {POSICAO}º lugar e vê crescer a pressão sobre os rivais diretos.' },
  { id: 15, bloco: 'tabela', template: 'A matemática da {RODADA}ª rodada: quem venceu em casa disparou, e o {CLUBE} termina o domingo bem posicionado na {POSICAO}ª colocação.' },
  { id: 16, bloco: 'tabela', template: 'Encerramento da Rodada {RODADA}: troca de posições no meio da tabela, drama no Z4 e o {CLUBE} firme na {POSICAO}ª posição com {PONTOS} pontos.' },
  { id: 17, bloco: 'tabela', template: 'Tudo igual na ponta após a {RODADA}ª rodada! {LIDER} tropeçou, mas os perseguidores não aproveitaram totalmente; o {CLUBE} fecha em {POSICAO}º.' },
  { id: 18, bloco: 'tabela', template: 'Rodada {RODADA} na conta! Com {GOLS_RODADA} gols anotados nos 10 jogos, a competição ganha contornos dramáticos e deixa o {CLUBE} em {POSICAO}º lugar.' },
  { id: 19, bloco: 'tabela', template: 'Fim de semana de poucas surpresas no topo: {LIDER} venceu mais uma, e o {CLUBE} segue na cola ocupando o {POSICAO}º lugar da classificação.' },
  { id: 20, bloco: 'tabela', template: 'Resumo da {RODADA}ª rodada: o {CLUBE} fecha o ciclo em {POSICAO}º lugar ({PONTOS} pts) enquanto a briga contra o rebaixamento ganha novos integrantes.' },
  { id: 21, bloco: 'zebra', template: 'Zebra solta na {RODADA}ª rodada! O {VENCEDOR_ZEBRA} contrariou todas as probabilidades, derrubou o favorito {PERDEDOR_ZEBRA} e bagunçou a tabela.' },
  { id: 22, bloco: 'zebra', template: 'Ninguém esperava por essa! O grande choque da Rodada {RODADA} foi a queda do {PERDEDOR_ZEBRA} diante do valente {VENCEDOR_ZEBRA}.' },
  { id: 23, bloco: 'zebra', template: 'Deu a lógica em quase tudo na {RODADA}ª rodada, menos no duelo entre {VENCEDOR_ZEBRA} e {PERDEDOR_ZEBRA}, que terminou com festa do azarão!' },
  { id: 24, bloco: 'zebra', template: 'Rodada {RODADA} traiçoeira para os gigantes: o {PERDEDOR_ZEBRA} entrou de salto alto, perdeu para o {VENCEDOR_ZEBRA} e beneficiou o {CLUBE} ({POSICAO}º).' },
  { id: 25, bloco: 'zebra', template: 'Quem apostou na zebra se deu bem na {RODADA}ª rodada: vitória gigante do {VENCEDOR_ZEBRA} sobre o {PERDEDOR_ZEBRA} roubou as manchetes do domingo.' },
  { id: 26, bloco: 'zebra', template: 'Tropeço inesperado! O {PERDEDOR_ZEBRA} deixou pontos pelo caminho contra o {VENCEDOR_ZEBRA} no fechamento da {RODADA}ª rodada da Série A.' },
  { id: 27, bloco: 'zebra', template: 'A {RODADA}ª rodada provou mais uma vez que não existe jogo ganho no Brasileirão: o {VENCEDOR_ZEBRA} bateu o {PERDEDOR_ZEBRA} e chocou o país.' },
  { id: 28, bloco: 'zebra', template: 'Enquanto o {CLUBE} faz sua parte e segue em {POSICAO}º lugar, o {PERDEDOR_ZEBRA} virou alvo de protestos após perder para o {VENCEDOR_ZEBRA} na Rodada {RODADA}.' },
  { id: 29, bloco: 'zebra', template: 'Vitória com alma! O {VENCEDOR_ZEBRA} se fechou atrás, castigou no contra-ataque e derrubou o {PERDEDOR_ZEBRA} no encerramento da {RODADA}ª rodada.' },
  { id: 30, bloco: 'zebra', template: 'Que banho de água fria! Favorito absoluto antes da bola rolar, o {PERDEDOR_ZEBRA} caiu diante do {VENCEDOR_ZEBRA} na {RODADA}ª rodada.' },
  { id: 31, bloco: 'zebra', template: 'Rodada {RODADA} encerrada com gosto amargo para o {PERDEDOR_ZEBRA}, derrotado pelo {VENCEDOR_ZEBRA}, e sorriso largo para o {CLUBE} ({POSICAO}º).' },
  { id: 32, bloco: 'zebra', template: 'O fator casa falou mais alto para os considerados "pequenos" na {RODADA}ª rodada, com destaque para o triunfo do {VENCEDOR_ZEBRA} sobre o {PERDEDOR_ZEBRA}.' },
  { id: 33, bloco: 'zebra', template: 'Surpresa tática da Rodada {RODADA}: o {VENCEDOR_ZEBRA} anulou completamente o ataque do {PERDEDOR_ZEBRA} e saiu de campo com três pontos históricos.' },
  { id: 34, bloco: 'zebra', template: 'Crise à vista? Após perder para o {VENCEDOR_ZEBRA} na {RODADA}ª rodada, o {PERDEDOR_ZEBRA} vê os rivais diretos — como o {CLUBE} ({POSICAO}º) — abrirem vantagem.' },
  { id: 35, bloco: 'zebra', template: 'Fim da {RODADA}ª rodada com reviravolta: o {VENCEDOR_ZEBRA} encerrou um jejum incômodo justamente em cima do poderoso {PERDEDOR_ZEBRA}.' },
  { id: 36, bloco: 'zebra', template: 'O futebol brasileiro é imprevisível: na {RODADA}ª rodada, o {VENCEDOR_ZEBRA} jogou sem medo, venceu o {PERDEDOR_ZEBRA} e embolou a classificação.' },
  { id: 37, bloco: 'zebra', template: 'Bola puniu! O {PERDEDOR_ZEBRA} perdeu gols incríveis e acabou castigado pelo {VENCEDOR_ZEBRA} no fechamento da {RODADA}ª jornada.' },
  { id: 38, bloco: 'zebra', template: 'Manchete da Rodada {RODADA}: o {VENCEDOR_ZEBRA} calou o estádio adversário ao bater o {PERDEDOR_ZEBRA} e ajudou o {CLUBE} a se manter em {POSICAO}º.' },
  { id: 39, bloco: 'zebra', template: 'Nem os analistas mais otimistas previram: o {VENCEDOR_ZEBRA} atropelou taticamente o {PERDEDOR_ZEBRA} na {RODADA}ª rodada do Brasileirão.' },
  { id: 40, bloco: 'zebra', template: 'Encerrada a {RODADA}ª rodada com lição de humildade para o {PERDEDOR_ZEBRA}, superado pela entrega coletiva do {VENCEDOR_ZEBRA}.' },
  { id: 41, bloco: 'craque', template: 'O nome da {RODADA}ª rodada tem sobrenome: {DESTAQUE_JOGADOR}, do {DESTAQUE_CLUBE}, deu verdadeiro espetáculo e recebeu nota máxima da imprensa.' },
  { id: 42, bloco: 'craque', template: 'Fim da Rodada {RODADA} com show particular de {DESTAQUE_JOGADOR}! O craque do {DESTAQUE_CLUBE} desequilibrou e roubou a cena no campeonato.' },
  { id: 43, bloco: 'craque', template: 'Chuva de gols na {RODADA}ª rodada ({GOLS_RODADA} ao todo), comandada pela atuação de gala de {DESTAQUE_JOGADOR}, grande destaque do {DESTAQUE_CLUBE}.' },
  { id: 44, bloco: 'craque', template: 'Corrida pela Chuteira de Ouro: {ARTILHEIRO_LIGA} segue no topo da artilharia após a {RODADA}ª rodada, enquanto {DESTAQUE_JOGADOR} também brilhou.' },
  { id: 45, bloco: 'craque', template: 'Quem segura {DESTAQUE_JOGADOR}? O atleta do {DESTAQUE_CLUBE} foi eleito o melhor em campo da {RODADA}ª rodada em votação unânime dos cronistas.' },
  { id: 46, bloco: 'craque', template: 'Rodada {RODADA} encerrada com gostinho de Seleção Brasileira para {DESTAQUE_JOGADOR} ({DESTAQUE_CLUBE}), autor de lances plásticos e decisivos.' },
  { id: 47, bloco: 'craque', template: 'Placar elástico ({PLACAR_DESTAQUE}) e atuação irretocável de {DESTAQUE_JOGADOR} marcaram o encerramento da {RODADA}ª jornada da Série A.' },
  { id: 48, bloco: 'craque', template: 'Enquanto o {CLUBE} comemora o {POSICAO}º lugar na tabela, a imprensa esportiva elege {DESTAQUE_JOGADOR} ({DESTAQUE_CLUBE}) como o dono da Rodada {RODADA}.' },
  { id: 49, bloco: 'craque', template: 'Foi covardia! {DESTAQUE_JOGADOR} sobrou fisicamente e tecnicamente na {RODADA}ª rodada, guiando o {DESTAQUE_CLUBE} em um jogo memorável.' },
  { id: 50, bloco: 'craque', template: 'Balanço individual da Rodada {RODADA}: {DESTAQUE_JOGADOR} ({DESTAQUE_CLUBE}) liderou em participações diretas em gols e garantiu lugar na seleção da semana.' },
  { id: 51, bloco: 'craque', template: 'Golaços e emoção até os acréscimos na {RODADA}ª rodada! {DESTAQUE_JOGADOR} chamou a responsabilidade pelo {DESTAQUE_CLUBE} e decidiu.' },
  { id: 52, bloco: 'craque', template: 'A {RODADA}ª rodada consagrou {DESTAQUE_JOGADOR} como o jogador mais decisivo do momento no Brasil após mais uma atuação impecável pelo {DESTAQUE_CLUBE}.' },
  { id: 53, bloco: 'craque', template: 'Olho nele! {DESTAQUE_JOGADOR}, do {DESTAQUE_CLUBE}, comandou o placar de {PLACAR_DESTAQUE} e foi o grande personagem do fechamento da {RODADA}ª rodada.' },
  { id: 54, bloco: 'craque', template: 'Artilharia pegando fogo após a {RODADA}ª rodada: {ARTILHEIRO_LIGA} mantém a ponta dos goleadores, mas {DESTAQUE_JOGADOR} encostou na briga.' },
  { id: 55, bloco: 'craque', template: 'Ninguém conseguiu marcar {DESTAQUE_JOGADOR} na {RODADA}ª rodada! O jogador do {DESTAQUE_CLUBE} ditou o ritmo da partida do início ao fim.' },
  { id: 56, bloco: 'craque', template: 'Resumo da {RODADA}ª rodada: coletivamente o {CLUBE} segue firme em {POSICAO}º, e individualmente ninguém jogou mais bola que {DESTAQUE_JOGADOR}.' },
  { id: 57, bloco: 'craque', template: 'Jogo histórico ({PLACAR_DESTAQUE}) fecha a {RODADA}ª rodada com chave de ouro e coloca {DESTAQUE_JOGADOR} ({DESTAQUE_CLUBE}) nas capas de todos os jornais.' },
  { id: 58, bloco: 'craque', template: 'Fase iluminada! {DESTAQUE_JOGADOR} voltou a decidir para o {DESTAQUE_CLUBE} no encerramento da {RODADA}ª rodada e inflamou a torcida.' },
  { id: 59, bloco: 'craque', template: 'Da defesa ao ataque, {DESTAQUE_JOGADOR} foi onipresente pelo {DESTAQUE_CLUBE} e faturou o troféu de craque da {RODADA}ª rodada.' },
  { id: 60, bloco: 'craque', template: 'Fim da {RODADA}ª jornada: {ARTILHEIRO_LIGA} segue como o terror dos goleiros, numa rodada em que {DESTAQUE_JOGADOR} também deu aula de futebol.' },
  { id: 61, bloco: 'curiosidade', template: 'Curiosidade da Rodada {RODADA}: nenhum visitante conseguiu vencer fora de casa nos 10 jogos — 100% de aproveitamento para os mandantes!' },
  { id: 62, bloco: 'curiosidade', template: 'Fato raro na {RODADA}ª rodada: sete dos dez jogos tiveram gols marcados após os 40 minutos do segundo tempo, provando que ninguém desiste.' },
  { id: 63, bloco: 'curiosidade', template: 'Estatística curiosa do fechamento da {RODADA}ª rodada: o {CLUBE} ({POSICAO}º) chegou ao quarto jogo seguido sem sofrer gols nos primeiros 45 minutos.' },
  { id: 64, bloco: 'curiosidade', template: 'Haja coração! A {RODADA}ª rodada registrou três viradas espetaculares no segundo tempo e um total de {GOLS_RODADA} gols balançando as redes.' },
  { id: 65, bloco: 'curiosidade', template: 'Marca histórica na Rodada {RODADA}: os goleiros defenderam quatro cobranças de pênalti nos jogos do fim de semana e roubaram o protagonismo dos atacantes.' },
  { id: 66, bloco: 'curiosidade', template: 'Curiosidade tática da {RODADA}ª rodada: os times que tiveram menos posse de bola venceram 60% das partidas, premiando o jogo vertical e reativo.' },
  { id: 67, bloco: 'curiosidade', template: 'Olha esse dado da Rodada {RODADA}: pela primeira vez no campeonato, todos os clubes do G4 terminaram a jornada exatamente com a mesma pontuação somada.' },
  { id: 68, bloco: 'curiosidade', template: 'Dia dos veteranos! Jogadores acima de 34 anos foram responsáveis por quase metade dos gols marcados no encerramento da {RODADA}ª rodada.' },
  { id: 69, bloco: 'curiosidade', template: 'Fato curioso da {RODADA}ª rodada: o placar de {PLACAR_DESTAQUE} quebrou um tabu de mais de cinco anos no confronto direto e agitou a tabela.' },
  { id: 70, bloco: 'curiosidade', template: 'Bola parada mortal: 42% dos {GOLS_RODADA} gols da {RODADA}ª rodada saíram em escanteios ou faltas laterais ensaiadas nos treinos da semana.' },
  { id: 71, bloco: 'curiosidade', template: 'Tabu quebrado na {RODADA}ª rodada! O {VENCEDOR_ZEBRA} não vencía o {PERDEDOR_ZEBRA} desde a temporada passada e espantou o fantasma em grande estilo.' },
  { id: 72, bloco: 'curiosidade', template: 'Rodada {RODADA} econômica: com apenas {GOLS_RODADA} gols em dez partidas, esta entra para as estatísticas como uma das rodadas mais amarradas do ano.' },
  { id: 73, bloco: 'curiosidade', template: 'Chuva de gols de fora da área! O encerramento da {RODADA}ª rodada teve cinco pinturas de longa distância, incluindo a de {DESTAQUE_JOGADOR}.' },
  { id: 74, bloco: 'curiosidade', template: 'Coincidência numérica na Rodada {RODADA}: três partidas terminaram exatamente com o mesmo placar, mantendo o {CLUBE} estacionado em {POSICAO}º lugar.' },
  { id: 75, bloco: 'curiosidade', template: 'Os bancos de reservas decidiram a {RODADA}ª rodada: jogadores que entraram no segundo tempo marcaram seis gols e mudaram o destino da tabela.' },
  { id: 76, bloco: 'curiosidade', template: 'Curiosidade da {RODADA}ª rodada: o {LIDER} manteve a liderança mesmo tendo finalizações a gol abaixo da média da própria competição.' },
  { id: 77, bloco: 'curiosidade', template: 'Defesa de ferro! No encerramento da {RODADA}ª rodada, os zagueiros cortaram mais bolas aéreas do que em qualquer outra jornada deste Brasileirão.' },
  { id: 78, bloco: 'curiosidade', template: 'Fato inusitado na Rodada {RODADA}: quatro jogos tiveram gols relâmpagos antes dos 5 minutos iniciais, pegando as defesas ainda frias.' },
  { id: 79, bloco: 'curiosidade', template: 'O peso da camisa 9: os centroavantes voltaram a mandar na {RODADA}ª rodada, anotando mais de 65% dos gols nos estádios lotados pelo país.' },
  { id: 80, bloco: 'curiosidade', template: 'Equilíbrio cirúrgico após {RODADA} rodadas: o saldo de gols do {CLUBE} ({POSICAO}º) é um dos melhores entre os times da parte superior da tabela.' },
  { id: 81, bloco: 'curiosidade', template: 'Curiosidade disciplinar da {RODADA}ª rodada: a média de cartões amarelos caiu pela metade em comparação à rodada passada, deixando o jogo fluir.' },
  { id: 82, bloco: 'curiosidade', template: 'Virada relâmpago! O placar de {PLACAR_DESTAQUE} entrou para a história da {RODADA}ª rodada após dois gols marcados em um intervalo de apenas 90 segundos.' },
  { id: 83, bloco: 'curiosidade', template: 'Fato curioso: com o fim da {RODADA}ª rodada, nenhum clube da Série A mantém mais 100% de aproveitamento como visitante no campeonato.' },
  { id: 84, bloco: 'curiosidade', template: 'Sintonia fina! A dupla de ataque do {DESTAQUE_CLUBE} liderou todas as estatísticas ofensivas da {RODADA}ª rodada ao lado de {DESTAQUE_JOGADOR}.' },
  { id: 85, bloco: 'curiosidade', template: 'Emoção até o último suspiro: o gol que fechou a {RODADA}ª rodada saiu aos 49 minutos do segundo tempo e alterou três posições na tabela.' },
  { id: 86, bloco: 'analise', template: 'Prancheta em alta na {RODADA}ª rodada: os treinadores que ousaram mudar o esquema no intervalo colheram vitórias fundamentais na reta final.' },
  { id: 87, bloco: 'analise', template: 'Fim da {RODADA}ª rodada com cheiro de decisão! O {CLUBE} chega aos {PONTOS} pontos em {POSICAO}º lugar e transforma o próximo jogo em final antecipada.' },
  { id: 88, bloco: 'analise', template: 'A maratona cobra seu preço: a {RODADA}ª rodada evidenciou o desgaste físico dos elencos, favorecendo quem rodou o plantel durante a semana.' },
  { id: 89, bloco: 'analise', template: 'Análise da Rodada {RODADA}: o 4-3-3 ofensivo voltou a dominar os números de expected goals (xG), premiando equipes corajosas como o {DESTAQUE_CLUBE}.' },
  { id: 90, bloco: 'analise', template: 'Olho na sequência! Encerrada a {RODADA}ª rodada, o {CLUBE} ({POSICAO}º) inicia a preparação para uma sequência pesada contra rivais diretos do G6.' },
  { id: 91, bloco: 'analise', template: 'Rodada {RODADA} concluída: quem soube sofrer sem a bola levou a melhor nos duelos equilibrados e somou pontos de ouro na classificação.' },
  { id: 92, bloco: 'analise', template: 'A torcida fez a diferença na {RODADA}ª rodada! Média de público acima dos 35 mil pagantes impulsionou os mandantes e deu espetáculo nas arquibancadas.' },
  { id: 93, bloco: 'analise', template: 'Recado dado na {RODADA}ª rodada: o {CLUBE} mostra maturidade competitiva na {POSICAO}ª posição e avisa aos líderes que vai brigar até o fim.' },
  { id: 94, bloco: 'analise', template: 'Fechamento da {RODADA}ª rodada deixa lição clara: erro na saída de bola custou derrotas caras neste fim de semana na Série A.' },
  { id: 95, bloco: 'analise', template: 'O campeonato afunilou de vez após a {RODADA}ª rodada! Cada ponto perdido agora pesa o dobro, e o {CLUBE} ({POSICAO}º) sabe que não pode vacilar.' },
  { id: 96, bloco: 'analise', template: 'Resumo tático da {RODADA}ª rodada: linhas compactas e transições em velocidade ditaram o ritmo do triunfo de {DESTAQUE_CLUBE} por {PLACAR_DESTAQUE}.' },
  { id: 97, bloco: 'analise', template: 'Fim de mais um capítulo do Brasileirão! Após a {RODADA}ª rodada, o {CLUBE} soma {PONTOS} pontos ({POSICAO}º) e mantém viva a ambição na temporada.' },
  { id: 98, bloco: 'analise', template: 'Rodada {RODADA} encerrada sem espaço para acomodação: até os líderes suaram sangue para confirmar o favoritismo dentro de campo.' },
  { id: 99, bloco: 'analise', template: 'Termômetro da Série A pós-Rodada {RODADA}: moral em alta no {CLUBE} ({POSICAO}º lugar) e sinal de alerta ligado nos bastidores do {PERDEDOR_ZEBRA}.' },
  { id: 100, bloco: 'analise', template: 'Apito final na {RODADA}ª rodada! Com {GOLS_RODADA} gols, drama na tabela e show de {DESTAQUE_JOGADOR}, o campeonato segue imprevisível com o {CLUBE} em {POSICAO}º.' },
];


const TITULO_BLOCO: Record<BlocoEncerramento, string> = {
  tabela: 'Tabela',
  zebra: 'Zebra',
  craque: 'Craque',
  curiosidade: 'Curiosidade',
  analise: 'Análise',
};

export interface ContextoEncerramentoRodada {
  rodada: number;
  dataISO: string;
  clubeId: string;
  clubeNome: string;
  posicao: number;
  pontos: number;
  liderId: string;
  liderNome: string;
  viceId: string;
  viceNome: string;
  lanternaId: string;
  lanternaNome: string;
  destaqueJogadorId: number | null;
  destaqueJogadorNome: string;
  destaqueClubeId: string | null;
  destaqueClubeNome: string;
  placarDestaque: string;
  vencedorZebraId: string | null;
  vencedorZebraNome: string;
  perdedorZebraId: string | null;
  perdedorZebraNome: string;
  artilheiroId: number | null;
  artilheiroNome: string;
  golsRodada: number;
  temZebra: boolean;
  temDestaque: boolean;
}

function nomeClube(times: Time[], id: string): string {
  const t = times.find((x) => x.id === id);
  return t?.nome ?? t?.nome_completo ?? id;
}

function prestigioTime(t: Time | undefined): number {
  if (!t) return 50;
  return t.prestigio ?? t.forca_geral ?? 50;
}

function seedPick(seed: number, modulo: number): number {
  if (modulo <= 0) return 0;
  const x = (seed * 1103515245 + 12345) >>> 0;
  return x % modulo;
}

function hashRodada(rodada: number, extra = 0): number {
  return ((rodada * 2654435761) ^ (extra * 1597334677)) >>> 0;
}

/** Monta contexto dinâmico a partir do estado pós-rodada. */
export function montarContextoEncerramentoRodada(params: {
  estado: EstadoTemporada;
  rodada: number;
  clubeId: string;
  times: Time[];
  jogadores: Jogador[];
}): ContextoEncerramentoRodada {
  const { estado, rodada, clubeId, times, jogadores } = params;
  const tabela = ordenarTabela(estado.tabela);
  const lider = tabela[0];
  const vice = tabela[1] ?? tabela[0];
  const lanterna = tabela[tabela.length - 1] ?? tabela[0];
  const linhaUser = tabela.find((l) => l.time_id === clubeId);
  const posicao = posicaoDoTime(estado.tabela, clubeId);
  const pontos = linhaUser?.pontos ?? 0;

  const jogos = partidasDaRodada(estado, rodada).filter((p) => p.finalizado);
  let golsRodada = 0;
  let placarDestaque = '—';
  let melhorDiff = -1;
  let zebra: { vencedor: string; perdedor: string; gap: number } | null = null;

  for (const p of jogos) {
    const gm = p.golsMandante ?? 0;
    const gv = p.golsVisitante ?? 0;
    golsRodada += gm + gv;
    const diff = Math.abs(gm - gv);
    if (diff > melhorDiff || (diff === melhorDiff && gm + gv > 0)) {
      melhorDiff = diff;
      const nm = nomeClube(times, p.mandanteId);
      const nv = nomeClube(times, p.visitanteId);
      placarDestaque = `${nm} ${gm}x${gv} ${nv}`;
    }
    if (gm === gv) continue;
    const vencedorId = gm > gv ? p.mandanteId : p.visitanteId;
    const perdedorId = gm > gv ? p.visitanteId : p.mandanteId;
    const pv = prestigioTime(times.find((t) => t.id === vencedorId));
    const pp = prestigioTime(times.find((t) => t.id === perdedorId));
    const gap = pp - pv;
    if (gap >= 8 && (!zebra || gap > zebra.gap)) {
      zebra = { vencedor: vencedorId, perdedor: perdedorId, gap };
    }
  }

  const golsRodadaPorJogador = new Map<number, { gols: number; timeId: string }>();
  const golsTemporada = new Map<number, { gols: number; timeId: string }>();
  for (const p of estado.partidas) {
    if (!p.finalizado || !p.desempenhoJogadores) continue;
    for (const d of p.desempenhoJogadores) {
      if (d.gols <= 0) continue;
      const temp = golsTemporada.get(d.jogadorId) ?? { gols: 0, timeId: d.timeId };
      temp.gols += d.gols;
      temp.timeId = d.timeId;
      golsTemporada.set(d.jogadorId, temp);
      if (p.rodada === rodada) {
        const r = golsRodadaPorJogador.get(d.jogadorId) ?? { gols: 0, timeId: d.timeId };
        r.gols += d.gols;
        r.timeId = d.timeId;
        golsRodadaPorJogador.set(d.jogadorId, r);
      }
    }
  }

  let destaqueJogadorId: number | null = null;
  let destaqueGols = 0;
  for (const [id, info] of golsRodadaPorJogador) {
    if (info.gols > destaqueGols) {
      destaqueGols = info.gols;
      destaqueJogadorId = id;
    }
  }
  // Fallback: jogador do placar elástico (maior overall do vencedor)
  if (destaqueJogadorId == null && jogos.length) {
    const elastico = [...jogos].sort(
      (a, b) =>
        Math.abs((b.golsMandante ?? 0) - (b.golsVisitante ?? 0)) -
        Math.abs((a.golsMandante ?? 0) - (a.golsVisitante ?? 0)),
    )[0]!;
    const gm = elastico.golsMandante ?? 0;
    const gv = elastico.golsVisitante ?? 0;
    const vencedorId =
      gm === gv ? elastico.mandanteId : gm > gv ? elastico.mandanteId : elastico.visitanteId;
    const candidatos = jogadores.filter((j) => j.time_id === vencedorId);
    candidatos.sort((a, b) => b.overall - a.overall);
    if (candidatos[0]) destaqueJogadorId = candidatos[0].id;
  }

  const destaqueJog = destaqueJogadorId != null
    ? jogadores.find((j) => j.id === destaqueJogadorId)
    : undefined;
  const destaqueClubeId = destaqueJog?.time_id
    ?? (destaqueJogadorId != null
      ? golsRodadaPorJogador.get(destaqueJogadorId)?.timeId ?? null
      : null);

  let artilheiroId: number | null = null;
  let artGols = -1;
  for (const [id, info] of golsTemporada) {
    if (info.gols > artGols) {
      artGols = info.gols;
      artilheiroId = id;
    }
  }
  if (artilheiroId == null) artilheiroId = destaqueJogadorId;
  const artilheiro = artilheiroId != null ? jogadores.find((j) => j.id === artilheiroId) : undefined;

  const liderId = lider?.time_id ?? clubeId;
  const viceId = vice?.time_id ?? clubeId;
  const lanternaId = lanterna?.time_id ?? clubeId;

  return {
    rodada,
    dataISO: estado.dataAtualISO,
    clubeId,
    clubeNome: nomeClube(times, clubeId),
    posicao,
    pontos,
    liderId,
    liderNome: nomeClube(times, liderId),
    viceId,
    viceNome: nomeClube(times, viceId),
    lanternaId,
    lanternaNome: nomeClube(times, lanternaId),
    destaqueJogadorId: destaqueJogadorId ?? null,
    destaqueJogadorNome: destaqueJog?.nome ?? 'o destaque da rodada',
    destaqueClubeId,
    destaqueClubeNome: destaqueClubeId ? nomeClube(times, destaqueClubeId) : 'o clube destaque',
    placarDestaque,
    vencedorZebraId: zebra?.vencedor ?? null,
    vencedorZebraNome: zebra ? nomeClube(times, zebra.vencedor) : 'o azarão',
    perdedorZebraId: zebra?.perdedor ?? null,
    perdedorZebraNome: zebra ? nomeClube(times, zebra.perdedor) : 'o favorito',
    artilheiroId: artilheiroId ?? null,
    artilheiroNome: artilheiro?.nome ?? 'o artilheiro',
    golsRodada,
    temZebra: !!zebra,
    temDestaque: destaqueJogadorId != null,
  };
}

function preencherTemplate(tpl: string, ctx: ContextoEncerramentoRodada): string {
  const club = (id: string | null, nome: string) => (id ? marcarClube(id, nome) : nome);
  const jog = (id: number | null, nome: string) => (id != null ? marcarJogador(id, nome) : nome);

  return tpl
    .replaceAll('{RODADA}', String(ctx.rodada))
    .replaceAll('{CLUBE}', club(ctx.clubeId, ctx.clubeNome))
    .replaceAll('{POSICAO}', String(ctx.posicao))
    .replaceAll('{PONTOS}', String(ctx.pontos))
    .replaceAll('{LIDER}', club(ctx.liderId, ctx.liderNome))
    .replaceAll('{VICE}', club(ctx.viceId, ctx.viceNome))
    .replaceAll('{LANTERNA}', club(ctx.lanternaId, ctx.lanternaNome))
    .replaceAll('{DESTAQUE_JOGADOR}', jog(ctx.destaqueJogadorId, ctx.destaqueJogadorNome))
    .replaceAll('{DESTAQUE_CLUBE}', club(ctx.destaqueClubeId, ctx.destaqueClubeNome))
    .replaceAll('{PLACAR_DESTAQUE}', ctx.placarDestaque)
    .replaceAll('{VENCEDOR_ZEBRA}', club(ctx.vencedorZebraId, ctx.vencedorZebraNome))
    .replaceAll('{PERDEDOR_ZEBRA}', club(ctx.perdedorZebraId, ctx.perdedorZebraNome))
    .replaceAll('{ARTILHEIRO_LIGA}', jog(ctx.artilheiroId, ctx.artilheiroNome))
    .replaceAll('{GOLS_RODADA}', String(ctx.golsRodada));
}

function templatesDoBloco(bloco: BlocoEncerramento): TemplateEncerramentoRodada[] {
  return TEMPLATES_ENCERRAMENTO_RODADA.filter((t) => t.bloco === bloco);
}

function escolherTemplate(
  bloco: BlocoEncerramento,
  seed: number,
): TemplateEncerramentoRodada {
  const lista = templatesDoBloco(bloco);
  return lista[seedPick(seed, lista.length)]!;
}

/**
 * Gera 3–4 notícias de encerramento de rodada a partir do banco de 100,
 * cobrindo blocos distintos (tabela, zebra, craque, curiosidade/análise).
 */
export function gerarNoticiasEncerramentoRodada(
  ctx: ContextoEncerramentoRodada,
  seed = hashRodada(ctx.rodada),
): NoticiaCarreira[] {
  const blocos: BlocoEncerramento[] = ['tabela'];
  if (ctx.temZebra) blocos.push('zebra');
  if (ctx.temDestaque) blocos.push('craque');
  blocos.push(seedPick(seed ^ 0xabc, 2) === 0 ? 'curiosidade' : 'analise');
  // Garante variedade se zebra/destaque faltarem
  if (blocos.length < 3) blocos.push('curiosidade');
  if (blocos.length < 4 && !blocos.includes('analise')) blocos.push('analise');

  const usados = new Set<number>();
  const out: NoticiaCarreira[] = [];
  const data = `${ctx.dataISO}T22:00:00.000Z`;

  blocos.forEach((bloco, i) => {
    let tpl = escolherTemplate(bloco, seed ^ (i * 9973) ^ ctx.rodada);
    let tentativas = 0;
    while (usados.has(tpl.id) && tentativas < 12) {
      tpl = escolherTemplate(bloco, seed ^ (i * 9973) ^ ctx.rodada ^ (tentativas + 1) * 131);
      tentativas += 1;
    }
    usados.add(tpl.id);
    const filled = preencherTemplate(tpl.template, ctx);
    out.push({
      id: `enc_rod_${ctx.rodada}_${bloco}_${tpl.id}`,
      data,
      titulo: `${TITULO_BLOCO[bloco]} · Rodada ${ctx.rodada}`,
      texto: filled,
    });
  });

  return out;
}
