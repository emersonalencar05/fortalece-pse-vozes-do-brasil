@echo off
cd /d "%~dp0"
if not exist docs\index.html (echo Pasta docs nao encontrada.& pause& exit /b 1)
node --version >nul 2>&1 || (echo Instale Node.js para rodar a previa local.& pause& exit /b 1)
start "" "http://localhost:3000/?demo=1"
npm run dev
pause
