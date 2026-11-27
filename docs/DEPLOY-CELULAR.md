# Editar no PC → jogar no celular (atualização automática)

Fluxo: você altera o código no Cursor, envia para o GitHub, a **Vercel** publica sozinha em ~1–2 minutos. No celular, abre o mesmo link e dá **atualizar**.

## 1. Uma vez: instalar e preparar

1. **Git** — [git-scm.com/download/win](https://git-scm.com/download/win)
2. **Node.js LTS** — [nodejs.org](https://nodejs.org/)
3. Conta **GitHub** — [github.com](https://github.com)
4. Conta **Vercel** (login com GitHub) — [vercel.com](https://vercel.com)

No PowerShell, na pasta do projeto:

```powershell
cd C:\Users\gcarn\Projects\gvs-manager
git init -b main
git add -A
git commit -m "Mestre Mou — base para deploy"
```

Crie um repositório **privado** em GitHub chamado `gvs-manager` (sem README). Depois:

```powershell
git remote add origin https://github.com/SEU_USUARIO/gvs-manager.git
git push -u origin main
```

## 2. Uma vez: ligar a Vercel

1. Vercel → **Add New** → **Project**
2. Importe o repo `gvs-manager`
3. Deixe **Build**: `npm run build`, **Output**: `dist` (a Vercel detecta Vite)
4. **Deploy**

Guarde a URL, por exemplo: `https://gvs-manager.vercel.app`

No celular: abra essa URL → menu do navegador → **Adicionar à tela inicial** (atalho tipo app).

## 3. Todo dia: editar e atualizar na nuvem

Depois de mudanças no Cursor:

```powershell
cd C:\Users\gcarn\Projects\gvs-manager
git add -A
git commit -m "Descrição do que mudou"
git push
```

A Vercel inicia um deploy automático. Acompanhe em **vercel.com** → seu projeto → **Deployments**.

No celular: abra o link de novo ou puxe para baixo para atualizar (evite cache antigo na primeira vez após deploy).

## 4. Testar o build antes de enviar (opcional)

```powershell
npm install
npm run build
npm run preview
```

Abra `http://localhost:4173` no PC.

## Saves no celular vs PC

O jogo guarda a carreira no **navegador** (IndexedDB). PC e celular têm **saves separados**, a menos que no futuro exista export/import de partida.

## Atalho no Cursor

Peça no chat: *“Faz commit e push para atualizar o deploy”* (com Git instalado e remote configurado).