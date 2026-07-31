# 🔮 DJ Music Suite & Style Classifier

Bienvenue dans votre **DJ Music Suite**, l'assistant intelligent conçu pour aider les DJs (débutants comme confirmés) à nettoyer, classer et organiser leur collection musicale stockée sur un serveur NAS (FTP) ou sur leur ordinateur local.

Ce projet intègre :
1. **Un Moteur de Doublons (Java Spring Boot)** utilisant l'algorithme Gestalt pour repérer les doublons flous (remixes, formats différents).
2. **Un Reclassement Intelligent par IA (OpenAI gpt-4o-mini)** pour analyser et déplacer automatiquement vos fichiers vers les bons répertoires de styles.
3. **Un Analyseur de Mixes complet (Gemini Pro ou OpenAI Whisper)** capable d'écouter un mix de plusieurs heures et de vous dresser la tracklist complète.
4. **Une Interface Web moderne (Next.js)** ultra-fluide sous forme de console DJ sombre et épurée.

---

## 🚀 Comment l'installer sur un nouvel ordinateur ?

Pour exporter et installer cette application sur la machine d'un autre utilisateur, suivez ce guide simple :

### Étape 1 : Créer le Pack d'export (ZIP)
Copiez les répertoires suivants dans un fichier compressé **`.zip`** (ex: `DJ_Music_Suite.zip`) :
* 📂 `dj-scanner-api/` (le dossier du backend Java, **sans** le sous-dossier `target/` pour économiser de l'espace)
* 📂 `dj-scanner-web/` (le dossier de l'interface Next.js, **sans** le sous-dossier `node_modules/` ni `.next/`)
* 📂 `ftp-music-scanner/` (les scripts Python d'analyse IA)
* 📄 `.env` (le fichier de configuration de vos clés d'API)
* 📄 `lancer_appli.bat` (le script double-cliquable pour tout démarrer)
* 📄 `README.md` (ce guide d'utilisation)

*Note : En excluant `node_modules` et `target`, votre archive ZIP fera **moins de 5 Mo** au lieu de 400 Mo, et sera très facile à envoyer !*

---

## 💻 Instructions pour le nouvel utilisateur

### 1. Prérequis système (à installer une fois)
Avant de lancer l'application, assurez-vous d'avoir installé ces trois outils gratuits sur votre ordinateur :
1. **Java JDK 21** : [Télécharger Java 21](https://adoptium.net/temurin/releases/?version=21) (nécessaire pour faire tourner le moteur de recherche de doublons).
2. **Node.js (LTS)** : [Télécharger Node.js](https://nodejs.org/) (nécessaire pour afficher l'interface web).
3. **Python 3.10+** : [Télécharger Python](https://www.python.org/) (nécessaire pour faire tourner l'IA de classification).
4. *Facultatif mais recommandé* : **FFmpeg** (si vous souhaitez découper de très longs fichiers audios MP3 avec pydub).

---

### 2. Configuration des clés d'API et du NAS FTP
Ouvrez le fichier **`.env`** (ou `config.env`) à la racine et ajustez les paramètres avec vos propres accès :

```env
# --- Configuration de votre Serveur NAS FTP ---
FTP_HOST=192.168.0.12         # L'adresse IP de votre NAS
FTP_DIR=Clement/musique       # Le dossier racine de votre musique
FTP_USER=votre_utilisateur    # Votre compte de connexion NAS
FTP_PASS=votre_mot_de_passe   # Votre mot de passe NAS

# --- Configuration de vos clés d'Intelligence Artificielle ---
OPENAI_API_KEY=sk-proj-votre_cle_openai_ici...    # Pour le Reclassement IA et Whisper
GEMINI_API_KEY=AIzaSyVotreCleGeminiIci...         # Pour l'Analyseur audio Gemini
```

---

### 3. Premier démarrage 🏁
Double-cliquez simplement sur le fichier :
```bash
lancer_appli.bat
```

* **Que va-t-il se passer ?**
  1. Lors du tout premier lancement, le script va détecter que l'interface Next.js n'est pas installée. Il va télécharger automatiquement et proprement toutes les bibliothèques requises en tâche de fond (cela prend 1 à 2 minutes). Les lancements suivants seront instantanés (moins de 2 secondes !).
  2. Le serveur d'interface Next.js démarrera sur **`http://localhost:3000`**.
  3. Le serveur de calcul Java démarrera sur le port **`8081`**.
  4. Votre navigateur internet s'ouvrira automatiquement sur l'application.

---

### 4. Arrêt propre de l'application 🛑
Pour fermer l'application et libérer toute la mémoire de votre ordinateur, revenez sur la fenêtre noire principale (rose) et **appuyez sur n'importe quelle touche**.
Le script fermera proprement l'API Java, le serveur Node.js et toutes les fenêtres CMD associées de votre écran !
