@echo off
title DJ FTP Music Suite - Mise a jour complete
color 05
echo =================================================================
echo   MISE A JOUR DE LA BIBLIOTHEQUE DE MUSIQUE DJ FTP (DOUBLONS)
echo =================================================================
echo.
echo [Etape 1/3] Connexion au FTP et scan des fichiers reels...
echo -----------------------------------------------------------------
python "%~dp0ftp-music-scanner\scan_duplicates.py"
if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ [ERREUR] Le scan FTP a echoue. Veuillez verifier votre connexion ou vos identifiants.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo -----------------------------------------------------------------
echo [Etape 2/3] Analyse intelligente des doublons flous (IA)...
echo -----------------------------------------------------------------
python "%~dp0ftp-music-scanner\find_fuzzy_candidates.py"
if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ [ERREUR] L'analyse des doublons flous a echoue.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo -----------------------------------------------------------------
echo [Etape 3/3] Generation du rapport HTML interactif...
echo -----------------------------------------------------------------
python "%~dp0ftp-music-scanner\generate_fuzzy_html.py"
if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ [ERREUR] La generation du rapport HTML a echoue.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo =================================================================
echo  🎉 MISE A JOUR TERMINEE AVEC SUCCES !
echo =================================================================
echo.
echo Les rapports ont ete mis a jour avec vos suppressions :
echo 🌐 Rapport Exact : music_duplicates_report.html
echo 🔮 Rapport IA Flou : music_fuzzy_report.html
echo.
pause
