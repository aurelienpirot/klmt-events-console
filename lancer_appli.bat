@echo off
title DJ FTP Music Suite - Demarrage
color 05
echo =================================================================
echo   DEMARRAGE DE LA SUITE WEB DJ FTP MUSIC SCANNER (JAVA / NEXT.JS)
echo =================================================================
echo.

echo [1/3] Demarrage du Backend Spring Boot (dj-scanner-api sur le port 8081)...
start "Backend DJ Scanner API (8081)" cmd /c "cd /d %~dp0dj-scanner-api && .\mvnw.cmd spring-boot:run"
timeout /t 5 /nobreak >nul

:: Verifier si node_modules existe deja pour eviter de lancer un npm install inutilement a chaque demarrage
if not exist "%~dp0dj-scanner-web\node_modules\" (
    echo [2/3] Premiere initialisation : Installation des packages du Frontend Next.js...
    echo (Cette etape peut prendre 1 a 2 minutes, veuillez patienter...)
    cd /d "%~dp0dj-scanner-web"
    call npm install --no-audit --no-fund
) else (
    echo [2/3] Packages du Frontend Next.js deja installes. Demarrage...
)

echo [3/3] Demarrage du Frontend Next.js (dj-scanner-web sur le port 3000)...
start "Frontend DJ Scanner Web (3000)" cmd /c "cd /d %~dp0dj-scanner-web && npm run dev"
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
echo [1/2] Arret en cours du Frontend (Node.js/Next.js)...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Frontend DJ Scanner Web (3000)" >nul 2>&1

echo [2/2] Arret en cours du Backend (Java/Spring Boot)...
taskkill /F /IM java.exe >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Backend DJ Scanner API (8081)" >nul 2>&1

echo.
echo =================================================================
echo   APPLICATION ARRETEE ET FERMEE AVEC SUCCES !
echo =================================================================
timeout /t 2 >nul
exit
