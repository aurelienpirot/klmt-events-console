#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
DJ Assistant - YouTube Audio Downloader & AI Analyzer
Permet de télécharger l'audio d'une vidéo YouTube (mix DJ) et de l'analyser
via l'API de Gemini (analyse audio native) ou OpenAI (Transcription Whisper + GPT-4o).
"""

import os
import sys
import argparse
import subprocess

# Forcer l'encodage UTF-8 de la console Windows pour eviter les UnicodeEncodeError
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Charger la configuration depuis le .env racine et le config.env local
config_files = [
    os.path.join(os.path.dirname(__file__), 'config.env'),         # C:\Scripts\DJ\ftp-music-scanner\config.env
    os.path.join(os.path.dirname(__file__), '..', '.env')          # C:\Scripts\DJ\.env
]

for c_file in config_files:
    if os.path.exists(c_file):
        with open(c_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    parts = line.split('=', 1)
                    if len(parts) == 2:
                        key = parts[0].strip()
                        val = parts[1].strip()
                        # Supprimer les guillemets autour des valeurs si présents
                        if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                            val = val[1:-1]
                        os.environ[key] = val

def check_and_install_dependencies():
    """Vérifie et installe les paquets requis si nécessaire."""
    required_packages = ['yt-dlp']
    for pkg in required_packages:
        try:
            __import__(pkg.replace('-', '_'))
        except ImportError:
            print(f"📦 Installation de la dépendance manquante : {pkg}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "--quiet"])

def download_youtube_audio(url, output_dir="downloads"):
    """Télécharge l'audio d'une vidéo YouTube au format MP3 haute qualité."""
    check_and_install_dependencies()
    import yt_dlp

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    output_template = os.path.join(output_dir, '%(title)s.%(ext)s')
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': output_template,
        'quiet': False,
        'no_warnings': True,
    }

    print(f"\n⚡ Connexion à YouTube et téléchargement de l'audio...")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)
        # yt-dlp remplace l'extension d'origine par .mp3 après le post-traitement
        mp3_filename = os.path.splitext(filename)[0] + '.mp3'
        print(f"🎉 Téléchargement terminé ! Fichier enregistré sous : {mp3_filename}")
        return mp3_filename

def analyze_with_gemini(audio_path, api_key):
    """
    Analyse l'audio nativement avec Gemini 1.5 Pro.
    Gemini 1.5 Pro peut écouter jusqu'à 2h d'audio directement et lister les morceaux !
    """
    try:
        import google.generativeai as genai
    except ImportError:
        print("📦 Installation du SDK Google Generative AI...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "google-generativeai", "--quiet"])
        import google.generativeai as genai

    print("\n🔮 Initialisation de l'analyse Audio Native avec Gemini Pro...")
    genai.configure(api_key=api_key)

    # Étape 1 : Uploader le fichier audio sur l'API Files de Google
    print("⏳ Upload du fichier audio vers Google API (cela peut prendre quelques minutes pour les gros mix)...")
    audio_file = genai.upload_file(path=audio_path)
    print(f"✓ Fichier uploadé avec succès. ID : {audio_file.name}")

    # Étape 2 : Lancer l'analyse
    print("🧠 Écoute et analyse de la musique par l'IA Gemini Pro (Recherche de morceaux, styles, BPM)...")
    model = genai.GenerativeModel("gemini-1.5-pro")
    
    prompt = """
    Tu es un assistant DJ expert de niveau international. Écoute attentivement ce fichier audio (qui est un mix DJ).
    Fais une analyse approfondie et génère un rapport complet comprenant :
    1. La tracklist chronologique ultra-précise avec les timestamps de début (ex: [12:34] - Artiste - Titre - Style/Genre).
    2. Les styles musicaux prédominants et l'ambiance globale du mix.
    3. Les transitions clés et des conseils d'amélioration pour le mixage de ce DJ débutant.
    Génère la réponse en français, bien présentée en Markdown avec des émojis.
    """
    
    response = model.generate_content([audio_file, prompt])
    
    # Étape 3 : Nettoyer le fichier distant après analyse
    print("🧹 Nettoyage du fichier temporaire sur l'API Google...")
    genai.delete_file(audio_file.name)
    
    return response.text

def analyze_with_openai(audio_path, api_key):
    """
    Analyse l'audio via OpenAI Whisper (transcription) et GPT-4o pour structurer la tracklist.
    Note : Whisper est limité à 25 Mo par fichier. Si le fichier est trop gros,
    il faudra utiliser Gemini ou découper le fichier au préalable.
    """
    try:
        import openai
    except ImportError:
        print("📦 Installation du SDK OpenAI...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "openai", "--quiet"])
        import openai

    client = openai.OpenAI(api_key=api_key)

    # Vérification de la taille du fichier (limite Whisper de 25 Mo)
    file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
    transcription = ""

    if file_size_mb > 25:
        print(f"\n⚠️ [ATTENTION] Le fichier audio fait {file_size_mb:.1f} Mo, ce qui dépasse la limite de 25 Mo de Whisper.")
        print("⚡ [INFO] Découpage automatique du fichier en morceaux de 24 Mo avec pydub...")
        
        try:
            # S'assurer que pydub est installé
            try:
                from pydub import AudioSegment
            except ImportError:
                print("📦 Installation de pydub...")
                subprocess.check_call([sys.executable, "-m", "pip", "install", "pydub", "--quiet"])
                from pydub import AudioSegment
            
            # Charger le fichier audio
            print("⏳ Chargement du fichier audio en mémoire (peut prendre un peu de temps)...")
            audio = AudioSegment.from_file(audio_path)
            duration_ms = len(audio)
            
            # Nombre de morceaux nécessaires (24 Mo par morceau pour garder une marge)
            chunk_size_mb = 24.0
            num_chunks = int(file_size_mb / chunk_size_mb) + 1
            chunk_len_ms = duration_ms // num_chunks
            
            print(f"🎬 Division de l'enregistrement en {num_chunks} morceaux de ~{(chunk_len_ms / 60000):.1f} minutes...")
            
            chunks_transcriptions = []
            for i in range(num_chunks):
                start = i * chunk_len_ms
                end = min((i + 1) * chunk_len_ms, duration_ms)
                
                print(f"✂️ Extraction et export du morceau {i+1}/{num_chunks} (de {start/1000:.0f}s à {end/1000:.0f}s)...")
                chunk = audio[start:end]
                
                chunk_path = f"{os.path.splitext(audio_path)[0]}_chunk_{i}.mp3"
                chunk.export(chunk_path, format="mp3")
                
                # Transcrire le morceau
                print(f"🎧 Envoi du morceau {i+1} à OpenAI Whisper...")
                try:
                    with open(chunk_path, "rb") as chunk_file:
                        chunk_trans = client.audio.transcriptions.create(
                            model="whisper-1",
                            file=chunk_file,
                            response_format="text"
                        )
                    chunks_transcriptions.append(chunk_trans)
                finally:
                    # Supprimer le morceau temporaire immédiatement
                    if os.path.exists(chunk_path):
                        try:
                            os.remove(chunk_path)
                        except Exception:
                            pass
            
            transcription = "\n\n--- [Transition de morceau de mix] ---\n\n".join(chunks_transcriptions)
            print("✓ Transcription de l'ensemble des morceaux réussie !")
            
        except Exception as e:
            print(f"\n❌ [ERREUR] Échec du découpage avec pydub (ffmpeg absent ?) : {e}")
            
            # S'il s'agit d'un fichier MP3, on utilise notre découpeur binaire autonome en pur Python (sans ffmpeg)
            if audio_path.lower().endswith('.mp3'):
                print("⚡ [INFO] Fichier MP3 détecté. Utilisation du découpeur binaire haute performance (sans ffmpeg)...")
                try:
                    chunk_size_bytes = int(24.0 * 1024 * 1024) # 24 Mo
                    with open(audio_path, 'rb') as f:
                        file_data = f.read()
                    
                    total_bytes = len(file_data)
                    num_chunks = (total_bytes + chunk_size_bytes - 1) // chunk_size_bytes
                    print(f"🎬 Division binaire du MP3 en {num_chunks} morceaux...")
                    
                    chunks_transcriptions = []
                    for i in range(num_chunks):
                        start = i * chunk_size_bytes
                        end = min((i + 1) * chunk_size_bytes, total_bytes)
                        chunk_data = file_data[start:end]
                        
                        chunk_path = f"{os.path.splitext(audio_path)[0]}_chunk_{i}.mp3"
                        print(f"✂️ Écriture du morceau binaire {i+1}/{num_chunks} ({len(chunk_data)/(1024*1024):.1f} Mo)...")
                        with open(chunk_path, 'wb') as chunk_file:
                            chunk_file.write(chunk_data)
                        
                        print(f"🎧 Envoi du morceau {i+1} à OpenAI Whisper...")
                        try:
                            with open(chunk_path, "rb") as chunk_file:
                                chunk_trans = client.audio.transcriptions.create(
                                    model="whisper-1",
                                    file=chunk_file,
                                    response_format="text"
                                )
                            chunks_transcriptions.append(chunk_trans)
                        finally:
                            if os.path.exists(chunk_path):
                                try:
                                    os.remove(chunk_path)
                                except Exception:
                                    pass
                    
                    transcription = "\n\n--- [Transition de morceau] ---\n\n".join(chunks_transcriptions)
                    print("✓ Transcription binaire réussie avec succès !")
                except Exception as bin_err:
                    print(f"❌ Échec de la méthode de secours binaire : {bin_err}")
                    raise e
            else:
                print("Note : Installez ffmpeg pour pouvoir découper les fichiers non-MP3.")
                raise e
    else:
        print("\n🎧 Envoi de l'audio à OpenAI Whisper pour transcription...")
        with open(audio_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text"
            )
    
    print("📝 Analyse des paroles et des titres par GPT-4o...")
    prompt = f"""
    En tant qu'assistant DJ expert, analyse cette transcription textuelle issue d'un enregistrement audio/mix :
    ---
    {transcription}
    ---
    Génère un rapport d'analyse en français comprenant :
    1. Une tracklist estimée (Artiste, Titre, Style) basée sur les paroles identifiées.
    2. Le genre musical prédominant et l'ambiance.
    3. Des conseils pour un DJ débutant pour structurer ce genre de set.
    Présente le rapport de manière professionnelle en Markdown.
    """

    completion = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "Tu es un expert en musique et DJing."},
            {"role": "user", "content": prompt}
        ]
    )

    return completion.choices[0].message.content

def main():
    parser = argparse.ArgumentParser(description="DJ Assistant - YouTube Audio Downloader & AI Analyzer")
    parser.add_argument("--url", help="URL de la vidéo YouTube à télécharger")
    parser.add_argument("--file", help="Chemin vers un fichier audio local à analyser directement")
    parser.add_argument("--provider", choices=["gemini", "openai"], default="gemini", 
                        help="Fournisseur d'IA pour l'analyse (gemini = Analyse audio native, openai = Whisper + GPT)")
    parser.add_argument("--api-key", help="Clé API (si non fournie, lue depuis config.env)")

    args = parser.parse_args()

    if not args.url and not args.file:
        print("\n❌ [ERREUR] Vous devez fournir soit '--url' (vidéo YouTube) soit '--file' (fichier local).")
        sys.exit(1)

    # Déterminer la clé d'API et gérer le basculement automatique (fallback)
    provider = args.provider
    api_key = args.api_key
    
    if not api_key:
        gemini_key = os.environ.get("GEMINI_API_KEY")
        openai_key = os.environ.get("OPENAI_API_KEY")
        
        if provider == "gemini":
            if gemini_key:
                api_key = gemini_key
            elif openai_key:
                print("\n[INFO] Clé Gemini non trouvée, mais clé OpenAI détectée. Basculement automatique sur OpenAI...")
                provider = "openai"
                api_key = openai_key
        else:
            if openai_key:
                api_key = openai_key
            elif gemini_key:
                print("\n[INFO] Clé OpenAI non trouvée, mais clé Gemini détectée. Basculement automatique sur Gemini...")
                provider = "gemini"
                api_key = gemini_key

    if not api_key:
        print(f"\n❌ [ERREUR] Aucune clé d'API trouvée pour le fournisseur '{provider}'.")
        print("Veuillez fournir la clé via le paramètre '--api-key YOUR_KEY'")
        print("ou la déclarer dans votre fichier '.env' sous le nom :")
        print("  - 'GEMINI_API_KEY=...' (si provider=gemini)")
        print("  - 'OPENAI_API_KEY=...' (si provider=openai)")
        sys.exit(1)

    # Assigner le fournisseur résolu à args.provider au cas où il a changé
    args.provider = provider

    # 1. Obtenir le fichier audio (téléchargement ou local)
    mp3_path = None
    if args.file:
        if not os.path.exists(args.file):
            print(f"\n❌ [ERREUR] Le fichier spécifié est introuvable : {args.file}")
            sys.exit(1)
        mp3_path = args.file
        print(f"\n📁 Utilisation du fichier audio local : {mp3_path}")
    else:
        try:
            mp3_path = download_youtube_audio(args.url)
        except Exception as e:
            print(f"\n❌ [ERREUR] Échec du téléchargement YouTube : {e}")
            sys.exit(1)

    # 2. Analyse par l'IA choisie
    try:
        if args.provider == "gemini":
            result = analyze_with_gemini(mp3_path, api_key)
        else:
            result = analyze_with_openai(mp3_path, api_key)
            
        print("\n==================================================================")
        print("🎉 RAPPORT D'ANALYSE DJ DE L'IA")
        print("==================================================================\n")
        print(result)
        
        # Enregistrer le rapport dans un fichier texte
        report_path = os.path.splitext(mp3_path)[0] + "_ai_report.md"
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(result)
        print("\n==================================================================")
        print(f"✓ Rapport complet enregistré sous : {report_path}")
        print("==================================================================")

    except Exception as e:
        print(f"\n❌ [ERREUR] Échec de l'analyse par l'IA : {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
