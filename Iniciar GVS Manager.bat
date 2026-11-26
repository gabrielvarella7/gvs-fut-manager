@echo off
title GVS Manager - servidor local
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js nao encontrado. Instale em https://nodejs.org/ ^(versao LTS^) e tente de novo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Instalando dependencias pela primeira vez...
  call npm install
  if errorlevel 1 (
    echo Falha no npm install.
    pause
    exit /b 1
  )
)

rem Se ja houver servidor na porta 5173, so abre o navegador
powershell -NoProfile -Command ^
  "try { $r = Invoke-WebRequest -Uri 'http://localhost:5173/' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }"
if %errorlevel%==0 (
  echo O servidor ja esta rodando. Abrindo o jogo no navegador...
  start http://localhost:5173/
  echo.
  echo Se voce abriu o .bat duas vezes, esta janela pode fechar.
  echo Para encerrar o jogo, feche a OUTRA janela preta que ficou com "VITE ready".
  pause
  exit /b 0
)

rem Limpa trava do Vite se o processo antigo morreu ^(ex.: Cursor fechado^)
if exist "node_modules\.vite\lock\" (
  del /q "node_modules\.vite\lock\*.json" 2>nul
)

echo Abrindo o jogo no navegador em alguns segundos...
echo Para ENCERRAR o servidor, feche esta janela ou pressione Ctrl+C.
echo Nao clique duas vezes no .bat enquanto uma janela ja estiver aberta.
echo.

start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:5173/"

call npm run dev

pause