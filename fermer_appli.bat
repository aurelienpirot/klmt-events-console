@echo off
title Console de Gestion KLMT Events - Arret Force
color 0c
echo =================================================================
echo   ARRET FORCE ET NETTOYAGE DE LA CONSOLE
echo =================================================================
echo.

echo [1/1] Arret en cours du Frontend (Node.js/Next.js)...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo =================================================================
echo   TOUT A ETE FERME ET NETTOYE !
echo =================================================================
timeout /t 2 >nul
exit
