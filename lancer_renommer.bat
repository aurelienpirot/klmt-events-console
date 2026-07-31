@echo off
title DJ FTP Music Renamer & Standardizer
color 0b
echo ====================================================
echo      DEMARRAGE DE L'OUTIL DE RENOMMAGE DJ FTP
echo ====================================================
echo.
python "%~dp0ftp-music-scanner\rename_music.py"
echo.
echo ====================================================
echo Processus termine.
echo ====================================================
pause
