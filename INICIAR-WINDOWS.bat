@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao foi encontrado. Instale Node.js 22 LTS e execute este arquivo de novo.
  pause
  exit /b 1
)
if not exist .env.local (
  copy .env.example .env.local >nul
  echo.
  echo Arquivo .env.local criado. EDITE-O com as chaves do seu projeto Supabase.
  notepad .env.local
  pause
)
if not exist node_modules (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo Erro instalando dependencias.
    pause
    exit /b 1
  )
)
echo Iniciando o SaaS em http://localhost:3000 ...
call npm run dev
pause
