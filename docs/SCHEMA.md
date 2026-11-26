# SCHEMA DE DADOS - GVS MANAGER (VERSÃO 1.0)
> **Regra de Ouro:** Todos os dados de clubes, jogadores e campeonatos devem ficar isolados na pasta `database/` em formato `.json`. Nunca escreva nomes de times ou jogadores diretamente dentro do código-fonte (`src/`). Isso permite atualizar elencos e criar novos cenários (ex: Brasileirão 2026, Seleções Clássicas) apenas editando arquivos de texto.

---

## 1. ESTRUTURA DE ARQUIVOS NA PASTA `database/`
* `database/campeonato.json` -> Configurações gerais da liga e calendário.
* `database/times.json` -> Lista de todos os clubes participantes.
* `database/jogadores.json` -> Base completa de atletas vinculados aos clubes por `time_id`.
* `saves/savegame_01.json` -> Arquivo gerado automaticamente quando o usuário clica em "Salvar Jogo".

---

## 2. MODELO: `database/campeonato.json`
Define as regras da competição atual.

```json
{
  "nome_campeonato": "Campeonato Brasileiro - Série A",
  "temporada": 2026,
  "quantidade_times": 20,
  "turno_e_returno": true,
  "bonus_mando_campo": 1.05,
  "regras_pontuacao": {
    "vitoria": 3,
    "empate": 1,
    "derrota": 0
  }
}
```

---

## 3. MODELO: `database/times.json`
Define cada clube. O campo `id` é a chave que conecta o time aos seus jogadores.

```json
[
  {
    "id": "FLU",
    "nome": "Fluminense FC",
    "nome_curto": "Fluminense",
    "cidade": "Rio de Janeiro",
    "estadio": "Maracanã",
    "cor_primaria": "#8A1538",
    "cor_secundaria": "#006633",
    "esquema_tatico_padrao": "4-3-3",
    "prestigio": 85
  },
  {
    "id": "FLA",
    "nome": "CR Flamengo",
    "nome_curto": "Flamengo",
    "cidade": "Rio de Janeiro",
    "estadio": "Maracanã",
    "cor_primaria": "#C8102E",
    "cor_secundaria": "#000000",
    "esquema_tatico_padrao": "4-4-2",
    "prestigio": 88
  }
]
```

---

## 4. MODELO: `database/jogadores.json`
Define cada atleta. Para manter o MVP enxuto, usamos **4 atributos técnicos** + **energia**.

* **Posições válidas:** `"GOL"` (Goleiro), `"ZAG"` (Zagueiro), `"LAT"` (Lateral), `"VOL"` (Volante), `"MEI"` (Meia), `"ATA"` (Atacante).
* **Escala de atributos:** `1` a `99`.

```json
[
  {
    "id": 1001,
    "time_id": "FLU",
    "nome": "Fábio",
    "idade": 45,
    "posicao": "GOL",
    "atributos": {
      "defesa": 84,
      "passe": 65,
      "chute": 30,
      "velocidade": 52
    },
    "overall": 82,
    "energia": 100,
    "status_escalacao": "TITULAR"
  },
  {
    "id": 1002,
    "time_id": "FLU",
    "nome": "Germán Cano",
    "idade": 38,
    "posicao": "ATA",
    "atributos": {
      "defesa": 35,
      "passe": 72,
      "chute": 88,
      "velocidade": 74
    },
    "overall": 84,
    "energia": 100,
    "status_escalacao": "TITULAR"
  }
]
```

---

## 5. MODELO DO SAVEGAME (`saves/savegame_01.json`)
Quando o jogador salva o progresso, o sistema grava o estado atual da temporada sem alterar os arquivos originais da pasta `database/`.

```json
{
  "data_save": "2026-11-26 12:00:00",
  "time_usuario_id": "FLU",
  "rodada_atual": 1,
  "tabela_classificacao": [
    {
      "time_id": "FLU",
      "pontos": 0,
      "jogos": 0,
      "vitorias": 0,
      "empates": 0,
      "derrotas": 0,
      "gols_pro": 0,
      "gols_contra": 0,
      "saldo_gols": 0
    }
  ],
  "calendario_jogos": [
    {
      "rodada": 1,
      "mandante_id": "FLU",
      "visitante_id": "FLA",
      "gols_mandante": null,
      "gols_visitante": null,
      "finalizado": false
    }
  ],
  "elenco_atualizado": []
}
```
