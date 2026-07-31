import os
import sys
import json
import getpass
from ftplib import FTP
from collections import defaultdict

# Global configuration for ignored extensions (default, updated via config.env)
IGNORED_EXTS = {'.db', '.jpeg', '.jpg'}

def format_size(size_bytes):
    if size_bytes is None or size_bytes == 0:
        return "Inconnu"
    for unit in ['B', 'Ko', 'Mo', 'Go', 'To']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} Po"

def walk_ftp(ftp, files_list, dir_count_holder, current_path_segments):
    """
    Recursively walks through FTP directories using 100% relative/single-level CWDs.
    This guarantees compatibility with FTP servers that do not support multi-level CWD paths.
    """
    current_path_str = "/" + "/".join(current_path_segments)
    print(f"👉 Scannage du répertoire : {current_path_str} ...", flush=True)
    
    # 1. Try MLSD first (machine-readable directory listing, very standard & reliable)
    try:
        items = list(ftp.mlsd())
        for name, facts in items:
            if name in ('.', '..'):
                continue
            item_type = facts.get('type')
            if item_type == 'dir':
                dir_count_holder[0] += 1
                try:
                    ftp.cwd(name)
                    walk_ftp(ftp, files_list, dir_count_holder, current_path_segments + [name])
                    ftp.cwd('..')  # Go back up
                except Exception as e_cwd:
                    print(f"⚠️ Impossible d'entrer dans {name} : {e_cwd}")
            elif item_type == 'file':
                # Check extension filter
                ext = os.path.splitext(name)[1].lower()
                if ext in IGNORED_EXTS:
                    continue
                size = int(facts.get('size', 0))
                full_file_path = current_path_str.rstrip('/') + '/' + name
                files_list.append({
                    'path': full_file_path,
                    'name': name,
                    'size': size
                })
        return
    except Exception:
        # Fallback to standard methods if MLSD is not supported
        pass
    
    # 2. Fallback to standard NLST/LIST if MLSD is not supported
    try:
        names = ftp.nlst()
    except Exception as e:
        print(f"⚠️ Impossible de lister le répertoire {current_path_str}: {e}")
        return

    for name in names:
        # Normalize in case nlst returns full paths
        name = os.path.basename(name)
        if name in ('.', '..'):
            continue
        
        # Determine if it's a directory by trying to CWD into it
        is_directory = False
        try:
            ftp.cwd(name)
            is_directory = True
        except Exception:
            pass
        
        if is_directory:
            dir_count_holder[0] += 1
            walk_ftp(ftp, files_list, dir_count_holder, current_path_segments + [name])
            try:
                ftp.cwd('..')  # Go back up
            except Exception as e_up:
                print(f"❌ Erreur critique lors du retour au dossier parent : {e_up}")
                # Try absolute reset to avoid getting lost
                ftp.cwd('/')
                for seg in current_path_segments:
                    ftp.cwd(seg)
        else:
            # It's a file, try to get its size
            ext = os.path.splitext(name)[1].lower()
            if ext in IGNORED_EXTS:
                continue
            size = 0
            try:
                size = ftp.size(name)
            except Exception:
                pass
            full_file_path = current_path_str.rstrip('/') + '/' + name
            files_list.append({
                'path': full_file_path,
                'name': name,
                'size': size
            })

def load_config_env():
    """
    Loads configuration from config.env if it exists in the current directory
    or the directory where the script is located.
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
                    print(f"📖 Configuration chargée depuis : {os.path.abspath(env_path)}")
                    break
            except Exception as e:
                print(f"⚠️ Erreur lors de la lecture de {env_path} : {e}")
    return env_vars

def run_scanner():
    print("==================================================")
    print("      DJ FTP MUSIC DUPLICATE SCANNER & ANALYZER   ")
    print("==================================================")

    # 1. Configuration parameters loaded from config.env or user input
    env = load_config_env()
    
    global IGNORED_EXTS
    env_ignored = env.get("IGNORED_EXTENSIONS")
    if env_ignored:
        parsed_exts = set()
        for ext in env_ignored.split(','):
            ext = ext.strip().lower()
            if ext:
                if not ext.startswith('.'):
                    ext = '.' + ext
                parsed_exts.add(ext)
        if parsed_exts:
            IGNORED_EXTS = parsed_exts
    print(f"🚫 Extensions ignorées : {', '.join(sorted(IGNORED_EXTS))}")
    
    env_host = env.get("FTP_HOST")
    if env_host:
        print(f"Hôte FTP (config) : {env_host}")
        host = env_host
    else:
        host = input("Hôte FTP [192.168.0.12] : ").strip() or "192.168.0.12"
        
    env_dir = env.get("FTP_DIR")
    if env_dir:
        print(f"Répertoire FTP (config) : {env_dir}")
        start_dir = env_dir
    else:
        start_dir = input("Répertoire FTP [Clement\\musique] : ").strip() or "Clement\\musique"
    
    # Normalize backslashes to forward slashes for FTP commands compatibility
    start_dir = start_dir.replace('\\', '/')

    env_user = env.get("FTP_USER")
    if env_user:
        print(f"Nom d'utilisateur (config) : {env_user}")
        username = env_user
    else:
        username = input("Nom d'utilisateur [Clement] : ").strip() or "Clement"

    env_pass = env.get("FTP_PASS")
    if env_pass:
        print("Mot de passe (config) : (chargé depuis le fichier de configuration)")
        password = env_pass
    else:
        password = getpass.getpass("Mot de passe : ")

    # 2. Connection to FTP
    ftp = FTP()
    ftp.encoding = 'latin-1'  # Force latin-1 encoding to prevent UnicodeDecodeError on files with French accents (e.g. é, è, à)
    print(f"\n🔌 Connexion à {host}...")
    try:
        ftp.connect(host, port=21, timeout=15)
        print(f"🔑 Connexion en cours pour l'utilisateur '{username}'...")
        ftp.login(username, password)
        print("✅ Connexion réussie au serveur FTP !")
    except Exception as e:
        print(f"❌ Erreur de connexion ou d'authentification : {e}")
        sys.exit(1)

    # 3. Scanning remote filesystem
    files_list = []
    dir_count_holder = [0]
    print(f"\n🔍 Début du scan récursif depuis : {start_dir}")
    try:
        # Clean and split start_dir into segments
        path_segments = [seg for seg in start_dir.split('/') if seg]
        
        # Navigate segment-by-segment
        ftp.cwd('/')
        for seg in path_segments:
            try:
                ftp.cwd(seg)
            except Exception as e:
                print(f"\n❌ Impossible d'accéder au dossier '{seg}' de '{start_dir}' : {e}")
                print(f"📍 Répertoire actuel sur le serveur : {ftp.pwd()}")
                print("📋 Voici la liste des dossiers/fichiers disponibles à ce niveau :")
                try:
                    root_items = ftp.nlst()
                    if not root_items:
                        print("  (Répertoire vide ou aucun élément visible)")
                    else:
                        for item in root_items:
                            print(f"  - {item}")
                except Exception as e_lst:
                    print(f"  (Impossible de lister les fichiers à ce niveau : {e_lst})")
                print("\n💡 Astuce : Vérifiez l'orthographe exacte et la casse des dossiers dans votre fichier 'config.env'.")
                sys.exit(1)
        
        # Start relative walk
        walk_ftp(ftp, files_list, dir_count_holder, path_segments)
    except Exception as e:
        print(f"❌ Une erreur critique est survenue lors du scan : {e}")
    finally:
        try:
            ftp.quit()
            print("🔌 Déconnexion du serveur FTP effectuée avec succès.")
        except Exception:
            pass

    total_files = len(files_list)
    total_dirs = dir_count_holder[0]
    print(f"\n📊 Fin du scan. {total_files} fichiers trouvés dans {total_dirs} répertoires.")

    if total_files == 0:
        print("ℹ️ Aucun fichier trouvé. Fin de l'analyse.")
        sys.exit(0)

    # 4. Cache raw file list
    cache_file = "music_files.json"
    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump(files_list, f, ensure_ascii=False, indent=4)
    print(f"💾 Liste brute des fichiers sauvegardée localement dans : '{cache_file}'")

    # 5. Duplicate Analysis (Same Filename - Case Insensitive)
    print("\n⚙️ Analyse des doublons par nom de fichier (insensible à la casse)...")
    
    # Group files by lowercase name
    by_filename = defaultdict(list)
    for file_info in files_list:
        by_filename[file_info['name'].lower()].append(file_info)

    # Filter only duplicates (groups with > 1 file)
    duplicate_groups = {}
    for name_lower, group in by_filename.items():
        if len(group) > 1:
            duplicate_groups[group[0]['name']] = group

    # Calculate statistics
    total_duplicate_files = sum(len(group) for group in duplicate_groups.values())
    unique_duplicate_names = len(duplicate_groups)
    
    # Calculate potential recoverable space
    # For each group, keep one file (the largest or first one) and assume others are removable
    recoverable_space = 0
    for group in duplicate_groups.values():
        # Sort by size descending, keep the first one as master, sum the rest
        sorted_group = sorted(group, key=lambda x: x['size'], reverse=True)
        # Add the size of all duplicate copies except the largest one
        for extra_copy in sorted_group[1:]:
            recoverable_space += extra_copy['size']

    print(f"🎯 {unique_duplicate_names} groupes de doublons trouvés (total de {total_duplicate_files} fichiers doublons).")
    print(f"💾 Espace disque récupérable potentiel : {format_size(recoverable_space)}")

    # 6. Generate Text Report
    txt_report_path = "music_duplicates_report.txt"
    try:
        with open(txt_report_path, "w", encoding="utf-8") as f:
            f.write("=================================================================\n")
            f.write("          RAPPORT DES DOUBLONS DE MUSIQUE DJ (FTP SCAN)         \n")
            f.write("=================================================================\n\n")
            f.write(f"Hôte FTP : {host}\n")
            f.write(f"Répertoire analysé : {start_dir}\n")
            f.write(f"Total fichiers scannés : {total_files}\n")
            f.write(f"Total répertoires scannés : {total_dirs}\n")
            f.write(f"Groupes de doublons identifiés : {unique_duplicate_names}\n")
            f.write(f"Nombre de fichiers doublons : {total_duplicate_files}\n")
            f.write(f"Espace récupérable potentiel : {format_size(recoverable_space)}\n\n")
            f.write("-----------------------------------------------------------------\n")
            f.write("LISTE DES DOUBLONS :\n")
            f.write("-----------------------------------------------------------------\n\n")

            for idx, (filename, group) in enumerate(sorted(duplicate_groups.items()), 1):
                f.write(f"{idx}. FICHIER : {filename}\n")
                f.write(f"   Nombre d'occurrences : {len(group)}\n")
                # Check if sizes match
                sizes = [item['size'] for item in group]
                sizes_identical = len(set(sizes)) == 1
                f.write(f"   Statut des tailles : {'Toutes identiques ✅' if sizes_identical else '⚠️ Tailles différentes (différents encodages/fichiers?)'}\n")
                
                for item in group:
                    f.write(f"   - Chemin : {item['path']}\n")
                    f.write(f"     Taille : {format_size(item['size'])}\n")
                f.write("\n")
        print(f"📝 Rapport texte généré avec succès : '{txt_report_path}'")
    except Exception as e:
        print(f"⚠️ Erreur lors de la génération du rapport texte : {e}")

    # 7. Generate beautiful, interactive HTML Report (with DJ/Night theme)
    html_report_path = "music_duplicates_report.html"
    try:
        # Build HTML content
        html_groups = ""
        for idx, (filename, group) in enumerate(sorted(duplicate_groups.items()), 1):
            # Check if sizes match
            sizes = [item['size'] for item in group]
            sizes_identical = len(set(sizes)) == 1
            size_badge_class = "badge-success" if sizes_identical else "badge-warning"
            size_badge_text = "Tailles Identiques" if sizes_identical else "Tailles Différentes"

            group_items_html = ""
            for item in group:
                ext = os.path.splitext(item['name'])[1].upper() or "INCONNU"
                group_items_html += f"""
                <div class="file-item">
                    <span class="file-path">{item['path']}</span>
                    <div class="file-meta">
                        <span class="file-ext-badge">{ext}</span>
                        <span class="file-size">{format_size(item['size'])}</span>
                    </div>
                </div>
                """

            html_groups += f"""
            <div class="duplicate-card" data-filename="{filename.lower()}">
                <div class="card-header">
                    <span class="card-title">🎵 {filename}</span>
                    <div class="card-badges">
                        <span class="badge {size_badge_class}">{size_badge_text}</span>
                        <span class="badge badge-info">{len(group)} occurrences</span>
                    </div>
                </div>
                <div class="card-body">
                    {group_items_html}
                </div>
            </div>
            """

        html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DJ Music Duplicate Finder - Rapport</title>
    <style>
        :root {{
            --bg-color: #0d1117;
            --card-bg: #161b22;
            --border-color: #30363d;
            --text-color: #c9d1d9;
            --text-muted: #8b949e;
            --accent-color: #ab47bc;
            --accent-hover: #ba68c8;
            --success-color: #2ea44f;
            --warning-color: #dbab09;
            --info-color: #388bfd;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 20px;
        }}

        .container {{
            max-width: 1100px;
            margin: 0 auto;
        }}

        header {{
            text-align: center;
            padding: 20px 0 30px;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 30px;
        }}

        h1 {{
            color: #ffffff;
            margin: 0 0 10px 0;
            font-size: 2.5rem;
            letter-spacing: 1px;
            text-shadow: 0 0 10px rgba(171, 71, 188, 0.4);
        }}

        .subtitle {{
            color: var(--text-muted);
            font-size: 1.1rem;
            margin: 0;
        }}

        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }}

        .stat-card {{
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }}

        .stat-value {{
            font-size: 1.8rem;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 5px;
        }}

        .stat-label {{
            font-size: 0.9rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}

        .stat-card.recoverable {{
            border-color: var(--accent-color);
            box-shadow: 0 0 15px rgba(171, 71, 188, 0.15);
        }}
        .stat-card.recoverable .stat-value {{
            color: #e1bee7;
        }}

        .search-container {{
            margin-bottom: 30px;
            position: relative;
        }}

        #search-input {{
            width: 100%;
            padding: 15px 20px;
            font-size: 1.1rem;
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 30px;
            color: #ffffff;
            box-sizing: border-box;
            outline: none;
            transition: border-color 0.3s, box-shadow 0.3s;
        }}

        #search-input:focus {{
            border-color: var(--accent-color);
            box-shadow: 0 0 8px rgba(171, 71, 188, 0.4);
        }}

        .list-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding: 0 10px;
        }}

        .list-header h2 {{
            margin: 0;
            font-size: 1.3rem;
            color: #ffffff;
        }}

        .results-count {{
            color: var(--text-muted);
            font-size: 0.95rem;
        }}

        .duplicate-card {{
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            margin-bottom: 20px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            transition: transform 0.2s, border-color 0.2s;
        }}

        .duplicate-card:hover {{
            transform: translateY(-2px);
            border-color: #484f58;
        }}

        .card-header {{
            background-color: rgba(22, 27, 34, 0.8);
            border-bottom: 1px solid var(--border-color);
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        }}

        .card-title {{
            font-weight: 600;
            font-size: 1.15rem;
            color: #ffffff;
            word-break: break-all;
        }}

        .card-badges {{
            display: flex;
            gap: 10px;
        }}

        .badge {{
            font-size: 0.75rem;
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}

        .badge-success {{
            background-color: rgba(46, 164, 79, 0.15);
            color: #56d364;
            border: 1px solid rgba(46, 164, 79, 0.4);
        }}

        .badge-warning {{
            background-color: rgba(219, 171, 9, 0.15);
            color: #f1e05a;
            border: 1px solid rgba(219, 171, 9, 0.4);
        }}

        .badge-info {{
            background-color: rgba(56, 139, 253, 0.15);
            color: #79c0ff;
            border: 1px solid rgba(56, 139, 253, 0.4);
        }}

        .card-body {{
            padding: 0;
        }}

        .file-item {{
            padding: 12px 20px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background-color 0.1s;
        }}

        .file-item:last-child {{
            border-bottom: none;
        }}

        .file-item:hover {{
            background-color: rgba(255, 255, 255, 0.02);
        }}

        .file-path {{
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 0.9rem;
            word-break: break-all;
            margin-right: 15px;
        }}

        .file-meta {{
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
        }}

        .file-ext-badge {{
            font-size: 0.75rem;
            background-color: #21262d;
            color: var(--text-muted);
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid var(--border-color);
        }}

        .file-size {{
            font-size: 0.9rem;
            color: var(--text-muted);
            min-width: 80px;
            text-align: right;
        }}

        footer {{
            text-align: center;
            padding: 40px 0 20px;
            color: var(--text-muted);
            font-size: 0.85rem;
            border-top: 1px solid var(--border-color);
            margin-top: 50px;
        }}

        @media (max-width: 600px) {{
            .card-header {{
                flex-direction: column;
                align-items: flex-start;
            }}
            .file-item {{
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }}
            .file-meta {{
                align-self: flex-end;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🎧 DJ Music Duplicate Finder</h1>
            <p class="subtitle">Analyse du serveur FTP <strong>{host}</strong> &bull; Dossier : <code>{start_dir}</code></p>
        </header>

        <section class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">{total_files}</div>
                <div class="stat-label">Fichiers scannés</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{total_files - total_duplicate_files + unique_duplicate_names}</div>
                <div class="stat-label">Titres uniques</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{unique_duplicate_names}</div>
                <div class="stat-label">Groupes de doublons</div>
            </div>
            <div class="stat-card recoverable">
                <div class="stat-value">{format_size(recoverable_space)}</div>
                <div class="stat-label">Espace récupérable</div>
            </div>
        </section>

        <section class="search-container">
            <input type="text" id="search-input" placeholder="🔍 Rechercher un fichier doublon ou un dossier..." onkeyup="filterDuplicates()">
        </section>

        <section class="duplicates-section">
            <div class="list-header">
                <h2>📋 Liste des Doublons Trouvés</h2>
                <span class="results-count" id="results-count">Affichage de {unique_duplicate_names} groupes</span>
            </div>

            <div id="duplicates-list">
                {html_groups}
            </div>
        </section>

        <footer>
            Généré automatiquement par le script DJ FTP Scanner le {os.popen('date /t').read().strip() if os.name == 'nt' else os.popen('date').read().strip()}
        </footer>
    </div>

    <script>
        function filterDuplicates() {{
            const input = document.getElementById('search-input');
            const filter = input.value.toLowerCase();
            const cards = document.querySelectorAll('.duplicate-card');
            let visibleCount = 0;

            cards.forEach(card => {{
                const filename = card.getAttribute('data-filename');
                const filePaths = Array.from(card.querySelectorAll('.file-path')).map(el => el.textContent.toLowerCase());
                
                // Check if filename matches or any of the paths match
                const matchesFilename = filename.includes(filter);
                const matchesPath = filePaths.some(path => path.includes(filter));

                if (matchesFilename || matchesPath) {{
                    card.style.display = "";
                    visibleCount++;
                }} else {{
                    card.style.display = "none";
                }}
            }});

            const countEl = document.getElementById('results-count');
            countEl.textContent = "Affichage de " + visibleCount + " groupe(s) sur " + cards.length;
        }}
    </script>
</body>
</html>
"""
        with open(html_report_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"🌐 Rapport HTML interactif et visuel généré avec succès : '{html_report_path}'")
        print("\n💡 Vous pouvez ouvrir ce fichier HTML dans votre navigateur pour parcourir et filtrer confortablement vos doublons !")
    except Exception as e:
        print(f"⚠️ Erreur lors de la génération du rapport HTML : {e}")

if __name__ == "__main__":
    try:
        run_scanner()
    except KeyboardInterrupt:
        print("\n👋 Programme interrompu par l'utilisateur. À bientôt !")
        sys.exit(0)
