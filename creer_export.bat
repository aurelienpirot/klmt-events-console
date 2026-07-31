@echo off
title DJ Music Suite - Creation du Pack d'Export
color 0b
echo =================================================================
echo      CREATION DE L'ARCHIVE D'EXPORT DJ MUSIC SUITE
echo =================================================================
echo.

:: Recuperation de la date et l'heure courante au format AAAA-MM-JJ_HH-mm
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set YYYY=%datetime:~0,4%
set MM=%datetime:~4,2%
set DD=%datetime:~6,2%
set HH=%datetime:~8,2%
set Min=%datetime:~10,2%

set ZIP_NAME=DJ_Music_Suite_%YYYY%-%MM%-%DD%_%HH%-%Min%.zip
set OUTPUT_PATH=%~dp0%ZIP_NAME%

echo [+] Destination de l'archive : %OUTPUT_PATH%
echo [+] Preparation de l'archive en tache de fond (exclusion de target, node_modules, .next)...
echo.

:: Appel de PowerShell pour creer proprement le ZIP de maniere ultra-robuste et propre
powershell -NoProfile -Command ^
    "$source = '%~dp0';" ^
    "$destZip = '%OUTPUT_PATH%';" ^
    "$tempDir = Join-Path $env:TEMP 'dj_export_temp';" ^
    "if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force };" ^
    "New-Item -ItemType Directory -Path $tempDir -Force | Out-Null;" ^
    "Copy-Item (Join-Path $source 'ftp-music-scanner') -Destination (Join-Path $tempDir 'ftp-music-scanner') -Recurse -Force;" ^
    "Copy-Item (Join-Path $source 'lancer_appli.bat') -Destination $tempDir -Force;" ^
    "Copy-Item (Join-Path $source 'README.md') -Destination $tempDir -Force;" ^
    "if (Test-Path (Join-Path $source '.env')) { Copy-Item (Join-Path $source '.env') -Destination $tempDir -Force };" ^
    "New-Item -ItemType Directory -Path (Join-Path $tempDir 'dj-scanner-api') -Force | Out-Null;" ^
    "Get-ChildItem (Join-Path $source 'dj-scanner-api') -Exclude 'target' | ForEach-Object { Copy-Item $_.FullName -Destination (Join-Path $tempDir 'dj-scanner-api') -Recurse -Force };" ^
    "New-Item -ItemType Directory -Path (Join-Path $tempDir 'dj-scanner-web') -Force | Out-Null;" ^
    "Get-ChildItem (Join-Path $source 'dj-scanner-web') -Exclude 'node_modules', '.next' | ForEach-Object { Copy-Item $_.FullName -Destination (Join-Path $tempDir 'dj-scanner-web') -Recurse -Force };" ^
    "Compress-Archive -Path \"$tempDir\*\" -DestinationPath $destZip -Force;" ^
    "Remove-Item $tempDir -Recurse -Force"

echo =================================================================
echo   🎉 PACK D'EXPORT CREE AVEC SUCCES !
echo   Fichier disponible : %ZIP_NAME%
echo =================================================================
echo.
timeout /t 5
