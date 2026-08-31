# 💼 Console de Gestion KLMT Events — Dashboard Financier

Bienvenue dans la **Console de Gestion KLMT Events**, une application web moderne, légère et autonome conçue pour simplifier au maximum la gestion administrative, contractuelle et comptable des prestations événementielles de **KLMT Events**.

Cette application a été simplifiée pour fonctionner de manière **100% autonome en local**, sans dépendances externes (pas de serveur Java/Spring Boot requis ni de scripts Python). Toute la logique métier est désormais intégrée directement au sein du serveur Next.js, qui lit et écrit en temps réel dans votre fichier local de données sécurisé.

---

## ✨ Fonctionnalités Clés

1. **📈 Dashboard Financier** : Visualisez en un clin d'œil vos indicateurs clés, votre chiffre d'affaires (HT/TTC), les acomptes perçus et le solde restant à percevoir avec un graphique de répartition mensuel.
2. **👥 Gestion des Clients** : Enregistrez et organisez les coordonnées de vos clients (nom, adresse, email, téléphone).
3. **📄 Gestion des Devis & Factures** :
   * Saisie de devis détaillés avec gestion d'articles (désignation, quantité, prix unitaire HT, totaux HT/TTC, acompte de 30% requis).
   * Passage d'un devis au statut **VALIDÉ**.
   * Génération de facture officielle en un clic grâce au bouton **⚡ Facturer** qui convertit instantanément un devis en facture.
4. **✍️ Contrats de Booking Automatiques** :
   * Dès qu'un devis passe au statut **VALIDÉ**, le système crée automatiquement un contrat de booking pré-rempli dans l'onglet **Contrats**.
   * Le contrat calcule de lui-même l'acompte de 30% et le solde à payer, et liste les ambiances suggérées issues du devis.
5. **💰 Saisie des Encaissements & Recettes** :
   * Enregistrez les règlements des factures.
   * **Règles de sécurité comptable** : L'application bloque automatiquement la saisie d'un montant d'encaissement supérieur au solde restant à payer sur la facture concernée.
   * Le paiement complet d'une facture fait passer son statut à **PAYÉ** à l'écran.
   * Les acomptes encaissés passent automatiquement le contrat de booking associé de l'état *EN_ATTENTE* à *SIGNÉ*.
   * Remplissage automatique du livre des recettes conforme aux normes.

---

## 🛠️ Stack Technique

* **Frontend & Backend Unifiés** : Next.js (React / TypeScript).
* **Gestion d'État & Requêtes** : Apollo Client interrogeant une route d'API GraphQL interne (`/api/graphql`).
* **Base de Données** : Fichier JSON sécurisé local (`management_data.json`).

---

## 🚀 Démarrage Rapide

### 1. Lancement de l'application
Double-cliquez simplement sur le fichier à la racine du projet :
👉 **`lancer_appli.bat`**

* **Que fait ce script ?**
  1. Lors du tout premier lancement, il détecte que les bibliothèques requises ne sont pas encore installées et lance proprement un `npm install` en tâche de fond (cela prend environ 1 minute). Les démarrages suivants se feront en moins de 2 secondes.
  2. Il démarre le serveur web local sur le port **`3000`**.
  3. Il ouvre automatiquement votre navigateur internet sur **`http://localhost:3000`**.

### 2. Arrêt propre de l'application 🛑
Pour fermer l'application et libérer la mémoire de votre ordinateur, revenez sur la fenêtre de commande principale et **appuyez sur n'importe quelle touche**. Le script fermera proprement tous les processus ouverts !

### 3. Nettoyage Forcé
En cas de blocage ou si vous souhaitez forcer l'arrêt total des serveurs en arrière-plan, double-cliquez sur :
👉 **`fermer_appli.bat`**

---

## 💾 Emplacement des Données
Toutes vos données (clients, devis, factures, contrats, encaissements) sont enregistrées dans le fichier **`management_data.json`** à la racine de ce projet. Ce fichier est mis à jour à chaque modification ou suppression effectuée depuis l'interface web. Pensez à en faire des copies de sauvegarde régulières !
