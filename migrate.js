const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Fonction pour récupérer l'URI de connexion MongoDB depuis .env ou .env.local
function getMongoURI() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/MONGODB_URI=["']?([^"\n\s']+)["']?/);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  const envLocalPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf-8');
    const match = content.match(/MONGODB_URI=["']?([^"\n\s']+)["']?/);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return process.env.MONGODB_URI;
}

async function runMigration() {
  const uri = getMongoURI();
  if (!uri) {
    console.error("❌ MONGODB_URI introuvable. Assurez-vous d'avoir configuré le fichier .env ou .env.local dans le dossier klmt-events-console.");
    process.exit(1);
  }

  const jsonPath = path.join(__dirname, 'management_data.json');
  if (!fs.existsSync(jsonPath)) {
    console.error("❌ Fichier management_data.json introuvable à la racine.");
    process.exit(1);
  }

  console.log("📖 Lecture du fichier local management_data.json...");
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(rawData);

  console.log("🔌 Connexion à MongoDB Atlas...");
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log("✅ Connexion réussie à MongoDB Atlas !");
    const db = client.db('klmt-events');

    console.log("🔄 Début du téléversement des données locales...");

    // Clients
    if (data.clients && data.clients.length > 0) {
      console.log(`➡️ Téléversement de ${data.clients.length} clients...`);
      await db.collection('clients').deleteMany({});
      await db.collection('clients').insertMany(data.clients);
    }

    // Recettes
    if (data.recettes && data.recettes.length > 0) {
      console.log(`➡️ Téléversement de ${data.recettes.length} recettes...`);
      await db.collection('recettes').deleteMany({});
      await db.collection('recettes').insertMany(data.recettes);
    }

    // Devis & Factures
    if (data.devisFactures && data.devisFactures.length > 0) {
      console.log(`➡️ Téléversement de ${data.devisFactures.length} devis/factures...`);
      await db.collection('devisFactures').deleteMany({});
      await db.collection('devisFactures').insertMany(data.devisFactures);
    }

    // Contrats
    if (data.contrats && data.contrats.length > 0) {
      console.log(`➡️ Téléversement de ${data.contrats.length} contrats...`);
      await db.collection('contrats').deleteMany({});
      await db.collection('contrats').insertMany(data.contrats);
    }

    // Indisponibilités
    if (data.indisponibilites && data.indisponibilites.length > 0) {
      console.log(`➡️ Téléversement de ${data.indisponibilites.length} indisponibilités...`);
      await db.collection('indisponibilites').deleteMany({});
      await db.collection('indisponibilites').insertMany(data.indisponibilites);
    }

    // Tâches manuelles
    if (data.manualTasks && data.manualTasks.length > 0) {
      console.log(`➡️ Téléversement de ${data.manualTasks.length} tâches manuelles...`);
      await db.collection('manualTasks').deleteMany({});
      await db.collection('manualTasks').insertMany(data.manualTasks);
    }

    console.log("\n✨ MIGRATION RÉUSSIE AVEC SUCCÈS ! ✨");
    console.log("Toutes vos données locales (La laiterie, devis, contrats...) sont désormais enregistrées sur MongoDB Atlas dans la base 'klmt-events'.");
    console.log("Votre console Vercel est maintenant prête à s'afficher avec vos vraies données !");
  } catch (err) {
    console.error("❌ Une erreur est survenue lors de la migration :", err);
  } finally {
    await client.close();
  }
}

runMigration();
