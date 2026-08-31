import { NextResponse } from 'next/server';
import { readData, writeData, generateUUID } from '@/lib/db';
import { Indisponibilite } from '@/types';

export async function GET() {
  try {
    const data = await readData();
    return NextResponse.json(data.indisponibilites || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error reading indisponibilites' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const indispInput: Indisponibilite = await request.json();
    const data = await readData();
    
    if (!data.indisponibilites) {
      data.indisponibilites = [];
    }

    if (!indispInput.id) {
      indispInput.id = 'indisp-' + generateUUID();
      data.indisponibilites.push(indispInput);
    } else {
      const idx = data.indisponibilites.findIndex(i => i.id === indispInput.id);
      if (idx !== -1) {
        data.indisponibilites[idx] = indispInput;
      } else {
        data.indisponibilites.push(indispInput);
      }
    }

    await writeData(data);
    return NextResponse.json(indispInput);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error saving indisponibilite' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing indisponibilite id' }, { status: 400 });
    }

    const data = await readData();
    if (!data.indisponibilites) {
      data.indisponibilites = [];
    }
    
    const originalLen = data.indisponibilites.length;
    data.indisponibilites = data.indisponibilites.filter(i => i.id !== id);
    
    if (data.indisponibilites.length === originalLen) {
      return NextResponse.json({ error: 'Indisponibilite not found' }, { status: 404 });
    }

    await writeData(data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error deleting indisponibilite' }, { status: 500 });
  }
}
