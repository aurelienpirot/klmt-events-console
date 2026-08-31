import { promises as fs } from 'fs';
import path from 'path';
import { Client, DevisFacture, Contrat, Recette, Indisponibilite } from '../types';

export interface Data {
  clients: Client[];
  recettes: Recette[];
  devisFactures: DevisFacture[];
  contrats: Contrat[];
  indisponibilites?: Indisponibilite[]; // Optionnel pour rétrocompatibilité
}

function getDataFilePath() {
  const possiblePaths = [
    path.join(process.cwd(), '../management_data.json'),
    path.join(process.cwd(), 'management_data.json'),
    'C:/Scripts/gestion_dj/management_data.json'
  ];
  const fsSync = require('fs');
  for (const p of possiblePaths) {
    if (fsSync.existsSync(p)) {
      return p;
    }
  }
  return possiblePaths[0]; // fallback
}

export async function readData(): Promise<Data> {
  const filePath = getDataFilePath();
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    return {
      clients: parsed.clients || [],
      recettes: parsed.recettes || [],
      devisFactures: parsed.devisFactures || [],
      contrats: parsed.contrats || [],
      indisponibilites: parsed.indisponibilites || [],
    };
  } catch (error) {
    console.error("Error reading data file, returning empty structure", error);
    return { clients: [], recettes: [], devisFactures: [], contrats: [], indisponibilites: [] };
  }
}

// Serialized write queue to guarantee absence of corruption/race conditions
let writeQueue = Promise.resolve();

export async function writeData(data: Data): Promise<void> {
  const filePath = getDataFilePath();
  
  // Chain the write on the promise queue
  writeQueue = writeQueue.then(async () => {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }).catch((err) => {
    console.error("Error writing in write queue:", err);
  });
  
  return writeQueue;
}

// UUID generation using native crypto
import crypto from 'crypto';
export function generateUUID(): string {
  return crypto.randomUUID();
}
