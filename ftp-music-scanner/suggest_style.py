#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
DJ Assistant - AI Style Suggestion Utility (OpenAI gpt-4o-mini)
Analyse un titre et artiste de musique, compare à son dossier actuel
et suggère le dossier (style) idéal de rangement de manière très économe en tokens.
"""

import os
import sys
import argparse
import json
import subprocess

# Forcer l'encodage UTF-8 de la console Windows pour eviter les UnicodeEncodeError
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Charger la configuration depuis le .env racine et le config.env local
config_files = [
    os.path.join(os.path.dirname(__file__), 'config.env'),
    os.path.join(os.path.dirname(__file__), '..', '.env')
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
                        if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                            val = val[1:-1]
                        os.environ[key] = val

def main():
    parser = argparse.ArgumentParser(description="AI Style Suggestion Utility")
    parser.add_argument("--name", required=True, help="Nom du fichier musical")
    parser.add_argument("--path", required=True, help="Chemin actuel du fichier")
    parser.add_argument("--styles", required=False, help="Liste des dossiers existants séparés par des virgules")
    
    args = parser.parse_args()
    
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print(json.dumps({
            "recommendedStyle": "Général",
            "explanation": "Erreur : Clé API OpenAI absente de votre .env.",
            "isCorrect": True
        }))
        sys.exit(1)
        
    try:
        import openai
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "openai", "--quiet"])
        import openai

    client = openai.OpenAI(api_key=api_key)
    
    # Extraire le style actuel (nom du dossier parent)
    clean_path = args.path.replace('\\', '/')
    segments = clean_path.split('/')
    current_style = segments[0] if len(segments) > 1 else "Général"
    
    # Récupérer la liste des styles autorisés (dossiers existants de l'utilisateur)
    existing_styles_str = args.styles if args.styles else "House, Classic, EDM, Techno, Trance, Général"
    
    prompt = f"""
    Analyse ce morceau de musique pour un DJ :
    - Nom du fichier : "{args.name}"
    - Répertoire actuel : "{current_style}"
    - Liste des répertoires existants chez l'utilisateur : {existing_styles_str}
    
    Détermine son style musical idéal en choisissant prioritairement parmi les répertoires existants répertoriés ci-dessus.
    
    Si l'un des répertoires existants de la liste convient (ou si le répertoire actuel est déjà tout à fait approprié), propose-le dans "recommendedStyle" et retourne "isCorrect": true/false (selon s'il faut le déplacer ou non).
    
    Si ABSOLUMENT AUCUN des répertoires existants ne convient du tout (ex: c'est du Rock ou de la Chanson Française, et l'utilisateur n'a que des dossiers Electro/Techno/House), tu es autorisé à suggérer exceptionnellement la CRÉATION d'un nouveau répertoire idéal de style (ex: "Rock", "Chanson Française", "Reggae") comme préconisation de nouveau dossier.
    
    Réponds UNIQUEMENT sous forme d'un objet JSON contenant exactement ces 3 clés, sans fioriture ni bloc de code Markdown :
    {{
      "recommendedStyle": "Le nom du dossier recommandé (existant ou nouveau dossier préconisé)",
      "explanation": "Une explication courte de 15 mots maximum (en français). Précise clairement s'il s'agit d'un dossier existant ou s'il est préconisé d'en créer un nouveau.",
      "isCorrect": true ou false
    }}
    """
    
    try:
        # Utilisation de gpt-4o-mini pour consommer un minimum de tokens tout en restant ultra-rapide et intelligent !
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": "Tu es un expert DJ et musicologue. Tu retournes uniquement du JSON valide."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.2
        )
        
        result_json = completion.choices[0].message.content.strip()
        # Valider que c'est du JSON correct
        parsed = json.loads(result_json)
        print(json.dumps(parsed, ensure_ascii=False))
        
    except Exception as e:
        print(json.dumps({
            "recommendedStyle": current_style,
            "explanation": f"Échec de l'analyse : {str(e)}",
            "isCorrect": True
        }, ensure_ascii=False))

if __name__ == "__main__":
    main()
