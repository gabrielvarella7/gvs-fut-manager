/** Legendas dinâmicas — estilo Paulo Andrade (GVS Manager). */
export type CategoriaNarracao =
  | 'abertura'
  | 'posse'
  | 'perigo'
  | 'trave'
  | 'defesa'
  | 'gol'
  | 'golaco'
  | 'bola_parada'
  | 'cartao'
  | 'intervalo'
  | 'fim';

export const LEGENDAS_PAULO_ANDRADE: Record<CategoriaNarracao, string[]> = {
  abertura: [
    'Muito bem! Sejam todos muito bem-vindos ao {ESTADIO}! Vai começar o espetáculo entre {MANDANTE} e {VISITANTE}!',
    'Casa cheia, clima de decisão no {ESTADIO}! Autoriza o árbitro, rola a bola para {MANDANTE} e {VISITANTE}!',
    'Começa o jogo! Saída dada pelo {TIME_ATAQUE}, que já busca o campo ofensivo logo nos primeiros segundos!',
    'Que beleza de ambiente no {ESTADIO}! Apita o juiz, a bola está rolando no Brasileirão!',
    'Começa o segundo tempo! Tudo igual ou teremos emoções fortes nesta etapa final? Rola a bola!',
    'Recomeça a partida no {ESTADIO}! As duas equipes voltam sem alterações para os 45 minutos finais.',
  ],
  posse: [
    'Trabalha a bola com paciência no meio-campo a equipe do {TIME_ATAQUE}.',
    'Boa troca de passes! {ASSISTENTE} clareia a jogada e aciona {JOGADOR} na intermediária.',
    'Olha a triangulação do {TIME_ATAQUE}... Que beleza de toque de bola para envolver a marcação!',
    'Sobe as linhas de marcação o {TIME_DEFESA}, dificultando a saída de bola do adversário.',
    '{JOGADOR} domina no círculo central, levanta a cabeça e inverte o jogo com categoria.',
    'Ritmo intenso no {ESTADIO}! O {TIME_ATAQUE} roda a bola de um lado para o outro buscando espaços.',
    'Excelente antecipação da defesa do {TIME_DEFESA}, cortando a linha de passe de {ASSISTENTE}.',
    'Bola fatiada por {ASSISTENTE} buscando a movimentação de {JOGADOR} na ponta direita.',
    'O {TIME_ATAQUE} valoriza a posse de bola e esfria o ímpeto inicial do {TIME_DEFESA}.',
    'Que categoria de {JOGADOR} para escapar da pressão dupla no meio de campo!',
  ],
  perigo: [
    'Lá vem o {TIME_ATAQUE}! {ASSISTENTE} enfia uma bola açucarada para {JOGADOR}... Pintou chance!',
    'Olha o perigo! {JOGADOR} limpa o marcador na entrada da área e solta a bomba... PRA FORA! Tiro de meta!',
    'UUUUUH! Passou tirando tinta da trave direita de {GOLEIRO}! Que chegada perigosa do {TIME_ATAQUE}!',
    'Cruzamento fechado de {ASSISTENTE}, {JOGADOR} desvia de primeira e a bola sobe demais!',
    'Que jogada individual de {JOGADOR}! Cortou para o meio, bateu colocado... passou muito perto do ângulo!',
    'Pintou o contra-ataque fulminante do {TIME_ATAQUE}! {JOGADOR} invade a área, bate cruzado e a bola cruza toda a pequena área!',
    'Arremate de longa distância de {JOGADOR}! A bola ganha efeito, mas sai à esquerda da meta de {GOLEIRO}.',
    'Perdeu uma chance incrível! Na cara do gol, {JOGADOR} pegou mal na bola e mandou por cima do travessão!',
    'Boa trama ofensiva pelo lado esquerdo! {ASSISTENTE} rola para trás e {JOGADOR} finaliza rente ao poste!',
    'Escapou com velocidade o {TIME_ATAQUE}, mas na hora H {JOGADOR} finalizou sem direção.',
  ],
  trave: [
    'NA TRAVE! Explode no poste direito de {GOLEIRO}! Que susto no {ESTADIO}!',
    'NO TRAVESSÃO! {JOGADOR} soltou um foguete de fora da área e a bola carimbou o ferro! Que beleza de chute!',
    'Pega na trave e volta para o meio da área! A zaga do {TIME_DEFESA} afasta de qualquer maneira!',
    'Incrível! {JOGADOR} cabeceou firme no contrapé de {GOLEIRO}, mas a trave salvou o {TIME_DEFESA}!',
  ],
  defesa: [
    'DEFESAÇA! Espetacular o goleiro {GOLEIRO}! Que reflexo absurdo para evitar o gol de {JOGADOR}!',
    'Olha o chute de {JOGADOR}... SALVA {GOLEIRO}! Espalma para escanteio no limite do alcance!',
    'Que milagre no {ESTADIO}! À queima-roupa, {JOGADOR} finalizou e {GOLEIRO} fechou o ângulo com perfeição!',
    'Firme, sem dar rebote! {GOLEIRO} encaixa o chute venenoso de {JOGADOR} e já liga o contra-ataque.',
    'Voou no cantinho o goleiro {GOLEIRO}! Pontinha dos dedos para mandar a finalização de {JOGADOR} pela linha de fundo!',
    'Segura em dois tempos {GOLEIRO}! O arremate de {JOGADOR} veio quicando na frente dele, mas o paredão garantiu!',
  ],
  gol: [
    'GOOOOOOOOOOOL! É DO {TIME_ATAQUE}! {JOGADOR}! A rede balança no {ESTADIO}!',
    'GOOOOOOOOOOOL! {JOGADOR} manda para o fundo do barbante! Que beleza de conclusão para abrir o placar!',
    'GOOOOOOOOOOOL! Lá está ela no fundo das redes! Assistência perfeita de {ASSISTENTE} e toque letal de {JOGADOR}!',
    'GOOOOOOOOOOOL! É do {TIME_ATAQUE}! {JOGADOR} aproveita a sobra dentro da área e fuzila sem chances para {GOLEIRO}!',
    'GOOOOOOOOOOOL! Ele não perdoa! {JOGADOR} recebe na medida de {ASSISTENTE} e desloca o goleiro {GOLEIRO} com frieza!',
    'GOOOOOOOOOOOL! Explode a torcida no {ESTADIO}! {JOGADOR} amplia a vantagem do {TIME_ATAQUE}! Placar atualizado: {PLACAR}!',
  ],
  golaco: [
    'GOOOOOOOOOOOL! QUE PINTURA! QUE CATEGORIA DE {JOGADOR}! Um golaço antológico no {ESTADIO}!',
    'GOOOOOOOOOOOL! ONDE A CORUJA DORME! {JOGADOR} acertou um chute espetacular no ângulo de {GOLEIRO}! Que beleza!',
    'GOOOOOOOOOOOL! Contra-ataque de manual do {TIME_ATAQUE}! Em três toques, {ASSISTENTE} lançou e {JOGADOR} concluiu com perfeição!',
    'GOOOOOOOOOOOL! Que jogadaça! {JOGADOR} deixou dois marcadores para trás e bateu colocado no canto! Golaço do {TIME_ATAQUE}!',
  ],
  bola_parada: [
    'GOOOOOOOOOOOL! Subiu no terceiro andar! Testada firme de {JOGADOR} após cobrança de escanteio de {ASSISTENTE}!',
    'GOOOOOOOOOOOL! Bola parada mortal do {TIME_ATAQUE}! {ASSISTENTE} coloca na cabeça de {JOGADOR}, que desvia para o fundo do gol!',
    'GOOOOOOOOOOOL! De pênalti! {JOGADOR} bate com extrema categoria, desloca {GOLEIRO} e corre para o abraço!',
    'GOOOOOOOOOOOL! Cobrança de falta magistral de {JOGADOR}! Por cima da barreira, sem defesa para {GOLEIRO}!',
  ],
  cartao: [
    'Falta dura de {JOGADOR} para matar o contra-ataque do {TIME_ATAQUE}! O árbitro marca a infração.',
    'Cartão amarelo pintando na tela! {JOGADOR} chegou atrasado na dividida e está advertido.',
    'Falta perigosa na entrada da área! Boa oportunidade na bola parada para o {TIME_ATAQUE}.',
    'O árbitro conversa sério com {JOGADOR}, chama a atenção verbalmente e manda seguir o jogo.',
  ],
  intervalo: [
    'Apita o árbitro! Fim do primeiro tempo no {ESTADIO}! Por enquanto, {MANDANTE} e {VISITANTE} vão fazendo um grande duelo: {PLACAR}.',
    'Intervalo de jogo! Hora de os treinadores ajustarem as peças nos vestiários.',
    'Entramos nos acréscimos! O quarto árbitro levanta a placa no {ESTADIO}. Haja coração!',
  ],
  fim: [
    'FIM DE PAPO NO {ESTADIO}! Apita o árbitro pela última vez! Vitória importante no Brasileirão: {PLACAR}!',
    'Fim de jogo! Tudo igual no placar após 90 minutos muito disputados entre {MANDANTE} e {VISITANTE}: {PLACAR}!',
    'Encerrada a partida! Que espetáculo de futebol acompanhamos hoje no {ESTADIO}! Placar final: {PLACAR}!',
  ],
};