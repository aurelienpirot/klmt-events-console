import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { ManualTask } from '@/types';

export async function GET() {
  try {
    const data = await readData();
    return NextResponse.json(data.manualTasks || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error reading manual tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tasks: ManualTask[] = await request.json();
    const data = await readData();

    // Replaces the local array of manual tasks with the newly updated array
    data.manualTasks = tasks;

    await writeData(data);
    return NextResponse.json(data.manualTasks);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error saving manual tasks' }, { status: 500 });
  }
}
