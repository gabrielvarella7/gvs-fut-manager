# Assistente de regras (Gemini) — Mestre Mou

Chat in-game (botão **?** flutuante após o splash) para perguntas sobre regras e UI: energia, Prevenção Muscular, alertas médicos, base, etc.

A chave **nunca** vai no Vite/`VITE_*` nem no bundle do navegador. Só no servidor/proxy.

## 1. Obter a chave Gemini

1. Abra [Google AI Studio](https://aistudio.google.com/).
2. Entre com a conta Google.
3. Clique em **Get API key** / **Obter chave de API**.
4. Crie ou escolha um projeto e copie a chave.
5. **Não cole a chave no chat do jogo** nem em issues/PRs.

## 2. Onde colar a chave

### Desenvolvimento local (recomendado para testar)

No PowerShell, na pasta do projeto (a chave fica só na sessão do terminal):

```powershell
$env:GEMINI_API_KEY = "sua-chave-aqui"
npm run dev
```

Ou copie `env.example` para `.env` na raiz (`.env` já está no `.gitignore`):

```
GEMINI_API_KEY=sua-chave-aqui
```

Depois `npm run dev`. O Vite expõe `GET/POST /api/assistente` sem publicar a chave.

### Vercel (jogo + API no mesmo deploy)

O projeto já tem `vercel.json` e `api/assistente.js`.

1. [vercel.com](https://vercel.com) → projeto → **Settings** → **Environment Variables**.
2. Nome: `GEMINI_API_KEY` · Valor: a chave · Environments: Production (e Preview se quiser).
3. Redeploy.

O cliente chama `/api/assistente` no mesmo domínio.

### GitHub Pages (site estático)

Pages **não** guarda segredos. Opções:

**A) Cloudflare Worker (proxy fino)** — pasta `workers/assistente/`:

```bash
cd workers/assistente
npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy
```

No build do Pages (GitHub Actions), defina:

```yaml
VITE_ASSISTENTE_API_URL: https://mestre-mou-assistente.<sua-conta>.workers.dev
```

(ou o URL que o `wrangler deploy` mostrar.)

**B) Usar o deploy Vercel** como URL principal do jogo (já documentado em `DEPLOY-CELULAR.md`) e guardar `GEMINI_API_KEY` lá.

### Cursor Cloud Agents / publish-app

Se publicar um proxy com Cursor, declare o segredo `GEMINI_API_KEY` (não use prefixo `VITE_`). Cole o valor em **Dashboard → Secrets**, nunca no chat.

## 3. UX sem chave

O botão de ajuda continua visível. Ao abrir ou perguntar, aparece **Assistente indisponível** com orientação de configuração — o jogo não quebra.

## 4. O que o assistente responde

Só regras/mecânicas/UI do Mestre Mou, em português (BR). Recusa assuntos fora do jogo. A base está em `server/assistente/conhecimento.mjs` (energia, médico, Prevenção Muscular, base, performance, labels).

## 5. Onde está a UI

- Componente: `src/ui/components/AssistenteAjuda.tsx`
- Montado em `src/ui/screens/GameRouter.tsx` (após o splash de boas-vindas)
- Cliente API: `src/assistente/assistenteApi.ts`
