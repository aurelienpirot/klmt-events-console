import openpyxl
import json

# Load workbook
wb = openpyxl.load_workbook('Outils_Gestion_KLMT_Events.xlsx')

data = {
    "recettes": [],
    "clients": [
        {
            "id": "client-1",
            "nom": "Bar Le Central",
            "adresse": "12 Rue de la Paix, 44000 Nantes",
            "email": "contact@barlecentral.fr",
            "telephone": "02 40 00 11 22"
        },
        {
            "id": "client-2",
            "nom": "Privé (Anniversaire)",
            "adresse": "Salle des Fêtes, 44470 Carquefou",
            "email": "anniv.prive@gmail.com",
            "telephone": "06 12 34 56 78"
        },
        {
            "id": "client-3",
            "nom": "Bar O'Clock",
            "adresse": "45 Rue de la Soif, 44000 Nantes",
            "email": "info@baroclock.com",
            "telephone": "02 40 99 88 77"
        }
    ],
    "devisFactures": [],
    "contrats": []
}

# 1. Parse 'Livre des Recettes'
sheet_recettes = wb['Livre des Recettes']
rows_recettes = list(sheet_recettes.iter_rows(values_only=True))

for i, row in enumerate(rows_recettes):
    if not row or row[0] is None:
        continue
    
    # Skip title and headers
    if "Suivi de comptabilité" in str(row[0]) or "Date Encaissement" in str(row[0]) or "TOTAL ANNUEL" in str(row[0]):
        continue
    
    date_enc, num_fact, client, nature, montant_ht, mode_reg = row[0], row[1], row[2], row[3], row[4], row[5]
    
    # Try to convert date to string if it is a datetime object
    if hasattr(date_enc, 'strftime'):
        date_enc = date_enc.strftime('%d/%m/%Y')
        
    try:
        m_ht = float(montant_ht) if montant_ht is not None else 0.0
    except ValueError:
        continue # Skip if can't parse montant
        
    data["recettes"].append({
        "id": f"recette-{i}",
        "dateEncaissement": str(date_enc) if date_enc else "",
        "numeroFacture": str(num_fact) if num_fact else "",
        "client": str(client) if client else "",
        "naturePrestation": str(nature) if nature else "",
        "montantHt": m_ht,
        "modeReglement": str(mode_reg) if mode_reg else ""
    })

# 2. Add sample Devis and Facture based on the templates in the Excel file
devis_items = [
    {
        "designation": "Prestation artistique DJ (Animation Live - Horaires: 22h00 - 02h00)",
        "quantite": 1.0,
        "unite": "Forfait",
        "prixUnitaire": 180.0,
        "montant": 180.0
    },
    {
        "designation": "Mise à disposition sonorisation mobile Woodbrass Stage Power 210",
        "quantite": 1.0,
        "unite": "Forfait",
        "prixUnitaire": 70.0,
        "montant": 70.0
    },
    {
        "designation": "Frais de déplacement (Distance inférieure à 15 km)",
        "quantite": 1.0,
        "unite": "Km",
        "prixUnitaire": 0.0,
        "montant": 0.0
    }
]

data["devisFactures"].append({
    "id": "devis-1",
    "numero": "D2026-001",
    "type": "DEVIS",
    "dateEmission": "29/07/2026",
    "datePrestation": "15/08/2026",
    "clientNom": "Bar Le Central",
    "clientAdresse": "12 Rue de la Paix, 44000 Nantes",
    "validite": "30 Jours",
    "items": devis_items,
    "totalHt": 250.0,
    "totalTtc": 250.0,
    "acompte": 75.0,
    "status": "VALIDÉ",
    "modeReglement": "Virement",
    "rib": "[Insérer RIB Revolut / N26 de Clément]"
})

data["devisFactures"].append({
    "id": "facture-1",
    "numero": "F2026-001",
    "type": "FACTURE",
    "dateEmission": "15/08/2026",
    "datePrestation": "15/08/2026",
    "clientNom": "Bar Le Central",
    "clientAdresse": "12 Rue de la Paix, 44000 Nantes",
    "validite": "À réception de facture",
    "items": devis_items,
    "totalHt": 250.0,
    "totalTtc": 250.0,
    "acompte": 75.0,
    "status": "PAYÉ",
    "modeReglement": "Virement",
    "rib": "[Insérer RIB Revolut / N26 de Clément]"
})

data["devisFactures"].append({
    "id": "facture-2",
    "numero": "F2026-002",
    "type": "FACTURE",
    "dateEmission": "12/09/2026",
    "datePrestation": "12/09/2026",
    "clientNom": "Privé (Anniversaire)",
    "clientAdresse": "Salle des Fêtes, 44470 Carquefou",
    "validite": "À réception de facture",
    "items": devis_items,
    "totalHt": 250.0,
    "totalTtc": 250.0,
    "acompte": 75.0,
    "status": "PAYÉ",
    "modeReglement": "Virement",
    "rib": "[Insérer RIB Revolut / N26 de Clément]"
})

data["devisFactures"].append({
    "id": "facture-3",
    "numero": "F2026-003",
    "type": "FACTURE",
    "dateEmission": "17/10/2026",
    "datePrestation": "17/10/2026",
    "clientNom": "Bar O'Clock",
    "clientAdresse": "45 Rue de la Soif, 44000 Nantes",
    "validite": "À réception de facture",
    "items": [
        {
            "designation": "Prestation artistique DJ seule (Régie équipée)",
            "quantite": 1.0,
            "unite": "Forfait",
            "prixUnitaire": 200.0,
            "montant": 200.0
        }
    ],
    "totalHt": 200.0,
    "totalTtc": 200.0,
    "acompte": 0.0,
    "status": "PAYÉ",
    "modeReglement": "Chèque",
    "rib": "[Insérer RIB Revolut / N26 de Clément]"
})

# 3. Add booking contract based on 'Contrat de Booking'
data["contrats"].append({
    "id": "contrat-1",
    "dateContrat": "29/07/2026",
    "clientNom": "Bar Le Central",
    "clientRepresentant": "M. Jean Martin (Gérant)",
    "prestationDate": "15/08/2026",
    "prestationHoraires": "22h00 - 02h00",
    "prestationTarif": 250.0,
    "prestationAcompte": 75.0,
    "prestationSolde": 175.0,
    "prestationTypeAmbiance": "House, Techno, Chill, Généraliste",
    "status": "SIGNÉ"
})

# Write JSON file
with open('management_data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Created management_data.json with", len(data["recettes"]), "recettes,", len(data["clients"]), "clients,", len(data["devisFactures"]), "devis/factures, and", len(data["contrats"]), "contrats.")
