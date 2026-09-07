@echo off
title BC 64 - Instalacion

echo ================================
echo  BC 64 - Instalacion inicial
echo ================================
echo.

:: Verificar Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo.
    echo Paso 1: Descarga Node.js LTS desde:
    echo         https://nodejs.org/en/download
    echo.
    echo Paso 2: Instala Node.js y vuelve a ejecutar este archivo.
    echo.
    start https://nodejs.org/en/download
    pause
    exit /b 1
)

echo [OK] Node.js:
node --version
echo.

:: Verificar MongoDB
echo [INFO] Asegurate de tener MongoDB instalado y corriendo.
echo       Descarga: https://www.mongodb.com/try/download/community
echo.

:: Instalar servidor
echo [1/3] Instalando dependencias del servidor...
cd server && npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Fallo la instalacion del servidor.
    pause
    exit /b 1
)
cd ..
echo [OK] Servidor instalado.
echo.

:: Instalar cliente
echo [2/3] Instalando dependencias del cliente...
cd client && npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Fallo la instalacion del cliente.
    pause
    exit /b 1
)
cd ..
echo [OK] Cliente instalado.
echo.

:: Configurar .env
if not exist "server\.env" (
    echo [3/3] Configurando .env...
    copy "server\.env.example" "server\.env" >nul
    echo [OK] Creado server\.env desde ejemplo.
    echo.
    echo [IMPORTANTE] Edita server\.env con:
    echo   - Tu URI de MongoDB
    echo   - Secretos JWT propios
    echo   - Configuracion de email (opcional)
) else (
    echo [3/3] server\.env ya existe - conservando.
)
echo.

:: Seed
echo ================================
echo  Crear admin y planes VIP?
echo ================================
set /p SEED="Ejecutar seeder? (s/n): "
if /i "%SEED%"=="s" (
    echo Ejecutando seeder...
    cd server && node utils/seeder.js
    cd ..
)

echo.
echo ================================
echo  Instalacion completada!
echo ================================
echo.
echo Para iniciar la aplicacion:
echo   Doble clic en INICIAR.bat
echo.
echo Acceso:
echo   Frontend: http://localhost:5173
echo   Admin:    http://localhost:5173/admin
echo   API:      http://localhost:5000/api/health
echo.
echo Credenciales admin:
echo   Email:    admin@bc64.com
echo   Password: Admin2024BC!
echo.
pause
