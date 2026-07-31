import os
import re
import json
from difflib import SequenceMatcher
from collections import defaultdict

# Global index of automatically detected artist names repeated inside folders
FOLDER_ARTISTS = defaultdict(set)

# Common stop words in DJ music that we shouldn't use for indexing/blocking
STOP_WORDS = {
    'feat', 'remix', 'mix', 'original', 'radio', 'edit', 'club', 'the', 'and', 
    'of', 'in', 'to', 'for', 'version', 'with', 'intro', 'outro', 'extended',
    'bootleg', 'rework', 'mashup', 'promo', 'records', 'music', 'mp3', 'flac', 'wav'
}

def clean_name(name):
    """
    Cleans a filename to extract core title words for comparison.
    e.g., "01 - Lola's Theme (Joey Negro Remix).flac" -> "lola s theme joey negro remix"
    """
    # Remove extension
    name = os.path.splitext(name)[0].lower()
    # Remove track numbers at start
    name = re.sub(r'^\d+[\s\-_.]*', '', name)
    # Remove some brackets punctuation but keep words
    name = re.sub(r'[^\w\s]', ' ', name)
    # Clean spacing
    return " ".join(name.split())

def strip_mix_suffixes(title):
    """
    Strips common DJ mix suffixes (e.g., "original mix", "extended mix", "club mix")
    from the end of the song title to prevent false duplicate matching.
    """
    words = title.split()
    if not words:
        return ""
        
    dj_keywords = {
        'vip', 'original', 'remix', 'mix', 'club', 'dub', 'radio', 'extended', 
        'edit', 'rework', 'bootleg', 'mashup', 'live', 'instrumental', 'vocal', 
        'dubbin', 'version', 'repack'
    }
    
    while words and words[-1] in dj_keywords:
        words.pop()
        
    if not words:
        return title
        
    return " ".join(words)

def get_song_title(name, path=None):
    """
    Extracts the song title part from a filename to prevent artist-only matching.
    e.g., "113- the_mackenzie_feat._jessy - alive.flac" -> "alive"
    """
    # Remove extension and lowercase
    name = os.path.splitext(name)[0].lower()
    # Normalize underscores to spaces to ensure consistency
    name = name.replace('_', ' ')
    
    # Extract parent folder name as potential artist context
    parent_folder = ""
    parent_path = ""
    if path:
        parent_path = os.path.dirname(path)
        parent_folder = os.path.basename(parent_path).lower()
        parent_folder = re.sub(r'\[.*?\]|\(.*?\)', '', parent_folder).strip()
    
    # Split by common separators: ' - ' or '-'
    parts = []
    if ' - ' in name:
        parts = name.split(' - ')
    elif '-' in name:
        parts = name.split('-')
        
    title = name
    if len(parts) >= 3:
        # Check if first part is a track number (e.g. "123", "01", "a1")
        first_part = parts[0].strip()
        if first_part.isdigit() or len(first_part) <= 3:
            last_part = parts[-1].strip().lower()
            
            # Check if last part matches the parent folder name,
            # OR is in our automatically detected folder artists set!
            is_artist_at_end = False
            if parent_folder and (last_part in parent_folder or parent_folder in last_part):
                is_artist_at_end = True
            elif parent_path and last_part in FOLDER_ARTISTS[parent_path]:
                is_artist_at_end = True
                
            if is_artist_at_end:
                title = parts[1].strip()
            else:
                # Check if second part has artist terms like "feat"
                p1 = parts[1].lower()
                if 'feat' in p1 or ' ft ' in p1 or ' vs ' in p1 or 'pres' in p1:
                    title = parts[2].strip()
                else:
                    # Default Various Artists format: Track - Artist - Title
                    title = parts[2].strip()
        else:
            title = parts[-1].strip()
    elif len(parts) == 2:
        # Check if first part is a track number (e.g. "01 - Title")
        first_part = parts[0].strip()
        if first_part.isdigit() or len(first_part) <= 3:
            title = parts[1].strip()
        else:
            title = parts[-1].strip()
        
    # Clean extra brackets/parenthesis (e.g. "repack", "mix", etc.)
    title = re.sub(r'\[.*?\]|\(.*?\)', '', title).strip()
    
    # Strip DJ mix suffixes from the end of the title
    title = strip_mix_suffixes(title)
    
    # Strip leading track numbers that might be left
    title = re.sub(r'^\d+[\s\-_.]*', '', title)
            
    # Fallback / final clean
    return re.sub(r'[^\w\s]', ' ', title).strip()

def titles_are_similar(t1, t2):
    """
    Intelligently compares two song titles to prevent false subsequence matches
    for short titles, while supporting substring matches (remixes) and fuzzy matching.
    """
    if t1 == t2:
        return True
        
    # Check if one is a substring of the other (e.g. "traky" inside "traky_dj_hs_edit")
    if t1 in t2 or t2 in t1:
        return True
        
    # Rejection of short titles that do not match as exact/substring
    if min(len(t1), len(t2)) < 6:
        return False
        
    ratio = SequenceMatcher(None, t1, t2).ratio()
    return ratio >= 0.65

def is_different_remix(name1, name2, path1=None, path2=None):
    """
    Checks if two filenames represent different remixes, edits or mixes of the same track,
    or different tracks entirely (by comparing artist names if titles are similar).
    e.g. "Original Mix" vs "VIP Mix", "Fatum Remix" vs "Rauschhaus Remix".
    """
    n1 = os.path.splitext(name1)[0].lower()
    n2 = os.path.splitext(name2)[0].lower()
    
    # 1. Compare text inside brackets/parentheses
    p1 = set(re.findall(r'\[(.*?)\]|\((.*?)\)', name1))
    p2 = set(re.findall(r'\[(.*?)\]|\((.*?)\)', name2))
    p1_flat = {item.strip() for tup in p1 for item in tup if item}
    p2_flat = {item.strip() for tup in p2 for item in tup if item}
    
    if p1_flat != p2_flat:
        p1_norm = {x.replace(' ', '').replace('-', '').replace('_', '') for x in p1_flat}
        p2_norm = {x.replace(' ', '').replace('-', '').replace('_', '') for x in p2_flat}
        if p1_norm != p2_norm:
            return True
            
    # 2. Check for DJ keyword differences in the main filenames
    dj_keywords = {
        'vip', 'original', 'remix', 'mix', 'club', 'dub', 'radio', 'extended', 
        'edit', 'rework', 'bootleg', 'mashup', 'live', 'instrumental', 'vocal', 
        'dubbin', 'version'
    }
    w1 = set(re.findall(r'\b\w+\b', n1))
    w2 = set(re.findall(r'\b\w+\b', n2))
    
    # Check for different significant words (excluding track numbers and stop words)
    sig_w1 = {w for w in w1 if len(w) >= 4 and w not in STOP_WORDS and not w.isdigit()}
    sig_w2 = {w for w in w2 if len(w) >= 4 and w not in STOP_WORDS and not w.isdigit()}
    if sig_w1 != sig_w2:
        return True
    
    kw1 = w1.intersection(dj_keywords)
    kw2 = w2.intersection(dj_keywords)
    
    if kw1 != kw2:
        return True
        
    # 3. Check for different artists (if song titles are identical but artist words differ completely)
    t1 = get_song_title(name1, path1)
    t2 = get_song_title(name2, path2)
    
    title_words1 = set(re.findall(r'\b\w+\b', t1))
    title_words2 = set(re.findall(r'\b\w+\b', t2))
    
    # Artist words are whatever is left after removing title words and dj keywords
    artist_words1 = w1 - title_words1 - dj_keywords
    artist_words2 = w2 - title_words2 - dj_keywords
    
    # Ignore track numbers and short prepositions/pronouns
    short_exclude = {'it', 'me', 'on', 'in', 'to', 'by', 'at', 'or', 'an', 'as', 'do', 'go', 'so', 'if', 'of', 'my', 'up', 'no', 'he', 'we'}
    artist_words1 = {w for w in artist_words1 if not w.isdigit() and len(w) >= 2 and w not in short_exclude}
    artist_words2 = {w for w in artist_words2 if not w.isdigit() and len(w) >= 2 and w not in short_exclude}
    
    if artist_words1 and artist_words2:
        # If the remaining artist words share zero common elements (completely disjoint artists!)
        if not artist_words1.intersection(artist_words2):
            return True
        
    return False

def get_significant_words(cleaned_name):
    """
    Extracts significant words (length >= 4 and not in stop words) to use as indexing keys.
    """
    words = re.findall(r'\b\w{4,}\b', cleaned_name)
    return [w for w in words if w not in STOP_WORDS]

def run_fuzzy_matcher():
    cache_file = "music_files.json"
    if not os.path.exists(cache_file):
        print(f"❌ Fichier cache '{cache_file}' introuvable. Veuillez d'abord exécuter le scanneur.")
        return

    print("📖 Chargement des fichiers scannés...")
    with open(cache_file, "r", encoding="utf-8") as f:
        files = json.load(f)

    # Automatically detect repeated artists in each folder to resolve segment order (e.g. TrackNum - Title - Artist)
    global FOLDER_ARTISTS
    folder_last_segments = defaultdict(list)
    
    for file_info in files:
        name = file_info['name']
        path = file_info['path']
        folder = os.path.dirname(path)
        
        # Split by ' - ' or '-'
        clean_base = os.path.splitext(name)[0].lower().replace('_', ' ')
        parts = []
        if ' - ' in clean_base:
            parts = [p.strip() for p in clean_base.split(' - ') if p.strip()]
        elif '-' in clean_base:
            parts = [p.strip() for p in clean_base.split('-') if p.strip()]
            
        if len(parts) >= 3:
            first_part = parts[0]
            if first_part.isdigit() or len(first_part) <= 3:
                last_part = parts[-1].strip()
                # Strip parenthesised terms
                last_part = re.sub(r'\[.*?\]|\(.*?\)', '', last_part).strip()
                if last_part:
                    folder_last_segments[folder].append(last_part)
                    
    for folder, segments in folder_last_segments.items():
        segment_counts = {seg: segments.count(seg) for seg in set(segments)}
        for seg, count in segment_counts.items():
            if count >= 2:
                FOLDER_ARTISTS[folder].add(seg)

    print(f"📊 {len(files)} fichiers chargés. Nettoyage et indexation...")
    
    # 1. Clean names and build inverted index of significant words
    cleaned_data = []
    word_index = defaultdict(list)
    
    for idx, file_info in enumerate(files):
        name = file_info['name']
        cleaned = clean_name(name)
        sig_words = get_significant_words(cleaned)
        
        file_entry = {
            'index': idx,
            'path': file_info['path'],
            'name': name,
            'cleaned': cleaned,
            'size': file_info['size']
        }
        cleaned_data.append(file_entry)
        
        # Index each file under its significant words
        for word in sig_words:
            word_index[word].append(idx)

    print(f"🔍 Indexation terminée. {len(word_index)} mots-clés uniques indexés.")
    print("⚡ Recherche des paires de candidats similaires (algorithme optimisé)...")

    # 2. Collect unique candidate pairs sharing at least one significant word
    candidate_pairs = set()
    for word, file_indices in word_index.items():
        # If too many files share a word (e.g. 100+ files), it might be a generic term we missed, skip it to save time
        if len(file_indices) > 50:
            continue
        # Generate pairs (i, j) with i < j
        for i in range(len(file_indices)):
            for j in range(i + 1, len(file_indices)):
                idx1 = file_indices[i]
                idx2 = file_indices[j]
                if idx1 < idx2:
                    candidate_pairs.add((idx1, idx2))

    print(f"🤝 {len(candidate_pairs)} paires de candidats uniques à comparer (au lieu de {len(files) * (len(files)-1) // 2} paires possibles !)")

    # 3. Calculate similarity ratio for each pair
    similar_pairs = []
    for idx1, idx2 in sorted(candidate_pairs):
        f1 = cleaned_data[idx1]
        f2 = cleaned_data[idx2]
        
        # Quick check: if the filenames are strictly identical (case-insensitive), we skip them
        # as they are already handled by the exact duplicate scanner
        if f1['name'].lower() == f2['name'].lower():
            continue
            
        ratio = SequenceMatcher(None, f1['cleaned'], f2['cleaned']).ratio()
        
        # We target similarity between 0.75 and 1.00
        if 0.75 <= ratio <= 1.00:
            # Smart check: Extract actual titles and check if they are similar, using path context
            t1 = get_song_title(f1['name'], f1['path'])
            t2 = get_song_title(f2['name'], f2['path'])
            
            # If the actual song titles are completely different, it is NOT a duplicate!
            if not titles_are_similar(t1, t2):
                continue
                
            different_remix = is_different_remix(f1['name'], f2['name'], f1['path'], f2['path'])
                
            similar_pairs.append({
                'ratio': round(ratio, 3),
                'different_remix': different_remix,
                'file1': {'path': f1['path'], 'name': f1['name'], 'size': f1['size']},
                'file2': {'path': f2['path'], 'name': f2['name'], 'size': f2['size']}
            })

    # Sort similar pairs by similarity ratio descending
    similar_pairs.sort(key=lambda x: x['ratio'], reverse=True)

    print(f"🎯 {len(similar_pairs)} paires de doublons potentiels (flous) identifiées !")

    # 4. Save results to JSON
    output_file = "fuzzy_candidates.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(similar_pairs, f, ensure_ascii=False, indent=4)
    print(f"💾 Résultats sauvegardés dans : '{output_file}'")

    # 5. Print top 15 most interesting candidates for immediate feedback
    if similar_pairs:
        print("\n📋 TOP 15 DES CANDIDATS LES PLUS SIMILAIRES :")
        print("=================================================================")
        for i, pair in enumerate(similar_pairs[:15], 1):
            print(f"{i}. Score de similitude : {pair['ratio'] * 100}%")
            print(f"   [A] {pair['file1']['name']}")
            print(f"       Chemin : {pair['file1']['path']}")
            print(f"   [B] {pair['file2']['name']}")
            print(f"       Chemin : {pair['file2']['path']}")
            print("-" * 65)

if __name__ == "__main__":
    run_fuzzy_matcher()
