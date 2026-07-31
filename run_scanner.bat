@echo off
title DJ FTP Music Scanner
echo ====================================================
echo        DEMARRAGE DU SCANNER DE MUSIQUE DJ FTP
echo ====================================================
echo.
python "%~dp0ftp-music-scanner\scan_duplicates.py"
echo.
echo ====================================================
echo Scan termine.
echo ====================================================
pause
