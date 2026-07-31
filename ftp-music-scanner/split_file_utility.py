#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Utilitaire de découpage de fichiers audio volumineux en morceaux < 25 Mo.
Idéal pour découper les longs sets DJ afin de les traiter avec l'API OpenAI Whisper.
"""

import os
import sys

def split_mp3_file(file_path, chunk_size_mb=24.0):
    if not os.path.exists(file_path):
        print(f"❌ [ERREUR] Le fichier spécifié est introuvable : {file_path}")
        return False

    file_size_bytes = os.path.getsize(file_path)
    file_size_mb = file_size_bytes / (1024 * 1024)
    
    print(f"📁 Fichier d'origine : {file_path}")
    print(f"📊 Taille totale : {file_size_mb:.1f} Mo")
    
    if file_size_mb <= chunk_size_mb:
        print(f"✓ Le fichier fait déjà moins de {chunk_size_mb} Mo. Pas de découpage nécessaire.")
        return True

    chunk_size_bytes = int(chunk_size_mb * 1024 * 1024)
    
    print(f"⏳ Lecture du fichier binaire...")
    with open(file_path, 'rb') as f:
        file_data = f.read()

    total_bytes = len(file_data)
    num_chunks = (total_bytes + chunk_size_bytes - 1) // chunk_size_bytes
    
    base_name = os.path.splitext(os.path.basename(file_path))[0]
    output_dir = os.path.dirname(file_path)
    
    print(f"🎬 Découpage binaire en {num_chunks} morceaux de {chunk_size_mb} Mo maximum...")
    
    created_files = []
    for i in range(num_chunks):
        start = i * chunk_size_bytes
        end = min((i + 1) * chunk_size_bytes, total_bytes)
        chunk_data = file_data[start:end]
        
        # Formatage du nom de sortie : NomMix_partie_1.mp3
        output_filename = f"{base_name}_partie_{i+1}.mp3"
        output_path = os.path.join(output_dir, output_filename)
        
        print(f"✂️ Écriture du morceau {i+1}/{num_chunks} : {output_filename} ({len(chunk_data)/(1024*1024):.1f} Mo)...")
        with open(output_path, 'wb') as chunk_file:
            chunk_file.write(chunk_data)
            
        created_files.append(output_path)
        
    print(f"\n🎉 Découpage terminé avec succès ! {len(created_files)} morceaux créés dans : {output_dir}")
    return True

if __name__ == "__main__":
    # Découper le fichier spécifique demandé par l'utilisateur
    target_file = r"C:\Scripts\DJ\downloads\DJ Set Fête de la musique Carquefou 2025 by YOUNX.mp3"
    split_mp3_file(target_file)
