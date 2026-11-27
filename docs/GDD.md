# GDD - Mestre Mou (VERSÃO 1.0 - MVP)
> **Nota de Uso:** Este é o documento de escopo do Produto Mínimo Viável (MVP). Edite os itens entre `[colchetes]` para personalizar as regras antes de entregar este arquivo à IA no Cursor ou Claude Code.

---

## 1. VISÃO GERAL DO PROJETO
* **Nome do Jogo:** Mestre Mou
* **Gênero:** Simulador de Gerenciamento de Futebol (Estilo *Championship Manager* / *Brasfoot*).
* **Plataforma Alvo:** [Web Navegador (HTML/CSS/JS ou React) / Desktop Windows (Python)]
* **Objetivo da Versão 1.0:** Permitir que o jogador escolha um clube, defina a escalação titular, simule partidas em tempo real com narração em texto e dispute um campeonato de pontos corridos completo até o título.

---

## 2. FLUXO DE TELAS (JORNADA DO JOGADOR)
1. **Tela Inicial:**
   * Botão `Novo Jogo` (inicia temporada carregando os arquivos da pasta `database/`).
   * Botão `Carregar Jogo` (lê um arquivo de progresso salvo `savegame.json`).
2. **Tela de Seleção de Clube:**
   * Lista os clubes disponíveis no campeonato com nome, escudo/cores, força média (Overall) e estádio.
   * O usuário seleciona 1 clube para treinar (os demais serão controlados pela CPU).
3. **Tela Principal (Dashboard do Clube):**
   * Exibe o próximo adversário (mandante ou visitante), rodada atual e posição na tabela.
   * Botões de navegação: `Elenco & Tática`, `Tabela de Classificação`, `Jogar Próxima Rodada`, `Salvar Jogo`.
4. **Tela de Elenco & Tática:**
   * Lista todos os jogadores do elenco com: Nome, Posição (`GOL`, `ZAG`, `LAT`, `VOL`, `MEI`, `ATA`), Idade, Overall (1 a 99) e Energia/Fadiga (0 a 100%).
   * Permite escolher o esquema tático (ex: `4-4-2`, `4-3-3`, `3-5-2`) e definir os **11 titulares** + **7 reservas**.
5. **Tela de Simulação da Partida (Ao Vivo):**
   * Placar em tempo real e relógio correndo de `0'` a `90'` (com controle de velocidade: 1x, 2x, 4x e Pausa).
   * Feed de narração em texto mostrando lances de perigo, chutes defendidos, cartões, substituições e gols.
   * Botão `Pausar / Substituir` para trocar jogadores cansados durante o intervalo ou segundo tempo.
   * Ao fim dos 90 minutos, exibe o resumo da partida e os resultados simultâneos dos outros jogos da rodada.
6. **Tela de Tabela de Classificação:**
   * Tabela completa ordenada por: Pontos (`P`), Vitórias (`V`), Saldo de Gols (`SG`) e Gols Pró (`GP`).
   * Destaque visual para o líder, zona de classificação e rebaixamento.

---

## 3. REGRAS DE NEGÓCIO DO MOTOR DE SIMULAÇÃO (CORE)
* **Formato do Campeonato (v1.0):** Liga única de `[20]` clubes em pontos corridos (turno e returno, totalizando `[38]` rodadas).
* **Sistema de Pontuação:** Vitória = `3 pts`, Empate = `1 pt`, Derrota = `0 pts`.
* **Cálculo de Força na Partida:**
  * A força de cada setor (Defesa, Meio-Campo, Ataque) é calculada pela média dos atributos dos 11 titulares escalados naquela posição.
  * **Fator Casa:** O time mandante recebe um bônus de `[+5%]` na força total.
  * **Penalidade por Improvisação:** Jogador escalado fora da sua posição de origem sofre redução de `[-20%]` no seu desempenho na partida.
  * **Desgaste Físico (Fadiga):** A cada minuto jogado, a energia do atleta cai. Abaixo de `60%` de energia, o jogador perde rendimento proporcionalmente. Entre uma rodada e outra, os jogadores recuperam `[+25%]` de energia (reservas recuperam `[+40%]`).

---

## 4. FORA DE ESCOPO NA VERSÃO 1.0 (DEIXAR PARA V2.0)
> **Regra para a IA:** NÃO implementar nenhuma destas mecânicas agora para evitar complexidade desnecessária no MVP.
* Mercado de transferências (compra, venda e empréstimo de jogadores).
* Gestão financeira (salários, bilheteria, patrocínios).
* Lesões, departamento médico e suspensão automática por cartões amarelos.
* Categorias de base e evolução/envelhecimento de atributos entre temporadas.
* Copas mata-mata e competições continentais.
