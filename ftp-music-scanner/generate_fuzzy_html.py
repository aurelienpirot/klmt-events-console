import os
import json
import sys

def format_size(size_bytes):
    if size_bytes is None or size_bytes == 0:
        return "Inconnu"
    for unit in ['B', 'Ko', 'Mo', 'Go']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} To"

def generate_report():
    input_file = "fuzzy_candidates.json"
    output_file = "music_fuzzy_report.html"

    if not os.path.exists(input_file):
        print(f"❌ Fichier source '{input_file}' introuvable. Veuillez d'abord exécuter l'analyseur flou.")
        sys.exit(1)

    print("📖 Chargement des candidats flous...")
    with open(input_file, "r", encoding="utf-8") as f:
        pairs = json.load(f)

    print(f"⚙️ Génération du rapport HTML interactif pour {len(pairs)} paires...")

    # Build HTML cards
    cards_html = []
    for idx, pair in enumerate(pairs, 1):
        ratio_pct = int(pair['ratio'] * 100)
        
        # Color coding for similarity strength
        if ratio_pct >= 90:
            badge_class = "badge-danger"  # Very strong candidate (likely true duplicate)
        elif ratio_pct >= 80:
            badge_class = "badge-warning" # Strong candidate
        else:
            badge_class = "badge-info"    # Moderate candidate

        f1 = pair['file1']
        f2 = pair['file2']
        
        ext1 = os.path.splitext(f1['name'])[1].upper() or "INCONNU"
        ext2 = os.path.splitext(f2['name'])[1].upper() or "INCONNU"

        # Compare formats and highlight if different
        format_warning_html = ""
        if ext1 != ext2:
            format_warning_html = f'<span class="format-warning-badge">⚠️ Formats différents ({ext1} vs {ext2})</span>'

        # Compare sizes and highlight if different (greater than 5% difference)
        size_warning_html = ""
        size1 = f1.get('size', 0)
        size2 = f2.get('size', 0)
        if size1 and size2:
            pct_diff = abs(size1 - size2) / max(size1, size2)
            if pct_diff > 0.05:
                size_warning_html = f'<span class="size-warning-badge">⚠️ Tailles différentes ({format_size(size1)} vs {format_size(size2)})</span>'

        different_remix = pair.get('different_remix', False)
        different_remix_str = "true" if different_remix else "false"
        remix_badge_html = ""
        if different_remix:
            remix_badge_html = '<span class="badge badge-remix">🎧 Remixes différents</span>'

        # Build card string
        card_html = f"""
        <div class="pair-card" data-ratio="{ratio_pct}" data-different-remix="{different_remix_str}" data-filenames="{f1['name'].lower()} {f2['name'].lower()}" data-paths="{f1['path'].lower()} {f2['path'].lower()}">
            <div class="card-header">
                <span class="pair-id">Paire #{idx}</span>
                <div class="card-badges">
                    {format_warning_html}
                    {size_warning_html}
                    {remix_badge_html}
                    <span class="badge {badge_class}">{ratio_pct}% de similarité</span>
                </div>
            </div>
            <div class="card-body">
                <!-- File A -->
                <div class="file-info-row">
                    <div class="file-letter letter-a">A</div>
                    <div class="file-details">
                        <div class="file-name">🎵 {f1['name']}</div>
                        <div class="file-path">📂 {f1['path']}</div>
                        <div class="file-meta">
                            <span class="meta-tag ext-tag">{ext1}</span>
                            <span class="meta-tag size-tag">{format_size(f1['size'])}</span>
                        </div>
                    </div>
                </div>
                
                <div class="pair-divider">vs</div>

                <!-- File B -->
                <div class="file-info-row">
                    <div class="file-letter letter-b">B</div>
                    <div class="file-details">
                        <div class="file-name">🎵 {f2['name']}</div>
                        <div class="file-path">📂 {f2['path']}</div>
                        <div class="file-meta">
                            <span class="meta-tag ext-tag">{ext2}</span>
                            <span class="meta-tag size-tag">{format_size(f2['size'])}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        """
        cards_html.append(card_html)

    all_cards_str = "\n".join(cards_html)

    # Full HTML layout
    html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DJ Music - Rapport de Doublons Flous (IA)</title>
    <style>
        :root {{
            --bg-color: #0d1117;
            --card-bg: #161b22;
            --border-color: #30363d;
            --text-color: #c9d1d9;
            --text-muted: #8b949e;
            --accent-color: #9c27b0;
            --accent-hover: #ba68c8;
            --danger-color: #f43f5e;
            --warning-color: #f59e0b;
            --info-color: #3b82f6;
            --success-color: #10b981;
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
            padding: 30px 0;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 30px;
            background: radial-gradient(circle at center, rgba(156, 39, 176, 0.15) 0%, transparent 70%);
        }}

        h1 {{
            color: #ffffff;
            margin: 0 0 10px 0;
            font-size: 2.6rem;
            letter-spacing: 1px;
            text-shadow: 0 0 15px rgba(156, 39, 176, 0.6);
        }}

        .subtitle {{
            color: var(--text-muted);
            font-size: 1.1rem;
            margin: 0;
        }}

        /* Stats Section */
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 15px;
            margin-bottom: 35px;
        }}

        .stat-card {{
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
            transition: transform 0.2s;
        }}

        .stat-card:hover {{
            transform: translateY(-2px);
        }}

        .stat-value {{
            font-size: 2rem;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 5px;
        }}

        .stat-label {{
            font-size: 0.85rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}

        .stat-card.fuzzy-match {{
            border-color: var(--accent-color);
            box-shadow: 0 0 15px rgba(156, 39, 176, 0.2);
        }}
        .stat-card.fuzzy-match .stat-value {{
            color: #e040fb;
        }}

        /* Filters Section */
        .controls-panel {{
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 35px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
        }}

        .controls-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
        }}

        @media (max-width: 768px) {{
            .controls-grid {{
                grid-template-columns: 1fr;
            }}
        }}

        .control-group {{
            display: flex;
            flex-direction: column;
            gap: 10px;
        }}

        .control-label {{
            font-size: 0.95rem;
            font-weight: 600;
            color: #ffffff;
            display: flex;
            justify-content: space-between;
        }}

        .control-label span.value-display {{
            color: #e040fb;
            font-family: monospace;
            font-weight: bold;
        }}

        #search-input {{
            padding: 12px 18px;
            font-size: 1rem;
            background-color: #0d1117;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            color: #ffffff;
            outline: none;
            transition: border-color 0.3s, box-shadow 0.3s;
        }}

        #search-input:focus {{
            border-color: var(--accent-color);
            box-shadow: 0 0 8px rgba(156, 39, 176, 0.4);
        }}

        /* Slider Styles */
        .slider-container {{
            display: flex;
            align-items: center;
            gap: 15px;
        }}

        #ratio-slider {{
            flex-grow: 1;
            -webkit-appearance: none;
            appearance: none;
            height: 6px;
            border-radius: 3px;
            background: #21262d;
            outline: none;
        }}

        #ratio-slider::-webkit-slider-thumb {{
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--accent-hover);
            cursor: pointer;
            box-shadow: 0 0 8px rgba(156, 39, 176, 0.8);
            transition: background 0.2s;
        }}

        #ratio-slider::-webkit-slider-thumb:hover {{
            background: #ffffff;
        }}

        /* Duplicate Cards List */
        .list-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding: 0 10px;
        }}

        .list-header h2 {{
            margin: 0;
            font-size: 1.4rem;
            color: #ffffff;
        }}

        .results-count {{
            color: var(--text-muted);
            font-size: 1rem;
        }}

        .pair-card {{
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            margin-bottom: 25px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            transition: transform 0.2s, border-color 0.2s;
        }}

        .pair-card:hover {{
            transform: translateY(-2px);
            border-color: #484f58;
            box-shadow: 0 6px 15px rgba(156, 39, 176, 0.1);
        }}

        .card-header {{
            background-color: rgba(22, 27, 34, 0.6);
            border-bottom: 1px solid var(--border-color);
            padding: 12px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}

        .pair-id {{
            font-size: 0.9rem;
            font-weight: bold;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}

        .card-badges {{
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
        }}

        .badge {{
            font-size: 0.8rem;
            font-weight: bold;
            padding: 5px 12px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}

        .badge-danger {{
            background-color: rgba(244, 63, 94, 0.15);
            color: #ff4a6b;
            border: 1px solid rgba(244, 63, 94, 0.4);
            box-shadow: 0 0 8px rgba(244, 63, 94, 0.2);
        }}

        .badge-warning {{
            background-color: rgba(245, 158, 11, 0.15);
            color: #ffb020;
            border: 1px solid rgba(245, 158, 11, 0.4);
        }}

        .badge-info {{
            background-color: rgba(59, 130, 246, 0.15);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.4);
        }}

        .badge-remix {{
            background-color: rgba(156, 39, 176, 0.15);
            color: #e040fb;
            border: 1px solid rgba(156, 39, 176, 0.4);
            box-shadow: 0 0 8px rgba(156, 39, 176, 0.15);
        }}

        .format-warning-badge {{
            font-size: 0.75rem;
            background-color: rgba(245, 158, 11, 0.1);
            color: #f59e0b;
            border: 1px solid rgba(245, 158, 11, 0.3);
            padding: 4px 10px;
            border-radius: 4px;
            font-weight: 500;
        }}

        .size-warning-badge {{
            font-size: 0.75rem;
            background-color: rgba(59, 130, 246, 0.1);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.3);
            padding: 4px 10px;
            border-radius: 4px;
            font-weight: 500;
        }}

        .card-body {{
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
            position: relative;
        }}

        /* File Info Row Layout */
        .file-info-row {{
            display: flex;
            gap: 15px;
            align-items: flex-start;
        }}

        .file-letter {{
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 0.95rem;
            flex-shrink: 0;
            margin-top: 3px;
        }}

        .letter-a {{
            background-color: rgba(156, 39, 176, 0.15);
            color: #e040fb;
            border: 1px solid rgba(156, 39, 176, 0.4);
        }}

        .letter-b {{
            background-color: rgba(0, 188, 212, 0.15);
            color: #00e5ff;
            border: 1px solid rgba(0, 188, 212, 0.4);
        }}

        .file-details {{
            flex-grow: 1;
        }}

        .file-name {{
            font-size: 1.05rem;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 6px;
            word-break: break-all;
        }}

        .file-path {{
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-bottom: 8px;
            word-break: break-all;
        }}

        .file-meta {{
            display: flex;
            gap: 10px;
        }}

        .meta-tag {{
            font-size: 0.75rem;
            background-color: #21262d;
            color: var(--text-muted);
            padding: 3px 8px;
            border-radius: 4px;
            border: 1px solid var(--border-color);
        }}

        .ext-tag {{
            font-weight: bold;
        }}

        .pair-divider {{
            text-align: center;
            font-size: 0.8rem;
            font-weight: bold;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 2px;
            position: relative;
            margin: 5px 0;
        }}

        .pair-divider::before, .pair-divider::after {{
            content: "";
            position: absolute;
            top: 50%;
            width: 45%;
            height: 1px;
            background-color: var(--border-color);
        }}

        .pair-divider::before {{ left: 0; }}
        .pair-divider::after {{ right: 0; }}

        footer {{
            text-align: center;
            padding: 40px 0 20px;
            color: var(--text-muted);
            font-size: 0.85rem;
            border-top: 1px solid var(--border-color);
            margin-top: 60px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔮 DJ Music Fuzzy Duplicate Finder (IA)</h1>
            <p class="subtitle">Analyse intelligente par correspondance textuelle floue sur 192.168.0.12</p>
        </header>

        <section class="stats-grid">
            <div class="stat-card fuzzy-match">
                <div class="stat-value">{len(pairs)}</div>
                <div class="stat-label">Paires de Doublons Flous</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len([p for p in pairs if p['ratio'] >= 0.90])}</div>
                <div class="stat-label">Paires Critiques (&ge;90%)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len([p for p in pairs if os.path.splitext(p['file1']['name'])[1].lower() != os.path.splitext(p['file2']['name'])[1].lower()])}</div>
                <div class="stat-label">Paires formats différents</div>
            </div>
        </section>

        <!-- Search and Threshold Sliders Panel -->
        <section class="controls-panel">
            <div class="controls-grid">
                <!-- Search Input -->
                <div class="control-group">
                    <label class="control-label" for="search-input">Rechercher un morceau ou dossier</label>
                    <input type="text" id="search-input" placeholder="🔍 Ex: Cece Peniston, Lagoa, Remix..." onkeyup="filterResults()">
                </div>

                <!-- Similarity Slider -->
                <div class="control-group">
                    <label class="control-label" for="ratio-slider">
                        Taux de similarité minimal
                        <span class="value-display" id="ratio-val">75%</span>
                    </label>
                    <div class="slider-container">
                        <input type="range" id="ratio-slider" min="75" max="98" value="75" oninput="updateSliderValue(this.value); filterResults()">
                    </div>
                </div>
            </div>
            
            <!-- Remix Filter Toggle -->
            <div style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.95rem; font-weight: 600; color: #ffffff;">
                    <input type="checkbox" id="hide-remixes" onchange="filterResults()" checked style="width: 18px; height: 18px; accent-color: var(--accent-color); cursor: pointer;">
                    Masquer les remixes et versions différentes (garder les deux dans la collection)
                </label>
            </div>
        </section>

        <!-- Results section -->
        <section class="results-section">
            <div class="list-header">
                <h2>📋 Liste des Doublons Classés par IA</h2>
                <span class="results-count" id="results-count">Affichage de {len(pairs)} paires</span>
            </div>

            <div id="pairs-list">
                {all_cards_str}
            </div>
        </section>

        <footer>
            Développé par Gemini CLI &bull; DJ Music Assistant 2026
        </footer>
    </div>

    <script>
        function updateSliderValue(val) {{
            document.getElementById('ratio-val').textContent = val + '%';
        }}

        function filterResults() {{
            const searchInput = document.getElementById('search-input');
            const filterText = searchInput.value.toLowerCase();
            
            const slider = document.getElementById('ratio-slider');
            const minRatio = parseInt(slider.value);
            
            const hideRemixes = document.getElementById('hide-remixes').checked;
            
            const cards = document.querySelectorAll('.pair-card');
            let visibleCount = 0;

            cards.forEach(card => {{
                const cardRatio = parseInt(card.getAttribute('data-ratio'));
                const filenames = card.getAttribute('data-filenames');
                const paths = card.getAttribute('data-paths');
                const isRemix = card.getAttribute('data-different-remix') === 'true';

                const matchesSearch = filenames.includes(filterText) || paths.includes(filterText);
                const matchesRatio = cardRatio >= minRatio;
                const matchesRemix = !hideRemixes || !isRemix;

                if (matchesSearch && matchesRatio && matchesRemix) {{
                    card.style.display = "";
                    visibleCount++;
                }} else {{
                    card.style.display = "none";
                }}
            }});

            const countEl = document.getElementById('results-count');
            countEl.textContent = "Affichage de " + visibleCount + " paire(s) sur " + cards.length;
        }}
        
        // Run initial filter to respect default checkbox value
        window.onload = function() {{
            filterResults();
        }};
    </script>
</body>
</html>
"""
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"✅ Rapport HTML interactif généré avec succès : '{output_file}'")
    print("💡 Ouvrez-le pour parcourir confortablement vos doublons avec le curseur de similarité !")

if __name__ == "__main__":
    generate_report()
