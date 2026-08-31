export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { readData, writeData, generateUUID } from '@/lib/db';
import { DevisFacture, Contrat } from '@/types';

export async function GET() {
  try {
    const data = await readData();
    return NextResponse.json(data.devisFactures);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error reading devis/factures' }, { status: 500 });
  }
}

function checkAndGenerateContract(devisFacture: DevisFacture, data: { contrats: Contrat[] }) {
  if (devisFacture.type === 'DEVIS' && devisFacture.status === 'VALIDÉ') {
    const contractExists = data.contrats.some(c =>
      c.clientNom === devisFacture.clientNom &&
      c.prestationDate === devisFacture.datePrestation
    );
    if (!contractExists) {
      const designationText = devisFacture.items?.map((it) => it.designation).join(', ') || 'Généraliste';
      let ambiance = designationText;
      if (ambiance.length > 100) {
        ambiance = ambiance.substring(0, 97) + '...';
      }
      const c: Contrat = {
        id: 'contrat-' + generateUUID(),
        dateContrat: devisFacture.dateEmission,
        clientNom: devisFacture.clientNom,
        clientRepresentant: '',
        prestationDate: devisFacture.datePrestation,
        prestationHoraires: '22h00 - 02h00',
        prestationTarif: devisFacture.totalTtc,
        prestationAcompte: devisFacture.acompte,
        prestationSolde: devisFacture.totalTtc - devisFacture.acompte,
        prestationTypeAmbiance: ambiance,
        status: 'EN_ATTENTE'
      };
      data.contrats.push(c);
    }
  }
}

export async function POST(request: Request) {
  try {
    const dfInput: DevisFacture = await request.json();
    const data = await readData();

    if (!dfInput.id) {
      dfInput.id = 'df-' + generateUUID();
      data.devisFactures.push(dfInput);
    } else {
      const idx = data.devisFactures.findIndex(df => df.id === dfInput.id);
      if (idx !== -1) {
        data.devisFactures[idx] = dfInput;
      } else {
        data.devisFactures.push(dfInput);
      }
    }

    checkAndGenerateContract(dfInput, data);
    await writeData(data);
    return NextResponse.json(dfInput);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error saving devis/facture' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing devis/facture id' }, { status: 400 });
    }

    const data = await readData();
    const originalLen = data.devisFactures.length;
    data.devisFactures = data.devisFactures.filter(df => df.id !== id);

    if (data.devisFactures.length === originalLen) {
      return NextResponse.json({ error: 'Devis/Facture not found' }, { status: 404 });
    }

    await writeData(data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error deleting devis/facture' }, { status: 500 });
  }
}
