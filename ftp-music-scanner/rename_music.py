import os
import re
import sys
import json
import getpass
from ftplib import FTP

def load_config_env():
    """
    Loads configuration from config.env if it exists.
    """
    env_vars = {}
    paths_to_try = [
        "config.env",
        "ftp-music-scanner/config.env",
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.env")
    ]
    for env_path in paths_to_try:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith('#'):
                            continue
                        if '=' in line:
                            key, val = line.split('=', 1)
                            env_vars[key.strip()] = val.strip().strip('"').strip("'")
                if env_vars:
                    break
            except Exception as e:
                print(f"⚠️ Erreur lors de la lecture de {env_path} : {e}")
    return env_vars

def capitalize_words(text):
    if not text:
        return ""
    # Words we want to keep lowercase in titles unless they are at the start
    lowercase_words = {
        'and', 'or', 'but', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'by', 'with', 'from', 'as', 'into', 'vs'
    }
    special_words = {
        'feat.': 'feat.', 'feat': 'feat.', 'ft': 'feat.', 'ft.': 'feat.',
        'vip': 'VIP', 'dj': 'DJ', 'ep': 'EP', 'lp': 'LP', 'va': 'VA',
        'mp3': 'MP3', 'flac': 'FLAC', 'wav': 'WAV', 'cd': 'CD'
    }
    
    # Split by spaces but preserve them
    words = text.split()
    capitalized = []
    for i, w in enumerate(words):
        w_lower = w.lower()
        if w_lower in special_words:
            capitalized.append(special_words[w_lower])
        elif w_lower in lowercase_words and i > 0:
            capitalized.append(w_lower)
        else:
            # Capitalize first letter, handle cases like "l'amour" -> "L'Amour" or "d'agostino" -> "D'Agostino"
            if len(w) > 2 and w[1] == "'" and w[0].isalpha() and w[2].isalpha():
                capitalized.append(w[0].upper() + "'" + w[2].upper() + w[3:])
            else:
                capitalized.append(w.capitalize())
                
    return " ".join(capitalized)

def parse_filename_components(name):
    """
    Intelligently parses filename into track_num, artist, and title.
    """
    ext = os.path.splitext(name)[1]
    base = os.path.splitext(name)[0]
    
    # Clean underscores to spaces
    base_clean = base.replace('_', ' ')
    
    # 1. Try to extract leading track number if present
    # e.g., "01 Guitarra Sospesa" or "01. Guitarra Sospesa" or "01 - Guitarra Sospesa"
    track_num = ""
    match = re.match(r'^(\d+)[\s\-_.]*', base_clean)
    if match:
        track_num = match.group(1)
    
    # Split by ' - ' or '-'
    parts = []
    if ' - ' in base_clean:
        parts = [p.strip() for p in base_clean.split(' - ') if p.strip()]
    elif '-' in base_clean:
        parts = [p.strip() for p in base_clean.split('-') if p.strip()]
        
    artist = ""
    title = ""
    
    if len(parts) >= 3:
        # Check if first part is a track number
        first = parts[0]
        if first.isdigit() or len(first) <= 3:
            track_num = first
            # Check format: TrackNum - Artist - Title or TrackNum - Title - Artist
            p1 = parts[1].lower()
            if 'feat' in p1 or ' ft ' in p1 or ' vs ' in p1 or 'pres' in p1:
                # TrackNum - Artist - Title
                artist = parts[1]
                title = " - ".join(parts[2:])
            else:
                # TrackNum - Title - Artist
                artist = parts[-1]
                title = " - ".join(parts[1:-1])
        else:
            # Artist - Album - Track - Title or similar
            artist = parts[0]
            title = " - ".join(parts[1:])
            
    elif len(parts) == 2:
        first = parts[0]
        if first.isdigit() or len(first) <= 3:
            # TrackNum - Title
            track_num = first
            title = parts[1]
        else:
            # Artist - Title
            artist = parts[0]
            title = parts[1]
    else:
        # Single part (no separators like - or _-_)
        # But if we extracted a track number at the beginning (e.g. "01 Guitarra Sospesa")
        # we can strip the track number from the start to get the title!
        if track_num and match:
            title = base_clean[match.end():].strip()
        else:
            title = base_clean
        
    # Strip any leading track numbers/symbols from artist and title to prevent duplicates
    artist = re.sub(r'^\d+[\s\-_.]*', '', artist.strip())
    title = re.sub(r'^\d+[\s\-_.]*', '', title.strip())
        
    # Standardize capitalization
    artist = capitalize_words(artist)
    title = capitalize_words(title)
    track_num = track_num.strip()
    
    return track_num, artist, title, ext

def build_new_filename(track_num, artist, title, ext, include_track):
    """
    Reassembles components into a standard name.
    """
    # Clean up title brackets/parenthesis spacing
    title = title.replace(' (', ' (').replace(' [', ' [')
    
    if artist:
        if include_track and track_num:
            # Format track number to be 2 digits if single digit
            formatted_track = track_num.zfill(2)
            return f"{formatted_track} - {artist} - {title}{ext}"
        else:
            return f"{artist} - {title}{ext}"
    else:
        # Fallback if no artist was extracted
        if include_track and track_num:
            formatted_track = track_num.zfill(2)
            return f"{formatted_track} - {title}{ext}"
        else:
            return f"{title}{ext}"

def collect_rename_candidates(ftp, current_path_segments, candidates, include_track, ignored_exts):
    """
    Recursively walks FTP using single-level CWDs to collect files that need renaming.
    """
    current_path_str = "/" + "/".join(current_path_segments)
    
    try:
        # Try MLSD first
        try:
            items = list(ftp.mlsd())
            for name, facts in items:
                if name in ('.', '..'):
                    continue
                item_type = facts.get('type')
                if item_type == 'dir':
                    try:
                        ftp.cwd(name)
                        collect_rename_candidates(ftp, current_path_segments + [name], candidates, include_track, ignored_exts)
                        ftp.cwd('..')
                    except Exception as e_cwd:
                        print(f"⚠️ Impossible d'entrer dans {name} : {e_cwd}")
                elif item_type == 'file':
                    ext = os.path.splitext(name)[1].lower()
                    if ext in ignored_exts:
                        continue
                    
                    track_num, artist, title, extension = parse_filename_components(name)
                    new_name = build_new_filename(track_num, artist, title, extension, include_track)
                    
                    # Only collect if name is actually changing (case-sensitive or character changes)
                    if name != new_name:
                        candidates.append({
                            'dir_segments': current_path_segments,
                            'dir_path': current_path_str,
                            'old_name': name,
                            'new_name': new_name
                        })
            return
        except Exception:
            pass

        # Fallback to NLST/CWD
        try:
            names = ftp.nlst()
        except Exception as e:
            print(f"⚠️ Impossible de lister le répertoire {current_path_str}: {e}")
            return

        for name in names:
            name = os.path.basename(name)
            if name in ('.', '..'):
                continue
            
            is_directory = False
            try:
                ftp.cwd(name)
                is_directory = True
            except Exception:
                pass
            
            if is_directory:
                collect_rename_candidates(ftp, current_path_segments + [name], candidates, include_track, ignored_exts)
                ftp.cwd('..')
            else:
                ext = os.path.splitext(name)[1].lower()
                if ext in ignored_exts:
                    continue
                
                track_num, artist, title, extension = parse_filename_components(name)
                new_name = build_new_filename(track_num, artist, title, extension, include_track)
                
                if name != new_name:
                    candidates.append({
                        'dir_segments': current_path_segments,
                        'dir_path': current_path_str,
                        'old_name': name,
                        'new_name': new_name
                    })
    except Exception as e:
        print(f"⚠️ Erreur lors de la marche sur {current_path_str} : {e}")

def execute_live_rename(ftp, candidates):
    """
    Executes the renaming on the live FTP server.
    """
    total = len(candidates)
    success_count = 0
    print(f"\n🚀 Début du renommage en direct de {total} fichiers...")
    
    # Sort candidates by directory level depth so we handle files properly
    for idx, cand in enumerate(candidates, 1):
        print(f"[{idx}/{total}] Renommage dans {cand['dir_path']} :")
        print(f"   ❌ {cand['old_name']}")
        print(f"   ➔  ✅ {cand['new_name']}")
        
        try:
            # Navigate to the file's directory segment-by-segment
            ftp.cwd('/')
            for seg in cand['dir_segments']:
                ftp.cwd(seg)
                
            # Perform single-level rename
            ftp.rename(cand['old_name'], cand['new_name'])
            success_count += 1
        except Exception as e:
            print(f"   ⚠️ [ERREUR] Impossible de renommer : {e}")
            
    print(f"\n🎉 Renommage en direct terminé ! {success_count}/{total} fichiers renommés avec succès.")

def run():
    print("==========================================================")
    print("      DJ FTP MUSIC FILE RENAMER & STANDARDIZER            ")
    print("==========================================================")
    
    # 1. Load config
    env = load_config_env()
    
    host = env.get("FTP_HOST") or "192.168.0.12"
    start_dir = (env.get("FTP_DIR") or "Clement/musique").replace('\\', '/')
    username = env.get("FTP_USER") or "ze_user"
    password = env.get("FTP_PASS")
    
    env_ignored = env.get("IGNORED_EXTENSIONS")
    ignored_exts = {'.db', '.jpeg', '.jpg'}
    if env_ignored:
        parsed_exts = set()
        for ext in env_ignored.split(','):
            ext = ext.strip().lower()
            if ext:
                if not ext.startswith('.'):
                    ext = '.' + ext
                parsed_exts.add(ext)
        if parsed_exts:
            ignored_exts = parsed_exts

    print(f"📖 Config chargée pour l'hôte : {host}")
    print(f"📂 Répertoire cible : {start_dir}")
    print(f"🚫 Extensions exclues : {', '.join(sorted(ignored_exts))}")

    # 2. Ask user for formatting preferences
    print("\n⚙️ PREFERENCES DE NOMMAGE :")
    print("1. Artiste - Titre.ext                   (Recommandé pour DJ : tri alphabétique par artiste)")
    print("2. Numéro - Artiste - Titre.ext          (Conserve l'ordre des pistes des albums)")
    pref = input("Choisissez votre format [1 ou 2, par défaut: 1] : ").strip() or "1"
    include_track = (pref == "2")

    # 3. Connection to FTP
    if not password:
        password = getpass.getpass("Mot de passe FTP : ")
        
    ftp = FTP()
    ftp.encoding = 'latin-1' # Force latin-1 for French accents safety
    print(f"\n🔌 Connexion à {host}...")
    try:
        ftp.connect(host, port=21, timeout=15)
        ftp.login(username, password)
        print("✅ Connexion réussie !")
    except Exception as e:
        print(f"❌ Impossible de se connecter ou s'authentifier : {e}")
        sys.exit(1)

    # 4. Scanning and collecting candidates
    candidates = []
    print(f"\n🔍 Recherche des fichiers à renommer depuis '{start_dir}'...")
    try:
        # Navigate to start folder segment-by-segment
        path_segments = [seg for seg in start_dir.split('/') if seg]
        ftp.cwd('/')
        for seg in path_segments:
            ftp.cwd(seg)
            
        collect_rename_candidates(ftp, path_segments, candidates, include_track, ignored_exts)
    except Exception as e:
        print(f"❌ Une erreur est survenue pendant l'analyse : {e}")
    finally:
        # Keep connection open for rename if approved, otherwise we'll close it later
        pass

    total_candidates = len(candidates)
    if total_candidates == 0:
        print("\n✨ Félicitations ! Tous vos fichiers sont déjà parfaitement nommés et standardisés.")
        ftp.quit()
        sys.exit(0)

    # 5. Show Preview Report
    print(f"\n📋 RAPPORT DE PREVISUALISATION : {total_candidates} fichiers à renommer")
    print("=================================================================")
    for idx, cand in enumerate(candidates[:30], 1):
        print(f"{idx:3d}. Dossier : {cand['dir_path']}")
        print(f"     ❌ Ancien : {cand['old_name']}")
        print(f"     ➔  ✅ Nouveau : {cand['new_name']}")
        print("-" * 65)
        
    if total_candidates > 30:
        print(f"  ... et {total_candidates - 30} autres fichiers à renommer.")

    print("\n=================================================================")
    print(" ⚠️  ATTENTION : Aucun fichier n'a encore été renommé en direct.")
    print("=================================================================")
    
    confirm = input(f"\nVoulez-vous lancer le renommage réel de ces {total_candidates} fichiers sur le serveur FTP ? (oui/non) : ").strip().lower()
    
    if confirm in ('oui', 'o', 'yes', 'y'):
        try:
            execute_live_rename(ftp, candidates)
        except Exception as e:
            print(f"❌ Erreur critique pendant le renommage : {e}")
    else:
        print("\n❌ Opération annulée. Aucun fichier n'a été renommé.")

    try:
        ftp.quit()
        print("🔌 Déconnexion du serveur FTP effectuée avec succès.")
    except Exception:
        pass

if __name__ == "__main__":
    try:
        run()
    except KeyboardInterrupt:
        print("\n👋 Programme interrompu. À bientôt !")
        sys.exit(0)
