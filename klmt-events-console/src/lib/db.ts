import { promises as fs } from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import { Client, DevisFacture, Contrat, Recette, Indisponibilite, ManualTask } from '../types';

export interface Data {
  clients: Client[];
  recettes: Recette[];
  devisFactures: DevisFacture[];
  contrats: Contrat[];
  indisponibilites?: Indisponibilite[]; // Optionnel pour rétrocompatibilité
  manualTasks?: ManualTask[]; // Nouveau champ centralisé
}

// Global cached MongoClient for serverless environments
let cachedMongoClient: MongoClient | null = null;

async function getMongoClient(): Promise<MongoClient> {
  if (cachedMongoClient) return cachedMongoClient;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined in your environment variables. Required for Cloud mode.");
  }
  cachedMongoClient = new MongoClient(uri);
  await cachedMongoClient.connect();
  return cachedMongoClient;
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
  const dbMode = process.env.DB_MODE || 'local';

  if (dbMode === 'cloud') {
    try {
      const client = await getMongoClient();
      const dbObj = client.db('klmt-events');
      
      const [clients, recettes, devisFactures, contrats, indisponibilites, manualTasks] = await Promise.all([
        dbObj.collection('clients').find({}).toArray(),
        dbObj.collection('recettes').find({}).toArray(),
        dbObj.collection('devisFactures').find({}).toArray(),
        dbObj.collection('contrats').find({}).toArray(),
        dbObj.collection('indisponibilites').find({}).toArray(),
        dbObj.collection('manualTasks').find({}).toArray(),
      ]);

      return {
        clients: (clients as any[]).map(({ _id, ...rest }) => rest) as Client[],
        recettes: (recettes as any[]).map(({ _id, ...rest }) => rest) as Recette[],
        devisFactures: (devisFactures as any[]).map(({ _id, ...rest }) => rest) as DevisFacture[],
        contrats: (contrats as any[]).map(({ _id, ...rest }) => rest) as Contrat[],
        indisponibilites: (indisponibilites as any[]).map(({ _id, ...rest }) => rest) as Indisponibilite[],
        manualTasks: (manualTasks as any[]).map(({ _id, ...rest }) => rest) as ManualTask[],
      };
    } catch (error) {
      console.error("Error reading from MongoDB Atlas, returning empty structure", error);
      return { clients: [], recettes: [], devisFactures: [], contrats: [], indisponibilites: [], manualTasks: [] };
    }
  }

  // Local fallback
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
      manualTasks: parsed.manualTasks || [],
    };
  } catch (error) {
    console.error("Error reading data file, returning empty structure", error);
    return { clients: [], recettes: [], devisFactures: [], contrats: [], indisponibilites: [], manualTasks: [] };
  }
}

// Serialized write queue to guarantee absence of corruption/race conditions in local mode
let writeQueue = Promise.resolve();

export async function writeData(data: Data): Promise<void> {
  const dbMode = process.env.DB_MODE || 'local';

  if (dbMode === 'cloud') {
    try {
      const client = await getMongoClient();
      const dbObj = client.db('klmt-events');

      // Sync local collections with Cloud database. Overwriting collections is extremely simple and fast for smaller datasets!
      await Promise.all([
        dbObj.collection('clients').deleteMany({}).then(async () => {
          if (data.clients.length > 0) await dbObj.collection('clients').insertMany(data.clients);
        }),
        dbObj.collection('recettes').deleteMany({}).then(async () => {
          if (data.recettes.length > 0) await dbObj.collection('recettes').insertMany(data.recettes);
        }),
        dbObj.collection('devisFactures').deleteMany({}).then(async () => {
          if (data.devisFactures.length > 0) await dbObj.collection('devisFactures').insertMany(data.devisFactures);
        }),
        dbObj.collection('contrats').deleteMany({}).then(async () => {
          if (data.contrats.length > 0) await dbObj.collection('contrats').insertMany(data.contrats);
        }),
        dbObj.collection('indisponibilites').deleteMany({}).then(async () => {
          if (data.indisponibilites && data.indisponibilites.length > 0) {
            await dbObj.collection('indisponibilites').insertMany(data.indisponibilites);
          }
        }),
        dbObj.collection('manualTasks').deleteMany({}).then(async () => {
          if (data.manualTasks && data.manualTasks.length > 0) {
            await dbObj.collection('manualTasks').insertMany(data.manualTasks);
          }
        }),
      ]);
      return;
    } catch (error) {
      console.error("Failed to write to MongoDB Atlas:", error);
      throw error;
    }
  }

  // Local mode
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
