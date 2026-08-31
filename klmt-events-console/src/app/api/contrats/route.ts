export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { readData, writeData, generateUUID } from '@/lib/db';
import { Contrat } from '@/types';

export async function GET() {
  try {
    const data = await readData();
    return NextResponse.json(data.contrats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error reading contrats' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const contratInput: Contrat = await request.json();
    const data = await readData();

    if (!contratInput.id) {
      contratInput.id = 'contrat-' + generateUUID();
      data.contrats.push(contratInput);
    } else {
      const idx = data.contrats.findIndex(c => c.id === contratInput.id);
      if (idx !== -1) {
        data.contrats[idx] = contratInput;
      } else {
        data.contrats.push(contratInput);
      }
    }

    await writeData(data);
    return NextResponse.json(contratInput);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error saving contrat' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing contrat id' }, { status: 400 });
    }

    const data = await readData();
    const originalLen = data.contrats.length;
    data.contrats = data.contrats.filter(c => c.id !== id);

    if (data.contrats.length === originalLen) {
      return NextResponse.json({ error: 'Contrat not found' }, { status: 404 });
    }

    await writeData(data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error deleting contrat' }, { status: 500 });
  }
}
