export interface Client {
  id: string;
  nom: string;
  adresse: string;
  email: string;
  telephone: string;
}

export interface ItemDevis {
  designation: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
  montant: number;
}

export interface DevisFacture {
  id: string;
  numero: string;
  type: 'DEVIS' | 'FACTURE';
  dateEmission: string;
  datePrestation: string;
  clientNom: string;
  clientAdresse: string;
  validite: string;
  items: ItemDevis[];
  totalHt: number;
  totalTtc: number;
  acompte: number;
  status: string;
  modeReglement: string;
  rib: string;
}

export interface Contrat {
  id: string;
  dateContrat: string;
  clientNom: string;
  clientRepresentant: string;
  prestationDate: string;
  prestationHoraires: string;
  prestationTarif: number;
  prestationAcompte: number;
  prestationSolde: number;
  prestationTypeAmbiance: string;
  status: 'EN_ATTENTE' | 'SIGNÉ';
}

export interface Recette {
  id: string;
  dateEncaissement: string;
  numeroFacture: string;
  client: string;
  naturePrestation: string;
  montantHt: number;
  modeReglement: string;
}

export interface Indisponibilite {
  id: string;
  date: string; // Format "DD/MM/YYYY"
  motif: string;
}

export interface ManualTask {
  id: string;
  label: string;
  description?: string;
  date: string;
  severity: 'high' | 'warning' | 'info';
  type: '📌 Manuel';
}
