import { NextResponse } from 'next/server';
import { readData, writeData, generateUUID } from '@/lib/db';
import { Client } from '@/types';

export async function GET() {
  try {
    const data = await readData();
    return NextResponse.json(data.clients);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error reading clients' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const clientInput: Client = await request.json();
    const data = await readData();

    if (!clientInput.id) {
      clientInput.id = 'client-' + generateUUID();
      data.clients.push(clientInput);
    } else {
      const idx = data.clients.findIndex(c => c.id === clientInput.id);
      if (idx !== -1) {
        data.clients[idx] = clientInput;
      } else {
        data.clients.push(clientInput);
      }
    }

    await writeData(data);
    return NextResponse.json(clientInput);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error saving client' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing client id' }, { status: 400 });
    }

    const data = await readData();
    const originalLen = data.clients.length;
    data.clients = data.clients.filter(c => c.id !== id);
    
    if (data.clients.length === originalLen) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    await writeData(data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error deleting client' }, { status: 500 });
  }
}
