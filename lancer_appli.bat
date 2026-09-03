@echo off
title Console de Gestion KLMT Events - Demarrage
color 05
echo =================================================================
echo   DEMARRAGE DE LA CONSOLE DE GESTION KLMT EVENTS (NEXT.JS)
echo =================================================================
echo.

:: Verifier si node_modules existe deja pour eviter de lancer un npm install inutilement a chaque demarrage
if not exist "%~dp0klmt-events-console\node_modules\" (
    echo [1/2] Premiere initialisation : Installation des packages du Frontend Next.js...
    echo (Cette etape peut prendre 1 a 2 minutes, veuillez patienter...)
    cd /d "%~dp0klmt-events-console"
    call npm install --no-audit --no-fund
) else (
    echo [1/2] Packages du Frontend Next.js deja installes. Demarrage...
)

:: Copier le fichier .env de la racine vers le dossier de l'application Next.js si necessaire
if exist "%~dp0.env" (
    echo [*] Copie du fichier d'environnement .env dans le dossier klmt-events-console...
    copy /Y "%~dp0.env" "%~dp0klmt-events-console\.env" >nul
) else (
    echo [!] ATTENTION : Aucun fichier .env trouve a la racine de l'application.
)

echo [2/2] Demarrage du Frontend Next.js (klmt-events-console sur le port 3000)...
start "Console de Gestion KLMT Events (3000)" cmd /c "cd /d %~dp0klmt-events-console && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo =================================================================
echo   TOUT EST PRET !
echo   Ouverture automatique de votre navigateur sur : http://localhost:3000
echo =================================================================
echo.
start http://localhost:3000

echo Appuyez sur n'importe quelle touche dans cette fenetre pour ARRETER proprement
echo l'application et FERMER automatiquement toutes les autres fenetres CMD...
echo -----------------------------------------------------------------
pause >nul

echo.
echo [1/1] Arret en cours du Frontend (Node.js/Next.js)...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Console de Gestion KLMT Events (3000)" >nul 2>&1

echo.
echo =================================================================
echo   APPLICATION ARRETEE ET FERMEE AVEC SUCCES !
echo =================================================================
timeout /t 2 >nul
exit
