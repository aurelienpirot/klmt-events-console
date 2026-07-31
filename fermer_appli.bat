@echo off
title DJ FTP Music Suite - Arret Force
color 0c
echo =================================================================
echo   ARRET FORCE ET NETTOYAGE DE LA SUITE WEB DJ
echo =================================================================
echo.

echo [1/2] Arret en cours du Frontend (Node.js/Next.js)...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Frontend DJ Scanner Web (3000)" >nul 2>&1

echo [2/2] Arret en cours du Backend (Java/Spring Boot)...
taskkill /F /IM java.exe >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Backend DJ Scanner API (8081)" >nul 2>&1

echo.
echo =================================================================
echo   TOUTES LES FENETRES CMD ET PROCESSUS ONT ETE FERMES !
echo =================================================================
timeout /t 2 >nul
exit
