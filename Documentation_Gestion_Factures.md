# 💼 Guide de Fonctionnement — Console de Gestion KLMT Events & Dashboard Financier

Bienvenue dans le guide d'utilisation de la console **Console de Gestion KLMT Events** et du **Dashboard Financier** de l'application **DJ Music Suite**. Ce module a été spécialement conçu pour Clément afin de simplifier au maximum la gestion administrative, contractuelle et comptable des événements de **KLMT Events** grâce à des automatismes puissants et intelligents.

---

## 🗺️ 1. Le Cycle de Vie d'une Prestation

Le cycle de vie optimal d'un événement au sein de l'application suit un enchaînement logique en 4 étapes majeures :

```
┌────────────────────────┐
│  1. DEVIS (Brouillon)  │ ➔ Saisie des articles, tarifs, options
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│  1. DEVIS (Validé)     │ ➔ Accepté par le client
└───────────┬────────────┘
            │
            ├──────────────────────────┐ (Génération automatique en arrière-plan)
            ▼                          ▼
┌────────────────────────┐   ┌────────────────────────┐
│  2. CONTRAT (En att.)  │   │  3. FACTURE (Envoyé)   │ ➔ Via le bouton "⚡ Facturer"
└───────────┬────────────┘   └───────────┬────────────┘
            │                            │
  (Paiement de l'acompte)       (Paiement du solde restant)
            ▼                            ▼
┌────────────────────────┐   ┌────────────────────────┐
│  2. CONTRAT (Signé)    │   │  3. FACTURE (Payée)    │ ➔ Lorsque cumul encaissements = total
└────────────────────────┘   └────────────────────────┘
```

---

## ⚡ 2. Les Automatismes Intégrés

Pour vous éviter de la double saisie et des clics inutiles, plusieurs règles métier intelligentes s'exécutent automatiquement en arrière-plan :

### A. Devis Validé ➔ Contrat de Booking Automatique (Back-End)
Dès qu'un devis passe au statut **`VALIDÉ`** (ce qui signifie que le client a accepté votre proposition tarifaire) :
* Le système génère automatiquement un **Contrat de Booking** à l'état **`EN_ATTENTE`**.
* Ce contrat est pré-rempli avec :
  * Le nom du client.
  * Le tarif global convenu (TTC).
  * L'acompte requis de 30 % (calculé automatiquement).
  * Le solde restant (70 %).
  * La date de la prestation.
  * Une liste d'ambiances/styles suggérés tirés des désignations d'articles du devis.

### B. En un clic : Devis ➔ Facture (Front-End)
Un devis ne peut pas servir de facture comptable. Une fois le devis accepté :
* Un bouton vert **`⚡ Facturer`** apparaît sur la ligne du devis.
* En cliquant dessus, le système **clone le devis** pour créer une **Facture** officielle en statut **`ENVOYÉ`** :
  * Elle reçoit automatiquement le numéro séquentiel suivant (ex : `F2026-004`).
  * Les articles et totaux sont fidèlement dupliqués.
  * L'acompte demandé est configuré à `0 €` (car la facture finale couvre la totalité, l'acompte étant déjà traité contractuellement).

### C. Encaissement d'un Acompte ➔ Contrat Signé (Back-End)
Dès que vous recevez le premier paiement (l'acompte de 30 %) et que vous l'enregistrez sous le sous-onglet **Encaissements** (dans l'onglet Console de Gestion) :
* Le système associe l'encaissement au contrat de prestation de cette date.
* Le contrat passe automatiquement du statut `EN_ATTENTE` à **`SIGNÉ`** (la prestation est verrouillée et sécurisée !).
* **Sécurisation :** Si vous supprimez l'encaissement, le contrat repasse automatiquement à l'état `EN_ATTENTE`.

### D. Solde Reçu ➔ Facture Payée (Back-End & Front-End)
* Dès que la somme de tous les encaissements rattachés à un numéro de facture atteint (ou dépasse) le montant total de celle-ci, la facture passe automatiquement en statut **`PAYÉ`**.
* Si vous supprimez ou réduisez un encaissement, la facture repasse instantanément à l'état **`ENVOYÉ`**.

---

## 👤 3. Guide pas à pas d'une Prestation Réussie

### Étape A : Enregistrer le Client (Annuaire)
1. Allez dans l'onglet **Console de Gestion KLMT Events**, puis sous-onglet **Clients**.
2. Cliquez sur **`➕ Ajouter un client`**.
3. Saisissez le nom (ex: *Bar Le Central*), l'adresse, l'email et le téléphone. Cliquez sur **Enregistrer**.

### Étape B : Émettre le Devis
1. Allez dans le sous-onglet **Devis & Factures**.
2. Cliquez sur **`➕ Nouveau Devis`**.
3. Sélectionnez le client dans la liste déroulante (l'adresse se remplit toute seule).
4. Ajoutez vos prestations dans le tableau du bas (ex: *Prestation DJ artistique*, quantité *1*, prix *250 €*), puis cliquez sur le petit bouton plus bleu `➕` pour ajouter la ligne.
5. L'acompte de 30 % (75 €) est calculé tout seul.
6. Mettez le statut sur **`VALIDÉ`** et cliquez sur **`Enregistrer le document`**.
   * *Résultat magique :* Un contrat de prestation vient d'être créé en arrière-plan sous le sous-onglet **Contrats** !

### Étape C : Faire signer le Contrat & Encaisser l'Acompte
1. Allez sous le sous-onglet **Contrats de Booking**.
2. Vous y trouvez votre nouveau contrat `EN_ATTENTE`. Vous pouvez cliquer sur **`✍️ Contrat`** pour l'imprimer ou l'exporter en PDF et l'envoyer au client.
3. Le client vous renvoie le contrat signé avec un acompte de 75 € par virement.
4. Allez sous le sous-onglet **Encaissements** (dans l'onglet Console de Gestion KLMT Events) et cliquez sur **`➕ Ajouter un encaissement`**.
5. Sélectionnez le numéro de votre facture/devis (ex : `F2026-004`).
   * *Résultat magique :* Le client est sélectionné et verrouillé, le solde restant proposé par défaut est de 250 € (modifiez-le pour saisir `75 €` qui correspond à l'acompte réel reçu).
6. Enregistrez l'encaissement de l'acompte.
   * *Résultat magique :* Le contrat sous le sous-onglet **Contrats** est passé automatiquement en **`SIGNÉ`** !

### Étape D : Émettre la Facture Finale
1. Le jour de la prestation arrive. Allez sous le sous-onglet **Devis & Factures**.
2. Sur la ligne de votre devis validé, cliquez sur le bouton vert **`⚡ Facturer`**.
   * *Résultat magique :* Une facture officielle `F2026-00X` en statut **`ENVOYÉ`** est créée ! Vous pouvez cliquer sur **`👁️ PDF`** pour l'imprimer et la donner au client.

### Étape E : Encaisser le Solde
1. Le client vous règle le solde restant de la facture (175 €).
2. Allez sous le sous-onglet **Encaissements** (dans la Console de Gestion KLMT Events) et cliquez sur **`➕ Ajouter un encaissement`**.
3. Sélectionnez le numéro de votre facture.
   * *Sécurité :* Seules les factures non entièrement payées apparaissent dans la liste !
   * *Résultat magique :* Le montant proposé par défaut est exactement le solde restant à payer (`175 €`).
4. Enregistrez l'encaissement.
   * *Résultat magique :* La facture passe instantanément à l'état **`PAYÉ`** à l'écran !

---

## 🛡️ 4. Règles de Sécurité & d'Intégrité Comptable

Pour garantir une comptabilité rigoureuse et conforme aux normes de KLMT Events :
1. **Facture existante obligatoire :** Impossible de saisir un encaissement sur un numéro de facture libre ou inexistant. Vous devez obligatoirement choisir une facture réelle présente dans le système.
2. **Contrôle anti-dépassement :** Le système calcule dynamiquement les montants déjà encaissés pour chaque facture. Si vous essayez de saisir un encaissement dont le montant dépasse le solde restant à payer de la facture, l'application bloque l'enregistrement et affiche une alerte d'erreur.
3. **Persistance sécurisée :** Toutes les données de gestion sont écrites et sauvegardées de manière asynchrone et sécurisée dans le fichier `management_data.json` à la racine du projet. Ce fichier est automatiquement mis à jour à chaque modification ou suppression.
