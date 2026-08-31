import { NextResponse } from 'next/server';
import { readData, writeData, generateUUID } from '@/lib/db';
import { Recette } from '@/types';

export async function GET() {
  try {
    const data = await readData();
    return NextResponse.json(data.recettes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error reading recettes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rInput: Recette = await request.json();
    const data = await readData();

    if (rInput.numeroFacture && rInput.numeroFacture.trim() !== '' && rInput.id !== 'recette-0') {
      const facture = data.devisFactures.find(f => f.numero === rInput.numeroFacture);
      if (!facture) {
        return NextResponse.json({ error: `La facture ${rInput.numeroFacture} n'existe pas` }, { status: 400 });
      }

      // Calculer la somme déjà encaissée sur cette facture :
      // exclure la recette en cours de modification (si elle a déjà un ID) de la somme de montantHt pour cette facture.
      const dejaEncaisse = data.recettes
        .filter(r => r.numeroFacture === rInput.numeroFacture && r.id !== rInput.id)
        .reduce((sum, r) => sum + r.montantHt, 0);

      const resteAPayer = facture.totalHt - dejaEncaisse;

      if (rInput.montantHt > resteAPayer + 0.01) {
        return NextResponse.json({
          error: `Le montant saisi (${rInput.montantHt} €) dépasse le reste à payer (${resteAPayer.toFixed(2)} €) pour la facture ${rInput.numeroFacture}.`
        }, { status: 400 });
      }

      // Mettre à jour le statut de la facture
      if (resteAPayer - rInput.montantHt <= 0.01) {
        facture.status = 'PAYÉ';
      } else if (facture.status === 'PAYÉ') {
        facture.status = 'ENVOYÉ';
      }

      // Trouver un contrat associé (c.clientNom === facture.clientNom && c.prestationDate === facture.datePrestation && c.status === 'EN_ATTENTE')
      // Si trouvé, changer son statut à "SIGNÉ"
      const contrat = data.contrats.find(c => 
        c.clientNom === facture.clientNom && 
        c.prestationDate === facture.datePrestation && 
        c.status === 'EN_ATTENTE'
      );
      if (contrat) {
        contrat.status = 'SIGNÉ';
      }
    }

    if (!rInput.id) {
      rInput.id = 'recette-' + generateUUID();
      data.recettes.push(rInput);
    } else {
      const idx = data.recettes.findIndex(r => r.id === rInput.id);
      if (idx !== -1) {
        data.recettes[idx] = rInput;
      } else {
        data.recettes.push(rInput);
      }
    }

    await writeData(data);
    return NextResponse.json(rInput);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error saving recette' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing recette id' }, { status: 400 });
    }

    const data = await readData();
    const recette = data.recettes.find(r => r.id === id);
    if (!recette) {
      return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 });
    }

    data.recettes = data.recettes.filter(r => r.id !== id);

    if (recette.numeroFacture && recette.numeroFacture.trim() !== '') {
      const facture = data.devisFactures.find(f => f.numero === recette.numeroFacture);
      if (facture) {
        // Recalculer le montant total déjà encaissé pour cette facture après suppression
        const dejaEncaisse = data.recettes
          .filter(r => r.numeroFacture === recette.numeroFacture)
          .reduce((sum, r) => sum + r.montantHt, 0);

        if (dejaEncaisse < facture.totalHt - 0.01 && facture.status === 'PAYÉ') {
          facture.status = 'ENVOYÉ';
        }

        if (dejaEncaisse < 0.01) {
          const contrat = data.contrats.find(c => 
            c.clientNom === facture.clientNom && 
            c.prestationDate === facture.datePrestation && 
            c.status === 'SIGNÉ'
          );
          if (contrat) {
            contrat.status = 'EN_ATTENTE';
          }
        }
      }
    }

    await writeData(data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error deleting recette' }, { status: 500 });
  }
}
