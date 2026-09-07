@echo off
title BC 64 - Plataforma

echo.
echo  ██████╗  ██████╗    ██████╗ ██╗  ██╗
echo  ██╔══██╗██╔════╝   ██╔════╝ ██║  ██║
echo  ██████╔╝██║        ███████╗ ███████║
echo  ██╔══██╗██║        ██╔════╝ ╚════██║
echo  ██████╔╝╚██████╗   ╚██████╗      ██║
echo  ╚═════╝  ╚═════╝    ╚═════╝      ╚═╝
echo.
echo  Plataforma BC 64 - Iniciando...
echo.

:: Verificar Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo Descargalo en: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js encontrado:
node --version

:: Instalar dependencias si no existen
if not exist "server\node_modules" (
    echo.
    echo [INFO] Instalando dependencias del servidor...
    cd server && npm install && cd ..
)

if not exist "client\node_modules" (
    echo.
    echo [INFO] Instalando dependencias del cliente...
    cd client && npm install && cd ..
)

:: Verificar .env
if not exist "server\.env" (
    echo.
    echo [AVISO] Falta server\.env - copiando desde ejemplo...
    copy "server\.env.example" "server\.env" >nul 2>&1
    echo [AVISO] Por favor edita server\.env con tus configuraciones reales.
)

echo.
echo [INFO] Iniciando servidores...
echo.
echo  - Backend:  http://localhost:5000
echo  - Frontend: http://localhost:5173
echo  - Admin:    http://localhost:5173/admin
echo.
echo  Credenciales admin: admin@bc64.com / Admin2024BC!
echo  (Ejecuta "npm run seed" primero para crear el admin)
echo.

:: Abrir dos terminales
start "BC64 Backend" cmd /k "cd /d %~dp0server && npm run dev"
timeout /t 3 >nul
start "BC64 Frontend" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo [OK] Servidores iniciados en ventanas separadas.
echo     Cierra las ventanas para detener los servidores.
echo.
pause
