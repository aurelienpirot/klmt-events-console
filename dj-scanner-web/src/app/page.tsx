'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';

// GraphQL Definitions
const GET_FUZZY_CANDIDATES = gql`
  query GetFuzzyCandidates($minRatio: Float, $hideRemixes: Boolean, $search: String) {
    getFuzzyCandidates(minRatio: $minRatio, hideRemixes: $hideRemixes, search: $search) {
      id
      ratio
      differentRemix
      file1 {
        name
        path
        size
        sizeFormatted
      }
      file2 {
        name
        path
        size
        sizeFormatted
      }
    }
  }
`;

const GET_SCAN_STATUS = gql`
  query GetScanStatus {
    getScanStatus {
      scanning
      lastScanTime
      totalFiles
      totalPairs
    }
  }
`;

const GET_ALL_SCANNED_FILES = gql`
  query GetAllScannedFiles {
    getAllScannedFiles {
      name
      path
      size
      sizeFormatted
    }
  }
`;

const START_SCAN = gql`
  mutation StartScan {
    startScan {
      scanning
      lastScanTime
      totalFiles
      totalPairs
    }
  }
`;

const DELETE_FILE = gql`
  mutation DeleteFile($path: String!) {
    deleteFile(path: $path)
  }
`;

const RENAME_FILE = gql`
  mutation RenameFile($path: String!, $newName: String!) {
    renameFile(path: $path, newName: $newName)
  }
`;

const IGNORE_PAIR = gql`
  mutation IgnorePair($file1Path: String!, $file2Path: String!) {
    ignorePair(file1Path: $file1Path, file2Path: $file2Path)
  }
`;

const ANALYZE_FILE = gql`
  mutation AnalyzeFile($path: String!, $provider: String) {
    analyzeFile(path: $path, provider: $provider)
  }
`;

const SUGGEST_STYLE = gql`
  mutation SuggestStyle($name: String!, $path: String!) {
    suggestStyle(name: $name, path: $path) {
      recommendedStyle
      explanation
      isCorrect
    }
  }
`;

const GET_ALL_CLIENTS = gql`
  query GetAllClients {
    getAllClients {
      id
      nom
      adresse
      email
      telephone
    }
  }
`;

const GET_ALL_RECETTES = gql`
  query GetAllRecettes {
    getAllRecettes {
      id
      dateEncaissement
      numeroFacture
      client
      naturePrestation
      montantHt
      modeReglement
    }
  }
`;

const GET_ALL_DEVIS_FACTURES = gql`
  query GetAllDevisFactures {
    getAllDevisFactures {
      id
      numero
      type
      dateEmission
      datePrestation
      clientNom
      clientAdresse
      validite
      items {
        designation
        quantite
        unite
        prixUnitaire
        montant
      }
      totalHt
      totalTtc
      acompte
      status
      modeReglement
      rib
    }
  }
`;

const GET_ALL_CONTRATS = gql`
  query GetAllContrats {
    getAllContrats {
      id
      dateContrat
      clientNom
      clientRepresentant
      prestationDate
      prestationHoraires
      prestationTarif
      prestationAcompte
      prestationSolde
      prestationTypeAmbiance
      status
    }
  }
`;

const SAVE_CLIENT = gql`
  mutation SaveClient($client: ClientInput!) {
    saveClient(client: $client) {
      id
      nom
      adresse
      email
      telephone
    }
  }
`;

const DELETE_CLIENT = gql`
  mutation DeleteClient($id: ID!) {
    deleteClient(id: $id)
  }
`;

const SAVE_RECETTE = gql`
  mutation SaveRecette($recette: RecetteInput!) {
    saveRecette(recette: $recette) {
      id
      dateEncaissement
      numeroFacture
      client
      naturePrestation
      montantHt
      modeReglement
    }
  }
`;

const DELETE_RECETTE = gql`
  mutation DeleteRecette($id: ID!) {
    deleteRecette(id: $id)
  }
`;

const SAVE_DEVIS_FACTURE = gql`
  mutation SaveDevisFacture($devisFacture: DevisFactureInput!) {
    saveDevisFacture(devisFacture: $devisFacture) {
      id
      numero
      type
      dateEmission
      datePrestation
      clientNom
      clientAdresse
      validite
      items {
        designation
        quantite
        unite
        prixUnitaire
        montant
      }
      totalHt
      totalTtc
      acompte
      status
      modeReglement
      rib
    }
  }
`;

const DELETE_DEVIS_FACTURE = gql`
  mutation DeleteDevisFacture($id: ID!) {
    deleteDevisFacture(id: $id)
  }
`;

const SAVE_CONTRAT = gql`
  mutation SaveContrat($contrat: ContratInput!) {
    saveContrat(contrat: $contrat) {
      id
      dateContrat
      clientNom
      clientRepresentant
      prestationDate
      prestationHoraires
      prestationTarif
      prestationAcompte
      prestationSolde
      prestationTypeAmbiance
      status
    }
  }
`;

const DELETE_CONTRAT = gql`
  mutation DeleteContrat($id: ID!) {
    deleteContrat(id: $id)
  }
`;

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface StyleSuggestion {
  recommendedStyle: string;
  explanation: string;
  isCorrect: boolean;
  loading: boolean;
}

export default function Home() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'explorer' | 'duplicates' | 'analyzer' | 'reclassify' | 'management'>('dashboard');
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [searchExplorer, setSearchExplorer] = useState<string>('');

  // Management States
  const [mgmtSubTab, setMgmtSubTab] = useState<'dashboard' | 'clients' | 'documents' | 'contrats' | 'encaissements'>('dashboard');
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Manual Tasks State
  const [manualTasks, setManualTasks] = useState<{ id: string; label: string; date: string; type: string; severity: 'high' | 'warning' | 'info' }[]>([]);
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('2026-07-30');
  const [newTaskSeverity, setNewTaskSeverity] = useState<'high' | 'warning' | 'info'>('warning');
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);

  // Load manual tasks on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('klmt_manual_tasks');
      if (stored) {
        try {
          setManualTasks(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Helper to save manual tasks
  const saveManualTasks = (tasks: any[]) => {
    setManualTasks(tasks);
    if (typeof window !== 'undefined') {
      localStorage.setItem('klmt_manual_tasks', JSON.stringify(tasks));
    }
  };

  const handleAddManualTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskLabel.trim()) return;

    let taskDate = newTaskDate;
    if (!taskDate) {
      const todayObj = new Date(2026, 6, 30);
      const d = String(todayObj.getDate()).padStart(2, '0');
      const m = String(todayObj.getMonth() + 1).padStart(2, '0');
      const y = todayObj.getFullYear();
      taskDate = `${d}/${m}/${y}`;
    } else {
      const parts = taskDate.split('-');
      if (parts.length === 3) {
        taskDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    const newTask = {
      id: `manual-${Date.now()}`,
      label: newTaskLabel.trim(),
      date: taskDate,
      type: '📌 Manuel',
      severity: newTaskSeverity
    };

    saveManualTasks([...manualTasks, newTask]);
    setNewTaskLabel('');
    setNewTaskDate('2026-07-30');
    setNewTaskSeverity('warning');
    setShowAddTaskForm(false);
    addToast('Tâche ajoutée avec succès !', 'success');
  };

  const handleDeleteManualTask = (id: string) => {
    const updated = manualTasks.filter(t => t.id !== id);
    saveManualTasks(updated);
    addToast('Tâche accomplie !', 'success');
  };
  
  // Client Modal/Form State
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [clientForm, setClientForm] = useState({ nom: '', adresse: '', email: '', telephone: '' });

  // Recette Modal/Form State
  const [recetteModalOpen, setRecetteModalOpen] = useState(false);
  const [editingRecette, setEditingRecette] = useState<any>(null);
  const [recetteForm, setRecetteForm] = useState({ dateEncaissement: '', numeroFacture: '', client: '', naturePrestation: '', montantHt: 0, modeReglement: 'Virement' });

  // Devis/Facture Modal/Form State
  const [dfModalOpen, setDevisFactureModalOpen] = useState(false);
  const [editingDf, setEditingDevisFacture] = useState<any>(null);
  const [dfForm, setDevisFactureForm] = useState<any>({
    numero: '',
    type: 'DEVIS',
    dateEmission: '',
    datePrestation: '',
    clientNom: '',
    clientAdresse: '',
    validite: '',
    items: [],
    totalHt: 0,
    totalTtc: 0,
    acompte: 0,
    status: 'BROUILLON',
    modeReglement: 'Virement',
    rib: '[Insérer RIB Revolut / N26 de Clément]'
  });
  // Item edit state for inside Devis/Facture editor
  const [newItemForm, setNewItemForm] = useState({ designation: '', quantite: 1, unite: 'Forfait', prixUnitaire: 0 });

  // View/Print Modals
  const [dfViewModalOpen, setDfViewModalOpen] = useState(false);
  const [viewingDf, setViewingDf] = useState<any>(null);

  // Contrat Modal/Form State
  const [contratModalOpen, setContratModalOpen] = useState(false);
  const [editingContrat, setEditingContrat] = useState<any>(null);
  const [contratForm, setContratForm] = useState({
    dateContrat: '',
    clientNom: '',
    clientRepresentant: '',
    prestationDate: '',
    prestationHoraires: '22h00 - 02h00',
    prestationTarif: 250,
    prestationAcompte: 75,
    prestationSolde: 175,
    prestationTypeAmbiance: 'Généraliste, House',
    status: 'EN_ATTENTE'
  });
  const [contratViewModalOpen, setContratViewModalOpen] = useState(false);
  const [viewingContrat, setViewingContrat] = useState<any>(null);

  // AI Analyzer States
  const [analysisSource, setAnalysisSource] = useState<'scanned' | 'local'>('scanned');
  const [selectedFileForAnalysis, setSelectedFileForAnalysis] = useState<string>('');
  const [customLocalPath, setCustomLocalPath] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisProvider, setAnalysisProvider] = useState<'gemini' | 'openai'>('gemini');
  const [analysisHistory, setAnalysisHistory] = useState<Record<string, string>>({});

  // AI Reclassification Tab States
  const [suggestions, setSuggestions] = useState<Record<string, StyleSuggestion>>({});
  const [suggestionsLoaded, setSuggestionsLoaded] = useState<boolean>(false);
  const [batchAnalyzing, setBatchAnalyzing] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<number>(0);
  const [selectedFoldersForAnalysis, setSelectedFoldersForAnalysis] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const cancelBatchRef = useRef<boolean>(false);
  const hasInitializedFoldersRef = useRef<boolean>(false);
  const [historyLoaded, setHistoryLoaded] = useState<boolean>(false);

  // Filters & State (Duplicates Tab)
  const [minRatio, setMinRatio] = useState<number>(75);
  const [hideRemixes, setHideRemixes] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [auditSubTab, setAuditSubTab] = useState<'unclassified' | 'nonstandard' | 'mismatches'>('unclassified');
  
  // Modals & Temp States
  const [renameModalOpen, setRenameModalOpen] = useState<boolean>(false);
  const [fileToRename, setFileToRename] = useState<{ path: string; name: string } | null>(null);
  const [newNameInput, setNewNameInput] = useState<string>('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [prevScanning, setPrevScanning] = useState<boolean>(false);

  // Helper formatting function for Bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Octets';
    const k = 1024;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper to extract style from path (parent folder name)
  const getStyleFromPath = (path: string) => {
    const cleanPath = path.replace(/\\/g, '/');
    const segments = cleanPath.split('/');
    if (segments.length > 1) {
      return segments[0];
    }
    return 'Général';
  };

  // Apollo Hooks & Queries
  const { data: statusData, refetch: refetchStatus } = useQuery(GET_SCAN_STATUS, {
    pollInterval: 3000, // Poll status every 3 seconds to update progress / scan indicator
  });

  const { data: candidatesData, loading: loadingCandidates, refetch: refetchCandidates } = useQuery(
    GET_FUZZY_CANDIDATES,
    {
      variables: {
        minRatio: minRatio / 100,
        hideRemixes,
        search,
      },
    }
  );

  const { data: filesData, loading: loadingFiles, refetch: refetchFiles } = useQuery(
    GET_ALL_SCANNED_FILES
  );

  const scanStatus = statusData?.getScanStatus;
  const scanning = scanStatus?.scanning;

  // Data Processing (Derived States)
  const candidates = candidatesData?.getFuzzyCandidates || [];
  const scannedFiles = filesData?.getAllScannedFiles || [];

  // Group files by Style
  const stylesMap: Record<string, any[]> = {};
  scannedFiles.forEach((file: any) => {
    const style = getStyleFromPath(file.path);
    if (!stylesMap[style]) {
      stylesMap[style] = [];
    }
    stylesMap[style].push(file);
  });

  const stylesList = Object.keys(stylesMap).sort().map((styleName) => {
    const files = stylesMap[styleName];
    const totalSize = files.reduce((sum: number, f: any) => sum + f.size, 0);
    return {
      name: styleName,
      files,
      count: files.length,
      size: totalSize
    };
  });

  // Calculate global statistics
  const totalTracks = scannedFiles.length;
  const totalLibrarySize = scannedFiles.reduce((sum: number, f: any) => sum + f.size, 0);

  // Group by formats
  const formatsMap: Record<string, number> = {};
  scannedFiles.forEach((file: any) => {
    const ext = file.name.split('.').pop()?.toUpperCase() || 'INCONNU';
    formatsMap[ext] = (formatsMap[ext] || 0) + 1;
  });

  const formatsList = Object.keys(formatsMap).sort().map((ext) => ({
    name: ext,
    count: formatsMap[ext],
    percentage: totalTracks > 0 ? Math.round((formatsMap[ext] / totalTracks) * 100) : 0
  }));

  // Counts for critical highlights
  const criticalCount = candidates.filter((c: any) => c.ratio >= 0.90).length;
  const formatDiffCount = candidates.filter((c: any) => {
    const ext1 = c.file1.name.split('.').pop()?.toLowerCase();
    const ext2 = c.file2.name.split('.').pop()?.toLowerCase();
    return ext1 !== ext2;
  }).length;

  // --- Classification Audit Calculations ---
  // 1. Unclassified tracks (located in root / Général directory)
  const unclassifiedTracks = scannedFiles.filter((f: any) => getStyleFromPath(f.path) === 'Général');

  // React to scan completion to refresh results automatically
  useEffect(() => {
    if (prevScanning && !scanning) {
      addToast('Scan FTP terminé avec succès ! Mise à jour des résultats...', 'success');
      refetchCandidates();
      refetchFiles();
    }
    setPrevScanning(!!scanning);
  }, [scanning, prevScanning]);

  // Load suggestions from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dj_scanner_ai_suggestions');
      if (saved) {
        try {
          setSuggestions(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse saved AI suggestions", e);
        }
      }
      setSuggestionsLoaded(true);
    }
  }, []);

  // Save suggestions to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && suggestionsLoaded) {
      localStorage.setItem('dj_scanner_ai_suggestions', JSON.stringify(suggestions));
    }
  }, [suggestions, suggestionsLoaded]);

  // Load history from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dj_scanner_analysis_history');
      if (saved) {
        try {
          setAnalysisHistory(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse saved analysis history", e);
        }
      }
      setHistoryLoaded(true);
    }
  }, []);

  // Save history to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined' && historyLoaded) {
      localStorage.setItem('dj_scanner_analysis_history', JSON.stringify(analysisHistory));
    }
  }, [analysisHistory, historyLoaded]);

  // React to file selection change to automatically load past analysis if present
  useEffect(() => {
    const targetPath = analysisSource === 'scanned' ? selectedFileForAnalysis : customLocalPath.trim();
    if (targetPath && analysisHistory[targetPath]) {
      setAnalysisResult(analysisHistory[targetPath]);
    } else {
      setAnalysisResult('');
    }
  }, [selectedFileForAnalysis, customLocalPath, analysisSource, analysisHistory]);

  // Handle folder selection for batch analysis
  const handleToggleFolder = (folderName: string) => {
    setSelectedFoldersForAnalysis((prev) =>
      prev.includes(folderName)
        ? prev.filter((name) => name !== folderName)
        : [...prev, folderName]
    );
  };

  const handleToggleSelectAllFolders = () => {
    if (selectedFoldersForAnalysis.length === stylesList.length) {
      setSelectedFoldersForAnalysis([]);
    } else {
      setSelectedFoldersForAnalysis(stylesList.map((s) => s.name));
    }
  };

  // Initialize selected folders with all folder names on first load
  useEffect(() => {
    if (stylesList.length > 0 && !hasInitializedFoldersRef.current) {
      setSelectedFoldersForAnalysis(stylesList.map((s) => s.name));
      hasInitializedFoldersRef.current = true;
    }
  }, [stylesList]);

  // Derived list of files to analyze based on selected folders
  const filesToAnalyze = scannedFiles.filter((file: any) => {
    const folderName = getStyleFromPath(file.path);
    return selectedFoldersForAnalysis.includes(folderName);
  });

  // Management Queries
  const { data: clientsData, refetch: refetchClients } = useQuery(GET_ALL_CLIENTS);
  const { data: recettesData, refetch: refetchRecettes } = useQuery(GET_ALL_RECETTES);
  const { data: devisFacturesData, refetch: refetchDevisFactures } = useQuery(GET_ALL_DEVIS_FACTURES);
  const { data: contratsData, refetch: refetchContrats } = useQuery(GET_ALL_CONTRATS);

  const clients = clientsData?.getAllClients || [];
  const recettes = recettesData?.getAllRecettes || [];
  const devisFactures = devisFacturesData?.getAllDevisFactures || [];
  const contrats = contratsData?.getAllContrats || [];

  // Management Mutations
  const [saveClient] = useMutation(SAVE_CLIENT, {
    refetchQueries: [{ query: GET_ALL_CLIENTS }],
    onCompleted: () => addToast('Client enregistré avec succès !', 'success'),
    onError: (err) => addToast(`Erreur client : ${err.message}`, 'error')
  });

  const [deleteClient] = useMutation(DELETE_CLIENT, {
    refetchQueries: [{ query: GET_ALL_CLIENTS }],
    onCompleted: () => addToast('Client supprimé avec succès !', 'success'),
    onError: (err) => addToast(`Erreur suppression : ${err.message}`, 'error')
  });

  const [saveRecette] = useMutation(SAVE_RECETTE, {
    refetchQueries: [{ query: GET_ALL_RECETTES }, { query: GET_ALL_DEVIS_FACTURES }],
    onCompleted: () => addToast('Encaissement enregistré avec succès !', 'success'),
    onError: (err) => addToast(`Erreur compta : ${err.message}`, 'error')
  });

  const [deleteRecette] = useMutation(DELETE_RECETTE, {
    refetchQueries: [{ query: GET_ALL_RECETTES }, { query: GET_ALL_DEVIS_FACTURES }],
    onCompleted: () => addToast('Encaissement supprimé avec succès !', 'success'),
    onError: (err) => addToast(`Erreur suppression : ${err.message}`, 'error')
  });

  const [saveDevisFacture] = useMutation(SAVE_DEVIS_FACTURE, {
    refetchQueries: [{ query: GET_ALL_DEVIS_FACTURES }],
    onCompleted: () => addToast('Document enregistré avec succès !', 'success'),
    onError: (err) => addToast(`Erreur document : ${err.message}`, 'error')
  });

  const [deleteDevisFacture] = useMutation(DELETE_DEVIS_FACTURE, {
    refetchQueries: [{ query: GET_ALL_DEVIS_FACTURES }],
    onCompleted: () => addToast('Document supprimé avec succès !', 'success'),
    onError: (err) => addToast(`Erreur suppression : ${err.message}`, 'error')
  });

  const [saveContrat] = useMutation(SAVE_CONTRAT, {
    refetchQueries: [{ query: GET_ALL_CONTRATS }],
    onCompleted: () => addToast('Contrat enregistré avec succès !', 'success'),
    onError: (err) => addToast(`Erreur contrat : ${err.message}`, 'error')
  });

  const [deleteContrat] = useMutation(DELETE_CONTRAT, {
    refetchQueries: [{ query: GET_ALL_CONTRATS }],
    onCompleted: () => addToast('Contrat supprimé avec succès !', 'success'),
    onError: (err) => addToast(`Erreur suppression : ${err.message}`, 'error')
  });

  const [startScan, { loading: scanningInitiating }] = useMutation(START_SCAN, {
    onCompleted: (data) => {
      addToast('Scan FTP démarré en arrière-plan...', 'info');
      refetchStatus();
    },
    onError: (err) => {
      addToast(`Erreur au démarrage du scan : ${err.message}`, 'error');
    }
  });

  const [deleteFile] = useMutation(DELETE_FILE, {
    refetchQueries: [
      { query: GET_FUZZY_CANDIDATES, variables: { minRatio: minRatio / 100, hideRemixes, search } },
      { query: GET_ALL_SCANNED_FILES }
    ],
    onCompleted: (data) => {
      if (data.deleteFile) {
        addToast('Fichier supprimé du serveur FTP avec succès !', 'success');
      } else {
        addToast('Échec de la suppression du fichier.', 'error');
      }
    },
    onError: (err) => addToast(`Erreur de suppression : ${err.message}`, 'error')
  });

  const [renameFile] = useMutation(RENAME_FILE, {
    refetchQueries: [
      { query: GET_FUZZY_CANDIDATES, variables: { minRatio: minRatio / 100, hideRemixes, search } },
      { query: GET_ALL_SCANNED_FILES }
    ],
    onCompleted: (data) => {
      if (data.renameFile) {
        addToast('Fichier traité avec succès !', 'success');
        setRenameModalOpen(false);
      } else {
        addToast('Échec du traitement.', 'error');
      }
    },
    onError: (err) => addToast(`Erreur : ${err.message}`, 'error')
  });

  const [ignorePair] = useMutation(IGNORE_PAIR, {
    refetchQueries: [{ query: GET_FUZZY_CANDIDATES, variables: { minRatio: minRatio / 100, hideRemixes, search } }],
    onCompleted: (data) => {
      if (data.ignorePair) {
        addToast('Paire masquée (ignorée) avec succès.', 'success');
      }
    },
    onError: (err) => addToast(`Erreur : ${err.message}`, 'error')
  });

  const [analyzeFileMutation] = useMutation(ANALYZE_FILE, {
    onError: (err) => {
      setAnalyzing(false);
      addToast(`Erreur d'analyse : ${err.message}`, 'error');
      setAnalysisResult(`Une erreur s'est produite lors de l'analyse :\n\n${err.message}`);
    }
  });

  const [suggestStyleMutation] = useMutation(SUGGEST_STYLE, {
    onError: (err) => {
      addToast(`Erreur de suggestion : ${err.message}`, 'error');
    }
  });

  const [exportAppMutation] = useMutation(gql`
    mutation ExportApp {
      exportApp
    }
  `, {
    onCompleted: (data) => {
      if (data.exportApp) {
        addToast(`Archive d'export générée avec succès ! Fichier : ${data.exportApp}`, 'success');
        alert(`🎉 Exportation réussie !\n\nL'archive ZIP légère et horodatée a été créée dans votre dossier de projet :\n📁 ${data.exportApp}`);
      }
    },
    onError: (err) => {
      addToast(`Erreur d'exportation : ${err.message}`, 'error');
    }
  });

  // Toast System
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Actions
  const handleStartScan = () => {
    startScan();
  };

  const handleDelete = (path: string, name: string) => {
    if (confirm(`Êtes-vous sûr de vouloir SUPPRIMER définitivement ce fichier sur le FTP ?\n\n📁 ${name}`)) {
      deleteFile({ variables: { path } });
    }
  };

  const handleOpenRename = (path: string, name: string) => {
    setFileToRename({ path, name });
    setNewNameInput(name);
    setRenameModalOpen(true);
  };

  const handleRenameSubmit = () => {
    if (fileToRename && newNameInput.trim() && newNameInput.trim() !== fileToRename.name) {
      renameFile({ variables: { path: fileToRename.path, newName: newNameInput.trim() } });
    }
  };

  const handleIgnore = (file1Path: string, file2Path: string) => {
    ignorePair({ variables: { file1Path, file2Path } });
  };

  const handleStartAnalysis = () => {
    const targetPath = analysisSource === 'scanned' ? selectedFileForAnalysis : customLocalPath.trim();
    if (!targetPath) {
      addToast('Veuillez sélectionner ou saisir un fichier à analyser.', 'error');
      return;
    }
    
    setAnalyzing(true);
    setAnalysisResult('');
    addToast(`Lancement de l'analyse ${analysisProvider === 'gemini' ? 'Gemini Pro' : 'OpenAI'} (cela peut prendre de 1 à 3 minutes)...`, 'info');
    analyzeFileMutation({ variables: { path: targetPath, provider: analysisProvider } });
  };

  const handleSuggestStyle = async (name: string, path: string): Promise<any> => {
    // Marquer comme chargement pour ce fichier spécifique
    setSuggestions((prev) => ({
      ...prev,
      [path]: { recommendedStyle: '', explanation: '', isCorrect: false, loading: true }
    }));
    
    try {
      const { data } = await suggestStyleMutation({ variables: { name, path } });
      if (data && data.suggestStyle) {
        const result = {
          recommendedStyle: data.suggestStyle.recommendedStyle,
          explanation: data.suggestStyle.explanation,
          isCorrect: data.suggestStyle.isCorrect,
          loading: false
        };
        setSuggestions((prev) => ({
          ...prev,
          [path]: result
        }));
        return result;
      }
    } catch (err) {
      setSuggestions((prev) => {
        const copy = { ...prev };
        delete copy[path];
        return copy;
      });
    }
    return null;
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleStartBatchAnalysis = async () => {
    if (filesToAnalyze.length === 0) {
      addToast("Veuillez sélectionner au moins un dossier à analyser.", "error");
      return;
    }
    
    setBatchAnalyzing(true);
    setBatchProgress(0);
    cancelBatchRef.current = false;
    addToast(`Analyse par lot de ${filesToAnalyze.length} morceau(x) démarrée...`, "info");

    for (let i = 0; i < filesToAnalyze.length; i++) {
      if (cancelBatchRef.current) {
        addToast("Analyse par lot interrompue par l'utilisateur.", "info");
        break;
      }

      const file = filesToAnalyze[i];

      // Sauter si déjà analysé
      if (suggestions[file.path] && !suggestions[file.path].loading) {
        setBatchProgress(i + 1);
        continue;
      }

      // Appeler l'IA pour suggérer le style
      const result = await handleSuggestStyle(file.name, file.path);
      
      // Si l'analyse a échoué (limite de requêtes OpenAI ou erreur réseau)
      if (!result) {
        addToast("Échec de l'analyse pour ce morceau. Pause de 5 secondes...", "error");
        await sleep(5000); // Attendre 5 secondes que la limite se réinitialise
        
        // Nouvelle tentative
        const retryResult = await handleSuggestStyle(file.name, file.path);
        if (!retryResult) {
          addToast("Analyse interrompue : limite de requêtes (Rate Limit) d'OpenAI atteinte ou clé invalide. Veuillez réessayer dans quelques minutes.", "error");
          break; // Arrêter complètement le lot pour ne pas faillir en boucle
        }
      }

      setBatchProgress(i + 1);
      
      // Petite pause de refroidissement de 1.2 seconde entre chaque appel pour éviter de saturer l'API OpenAI
      await sleep(1200);
    }

    setBatchAnalyzing(false);
    addToast("Analyse globale terminée avec succès !", "success");
  };

  const handleStopBatchAnalysis = () => {
    cancelBatchRef.current = true;
  };

  const handleMoveFile = (file: any, destStyle: string) => {
    const originalName = file.name;
    const newRelativePath = destStyle + '/' + originalName;

    if (confirm(`Déplacer le morceau vers le répertoire de style "${destStyle}" ?\n\n📁 ${file.name}\n📂 Nouveau chemin : ${newRelativePath}`)) {
      renameFile({
        variables: { path: file.path, newName: newRelativePath },
        onCompleted: (data) => {
          if (data && data.renameFile) {
            setSuggestions((prev) => {
              const copy = { ...prev };
              delete copy[file.path];
              return copy;
            });
            addToast('Morceau déplacé avec succès !', 'success');
          } else {
            addToast('Échec du déplacement sur le serveur.', 'error');
          }
        }
      });
    }
  };

  const handleExportApp = () => {
    if (confirm("Générer une archive ZIP légère, datée et horodatée d'exportation pour un autre utilisateur ?")) {
      addToast("Génération de l'archive en cours (PowerShell)...", "info");
      exportAppMutation();
    }
  };

  const handleExportPDF = () => {
    if (!analysisResult) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast("Veuillez autoriser les fenêtres contextuelles (pop-ups) pour exporter le PDF.", "error");
      return;
    }
    
    const targetPath = analysisSource === 'scanned' ? selectedFileForAnalysis : customLocalPath.trim();
    const fileName = targetPath.substring(Math.max(targetPath.lastIndexOf('/'), targetPath.lastIndexOf('\\')) + 1);

    printWindow.document.write(`
      <html>
        <head>
          <title>Rapport d'Analyse DJ - ${fileName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1f2328;
              line-height: 1.6;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              border-bottom: 2px solid #e040fb;
              padding-bottom: 15px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0 0 10px 0;
              color: #8e24aa;
              font-size: 24px;
            }
            .header .meta {
              font-size: 14px;
              color: #57606a;
              line-height: 1.5;
            }
            .content {
              white-space: pre-wrap;
              font-size: 15px;
              color: #1f2328;
            }
            footer {
              margin-top: 50px;
              border-top: 1px solid #d0d7de;
              padding-top: 15px;
              font-size: 12px;
              color: #57606a;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔮 Rapport d'Analyse Musicale DJ</h1>
            <div class="meta">
              <strong>Fichier :</strong> ${fileName}<br/>
              <strong>Date d'analyse :</strong> ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}<br/>
              <strong>Technologie :</strong> Gemini Pro AI Assistant
            </div>
          </div>
          <div class="content">${analysisResult}</div>
          <footer>Généré automatiquement par DJ Music Suite & Style Classifier</footer>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportReclassifyPDF = () => {
    if (stylesList.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast("Veuillez autoriser les fenêtres contextuelles (pop-ups) pour exporter le PDF.", "error");
      return;
    }

    const totalAll = foldersAuditList.reduce((sum, f) => sum + f.total, 0);
    const totalOk = foldersAuditList.reduce((sum, f) => sum + f.okCount, 0);
    const totalKo = foldersAuditList.reduce((sum, f) => sum + f.koCount, 0);
    const totalUnanalyzed = foldersAuditList.reduce((sum, f) => sum + f.unanalyzedCount, 0);

    let foldersHtml = '';
    foldersAuditList.forEach((folder) => {
      const pct = folder.total > 0 ? Math.round(((folder.okCount + folder.koCount) / folder.total) * 100) : 0;
      foldersHtml += `
        <div class="folder-block">
          <h3>📁 Répertoire : ${folder.name}</h3>
          <div class="folder-meta">
            Total : <strong>${folder.total}</strong> |
            <span class="text-ok">✓ OK : ${folder.okCount}</span> |
            <span class="text-ko">⚠️ KO : ${folder.koCount}</span> |
            <span class="text-muted">Non analysés : ${folder.unanalyzedCount}</span> |
            <strong>Progression : ${pct}%</strong>
          </div>
      `;

      if (folder.koCount > 0) {
        foldersHtml += `
          <table class="ko-table">
            <thead>
              <tr>
                <th style="width: 40%;">Morceau</th>
                <th style="width: 25%;">Dossier Conseillé</th>
                <th style="width: 35%;">Explication de l'IA</th>
              </tr>
            </thead>
            <tbody>
        `;
        folder.koFiles.forEach(({ file, sug }) => {
          foldersHtml += `
            <tr>
              <td><strong>🎵 ${file.name}</strong><br/><small style="color: #57606a;">${file.path}</small></td>
              <td><span class="badge-dest">${sug.recommendedStyle}</span></td>
              <td><em>${sug.explanation}</em></td>
            </tr>
          `;
        });
        foldersHtml += `
            </tbody>
          </table>
        `;
      } else if (folder.unanalyzedCount === folder.total) {
        foldersHtml += `<p class="text-muted" style="margin-top: 10px; font-style: italic;">⚠️ Aucun fichier n'a encore été analysé dans ce répertoire. Lancez l'analyse par lot pour auditer ce dossier.</p>`;
      } else {
        foldersHtml += `<p class="text-ok" style="margin-top: 10px; font-weight: bold;">✓ Tous les fichiers analysés dans ce répertoire sont parfaitement classés !</p>`;
      }
      foldersHtml += `</div>`;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Bilan de Classification IA - DJ Music Suite</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1f2328;
              line-height: 1.6;
              padding: 40px;
              max-width: 900px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              border-bottom: 3px solid #8e24aa;
              padding-bottom: 15px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0 0 10px 0;
              color: #8e24aa;
              font-size: 26px;
            }
            .header .meta {
              font-size: 14px;
              color: #57606a;
              line-height: 1.5;
            }
            .stats-summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 35px;
            }
            .stat-box {
              background-color: #f6f8fa;
              border: 1px solid #d0d7de;
              border-radius: 6px;
              padding: 15px;
              text-align: center;
            }
            .stat-box .value {
              font-size: 22px;
              font-weight: bold;
              color: #1f2328;
            }
            .stat-box .label {
              font-size: 12px;
              color: #57606a;
              margin-top: 5px;
            }
            .folder-block {
              background-color: #ffffff;
              border: 1px solid #d0d7de;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .folder-block h3 {
              margin: 0 0 10px 0;
              color: #8e24aa;
              font-size: 18px;
              border-bottom: 1px solid #e1e4e8;
              padding-bottom: 5px;
            }
            .folder-meta {
              font-size: 13px;
              color: #57606a;
              margin-bottom: 15px;
            }
            .text-ok { color: #1a7f37; }
            .text-ko { color: #d1242f; }
            .text-muted { color: #57606a; }
            .ko-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 13px;
            }
            .ko-table th, .ko-table td {
              border: 1px solid #d0d7de;
              padding: 10px;
              text-align: left;
            }
            .ko-table th {
              background-color: #f6f8fa;
              font-weight: bold;
            }
            .badge-dest {
              background-color: #f1f8ff;
              color: #0366d6;
              padding: 3px 8px;
              border-radius: 3px;
              font-weight: bold;
              border: 1px solid #c8e1ff;
            }
            footer {
              margin-top: 60px;
              border-top: 1px solid #d0d7de;
              padding-top: 15px;
              font-size: 12px;
              color: #57606a;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🧠 Bilan de Classification & Rangement IA DJ</h1>
            <div class="meta">
              <strong>Serveur NAS :</strong> FTP 192.168.0.12<br/>
              <strong>Date d'export :</strong> ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}<br/>
              <strong>Assistant de tri :</strong> gpt-4o-mini Style Classifier
            </div>
          </div>

          <div class="stats-summary">
            <div class="stat-box">
              <div class="value">${totalAll}</div>
              <div class="label">Pistes Indexées</div>
            </div>
            <div class="stat-box">
              <div class="value" style="color: #1a7f37;">${totalOk}</div>
              <div class="label">✓ Classés OK</div>
            </div>
            <div class="stat-box">
              <div class="value" style="color: #d1242f;">${totalKo}</div>
              <div class="label">⚠️ À Reclasser (KO)</div>
            </div>
            <div class="stat-box">
              <div class="value" style="color: #57606a;">${totalUnanalyzed}</div>
              <div class="label">Non Analysés</div>
            </div>
          </div>

          <h2>📋 Détails de l'Audit par Répertoire</h2>
          ${foldersHtml}

          <footer>Généré automatiquement par DJ Music Suite & Style Classifier</footer>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 2. Non-standardized names (missing ' - ')
  const nonStandardizedTracks = scannedFiles.filter((f: any) => !f.name.includes(' - '));

  // 3. Suspect style mismatches (e.g. 'techno' inside a file inside 'house' folder, etc.)
  const styleMismatches = scannedFiles.filter((f: any) => {
    const style = getStyleFromPath(f.path).toLowerCase();
    const name = f.name.toLowerCase();
    
    if (style === 'house') {
      return name.includes('techno') || name.includes('trance') || name.includes('hardstyle') || name.includes('rap') || name.includes('hiphop');
    }
    if (style === 'classic' || style === 'vintage') {
      return name.includes('club mix') || name.includes('remix 20') || name.includes('edm') || name.includes('future house') || name.includes('future bounce');
    }
    if (style === 'edm' || style === 'dubstep') {
      return name.includes('acoustic') || name.includes('classical') || name.includes('vintage') || name.includes('jazz');
    }
    return false;
  });

  const getAuditList = () => {
    if (auditSubTab === 'unclassified') return unclassifiedTracks;
    if (auditSubTab === 'nonstandard') return nonStandardizedTracks;
    return styleMismatches;
  };

  const auditList = getAuditList();

  // Folder-by-folder audit mapping for Reclassify IA view (replaces flat file listing)
  const foldersAuditList = stylesList.map((style) => {
    const files = style.files;
    let okCount = 0;
    let koCount = 0;
    let unanalyzedCount = 0;
    const koFiles: any[] = [];

    files.forEach((file: any) => {
      const sug = suggestions[file.path];
      if (!sug) {
        unanalyzedCount++;
      } else {
        const currentFolder = getStyleFromPath(file.path);
        const normCurrent = currentFolder.toLowerCase().replace(/[\s_-]/g, '');
        const normRec = sug.recommendedStyle.toLowerCase().replace(/[\s_-]/g, '');
        const isActuallyCorrect = sug.isCorrect || (normCurrent === normRec);

        if (isActuallyCorrect) {
          okCount++;
        } else {
          koCount++;
          koFiles.push({ file, sug });
        }
      }
    });

    return {
      name: style.name,
      total: files.length,
      okCount,
      koCount,
      unanalyzedCount,
      koFiles
    };
  });

  // --- MANAGEMENT ACTION HANDLERS ---
  const handleOpenAddClient = () => {
    setEditingClient(null);
    setClientForm({ nom: '', adresse: '', email: '', telephone: '' });
    setClientModalOpen(true);
  };

  const handleOpenEditClient = (client: any) => {
    setEditingClient(client);
    setClientForm({
      nom: client.nom || '',
      adresse: client.adresse || '',
      email: client.email || '',
      telephone: client.telephone || ''
    });
    setClientModalOpen(true);
  };

  const handleSaveClientSubmit = () => {
    if (!clientForm.nom.trim()) {
      addToast('Le nom du client est obligatoire.', 'error');
      return;
    }
    saveClient({
      variables: {
        client: {
          id: editingClient?.id || null,
          nom: clientForm.nom.trim(),
          adresse: clientForm.adresse.trim(),
          email: clientForm.email.trim(),
          telephone: clientForm.telephone.trim()
        }
      }
    });
    setClientModalOpen(false);
  };

  const handleDeleteClientClick = (id: string, name: string) => {
    if (confirm(`Supprimer définitivement le client "${name}" ?`)) {
      deleteClient({ variables: { id } });
    }
  };

  const handleOpenAddRecette = () => {
    setEditingRecette(null);
    setRecetteForm({
      dateEncaissement: new Date().toLocaleDateString('fr-FR'),
      numeroFacture: '',
      client: '',
      naturePrestation: '',
      montantHt: 0,
      modeReglement: 'Virement'
    });
    setRecetteModalOpen(true);
  };

  const handleOpenEditRecette = (recette: any) => {
    setEditingRecette(recette);
    setRecetteForm({
      dateEncaissement: recette.dateEncaissement || '',
      numeroFacture: recette.numeroFacture || '',
      client: recette.client || '',
      naturePrestation: recette.naturePrestation || '',
      montantHt: recette.montantHt || 0,
      modeReglement: recette.modeReglement || 'Virement'
    });
    setRecetteModalOpen(true);
  };

  const handleFactureChange = (numFacture: string) => {
    if (!numFacture) {
      setRecetteForm({
        ...recetteForm,
        numeroFacture: '',
        client: '',
        naturePrestation: '',
        montantHt: 0
      });
      return;
    }

    const selectedFacture = devisFactures.find((df: any) => df.numero === numFacture && df.type === 'FACTURE');
    if (selectedFacture) {
      const dejaEncaiss = recettes
        .filter((r: any) => r.numeroFacture === numFacture && r.id !== editingRecette?.id)
        .reduce((sum: number, r: any) => sum + (r.montantHt || 0), 0);

      const soldeRestant = Math.max(0, (selectedFacture.totalHt || 0) - dejaEncaiss);

      setRecetteForm({
        ...recetteForm,
        numeroFacture: numFacture,
        client: selectedFacture.clientNom || '',
        naturePrestation: selectedFacture.items?.[0]?.designation || `Règlement facture ${numFacture}`,
        montantHt: soldeRestant
      });
    }
  };

  const handleSaveRecetteSubmit = () => {
    const numFacture = recetteForm.numeroFacture.trim();
    if (!numFacture || !recetteForm.client.trim() || !recetteForm.naturePrestation.trim() || recetteForm.montantHt <= 0) {
      addToast('Veuillez remplir tous les champs obligatoires et saisir un montant positif.', 'error');
      return;
    }

    // Validation par rapport à la facture
    const selectedFacture = devisFactures.find((df: any) => df.numero === numFacture && df.type === 'FACTURE');
    if (!selectedFacture) {
      addToast(`La facture "${numFacture}" n'existe pas.`, 'error');
      return;
    }

    const dejaEncaiss = recettes
      .filter((r: any) => r.numeroFacture === numFacture && r.id !== editingRecette?.id)
      .reduce((sum: number, r: any) => sum + (r.montantHt || 0), 0);

    const resteAPayer = selectedFacture.totalHt - dejaEncaiss;
    if (recetteForm.montantHt > resteAPayer + 0.01) {
      addToast(`Le montant saisi (${recetteForm.montantHt} €) dépasse le reste à payer sur cette facture (${resteAPayer.toFixed(2)} €).`, 'error');
      return;
    }

    saveRecette({
      variables: {
        recette: {
          id: editingRecette?.id || null,
          dateEncaissement: recetteForm.dateEncaissement.trim(),
          numeroFacture: numFacture,
          client: recetteForm.client.trim(),
          naturePrestation: recetteForm.naturePrestation.trim(),
          montantHt: parseFloat(recetteForm.montantHt.toString()),
          modeReglement: recetteForm.modeReglement
        }
      }
    });
    setRecetteModalOpen(false);
  };

  const handleDeleteRecetteClick = (id: string, ref: string) => {
    if (confirm(`Supprimer définitivement l'encaissement réf {ref} ?`)) {
      deleteRecette({ variables: { id } });
    }
  };

  const handleOpenAddDf = (type: 'DEVIS' | 'FACTURE') => {
    setEditingDevisFacture(null);
    const dateStr = new Date().toLocaleDateString('fr-FR');
    setDevisFactureForm({
      numero: type === 'DEVIS' ? `D2026-00${devisFactures.filter((df: any) => df.type === 'DEVIS').length + 1}` : `F2026-00${devisFactures.filter((df: any) => df.type === 'FACTURE').length + 1}`,
      type: type,
      dateEmission: dateStr,
      datePrestation: dateStr,
      clientNom: '',
      clientAdresse: '',
      validite: type === 'DEVIS' ? '30 Jours' : 'À réception de facture',
      items: [],
      totalHt: 0,
      totalTtc: 0,
      acompte: type === 'DEVIS' ? 75 : 0,
      status: 'BROUILLON',
      modeReglement: 'Virement',
      rib: '[Insérer RIB Revolut / N26 de Clément]'
    });
    setNewItemForm({ designation: '', quantite: 1, unite: 'Forfait', prixUnitaire: 0 });
    setDevisFactureModalOpen(true);
  };

  const handleOpenEditDf = (df: any) => {
    setEditingDevisFacture(df);
    setDevisFactureForm({
      numero: df.numero || '',
      type: df.type || 'DEVIS',
      dateEmission: df.dateEmission || '',
      datePrestation: df.datePrestation || '',
      clientNom: df.clientNom || '',
      clientAdresse: df.clientAdresse || '',
      validite: df.validite || '',
      items: df.items ? df.items.map((it: any) => ({
        designation: it.designation,
        quantite: it.quantite,
        unite: it.unite,
        prixUnitaire: it.prixUnitaire,
        montant: it.montant
      })) : [],
      totalHt: df.totalHt || 0,
      totalTtc: df.totalTtc || 0,
      acompte: df.acompte || 0,
      status: df.status || 'BROUILLON',
      modeReglement: df.modeReglement || 'Virement',
      rib: df.rib || '[Insérer RIB Revolut / N26 de Clément]'
    });
    setNewItemForm({ designation: '', quantite: 1, unite: 'Forfait', prixUnitaire: 0 });
    setDevisFactureModalOpen(true);
  };

  const handleConvertToFacture = (devis: any) => {
    const nextFactureNum = `F2026-00${devisFactures.filter((df: any) => df.type === 'FACTURE').length + 1}`;
    const cleanedItems = devis.items ? devis.items.map((it: any) => ({
      designation: it.designation,
      quantite: it.quantite,
      unite: it.unite,
      prixUnitaire: it.prixUnitaire,
      montant: it.montant
    })) : [];

    saveDevisFacture({
      variables: {
        devisFacture: {
          id: null,
          numero: nextFactureNum,
          type: 'FACTURE',
          dateEmission: new Date().toLocaleDateString('fr-FR'),
          datePrestation: devis.datePrestation || '',
          clientNom: devis.clientNom || '',
          clientAdresse: devis.clientAdresse || '',
          validite: 'À réception de facture',
          items: cleanedItems,
          totalHt: devis.totalHt || 0,
          totalTtc: devis.totalTtc || 0,
          acompte: 0,
          status: 'ENVOYÉ',
          modeReglement: devis.modeReglement || 'Virement',
          rib: devis.rib || '[Insérer RIB Revolut / N26 de Clément]'
        }
      }
    });
  };

  const handleAddItemToDf = () => {
    if (!newItemForm.designation.trim() || newItemForm.prixUnitaire <= 0 || newItemForm.quantite <= 0) {
      addToast('La désignation et le prix doivent être valides.', 'error');
      return;
    }
    const amount = newItemForm.quantite * newItemForm.prixUnitaire;
    const updatedItems = [
      ...dfForm.items,
      {
        designation: newItemForm.designation.trim(),
        quantite: parseFloat(newItemForm.quantite.toString()),
        unite: newItemForm.unite,
        prixUnitaire: parseFloat(newItemForm.prixUnitaire.toString()),
        montant: amount
      }
    ];

    // Recalculate totals
    const sumHt = updatedItems.reduce((acc, it) => acc + it.montant, 0);
    const acompteComputed = dfForm.type === 'DEVIS' ? Math.round(sumHt * 0.3 * 100) / 100 : dfForm.acompte;

    setDevisFactureForm((prev: any) => ({
      ...prev,
      items: updatedItems,
      totalHt: sumHt,
      totalTtc: sumHt,
      acompte: acompteComputed
    }));

    setNewItemForm({ designation: '', quantite: 1, unite: 'Forfait', prixUnitaire: 0 });
  };

  const handleRemoveItemFromDf = (index: number) => {
    const updatedItems = dfForm.items.filter((_: any, i: number) => i !== index);
    const sumHt = updatedItems.reduce((acc: number, it: any) => acc + it.montant, 0);
    const acompteComputed = dfForm.type === 'DEVIS' ? Math.round(sumHt * 0.3 * 100) / 100 : dfForm.acompte;

    setDevisFactureForm((prev: any) => ({
      ...prev,
      items: updatedItems,
      totalHt: sumHt,
      totalTtc: sumHt,
      acompte: acompteComputed
    }));
  };

  const handleSaveDfSubmit = () => {
    if (!dfForm.numero.trim() || !dfForm.clientNom.trim() || dfForm.items.length === 0) {
      addToast('Veuillez spécifier un numéro, sélectionner un client et ajouter au moins un article.', 'error');
      return;
    }
    
    // Clean items before sending (remove __typename if any)
    const cleanedItems = dfForm.items.map((it: any) => ({
      designation: it.designation,
      quantite: parseFloat(it.quantite.toString()),
      unite: it.unite,
      prixUnitaire: parseFloat(it.prixUnitaire.toString()),
      montant: parseFloat(it.montant.toString())
    }));

    saveDevisFacture({
      variables: {
        devisFacture: {
          id: editingDf?.id || null,
          numero: dfForm.numero.trim(),
          type: dfForm.type,
          dateEmission: dfForm.dateEmission.trim(),
          datePrestation: dfForm.datePrestation.trim(),
          clientNom: dfForm.clientNom.trim(),
          clientAdresse: dfForm.clientAdresse.trim(),
          validite: dfForm.validite.trim(),
          items: cleanedItems,
          totalHt: parseFloat(dfForm.totalHt.toString()),
          totalTtc: parseFloat(dfForm.totalTtc.toString()),
          acompte: parseFloat(dfForm.acompte.toString()),
          status: dfForm.status,
          modeReglement: dfForm.modeReglement,
          rib: dfForm.rib.trim()
        }
      }
    });

    setDevisFactureModalOpen(false);
  };

  const handleDeleteDfClick = (id: string, num: string) => {
    if (confirm(`Supprimer définitivement le document ${num} ?`)) {
      deleteDevisFacture({ variables: { id } });
    }
  };

  const handleOpenAddContrat = () => {
    setEditingContrat(null);
    const dateStr = new Date().toLocaleDateString('fr-FR');
    setContratForm({
      dateContrat: dateStr,
      clientNom: '',
      clientRepresentant: '',
      prestationDate: dateStr,
      prestationHoraires: '22h00 - 02h00',
      prestationTarif: 250,
      prestationAcompte: 75,
      prestationSolde: 175,
      prestationTypeAmbiance: 'Généraliste, House',
      status: 'EN_ATTENTE'
    });
    setContratModalOpen(true);
  };

  const handleOpenEditContrat = (c: any) => {
    setEditingContrat(c);
    setContratForm({
      dateContrat: c.dateContrat || '',
      clientNom: c.clientNom || '',
      clientRepresentant: c.clientRepresentant || '',
      prestationDate: c.prestationDate || '',
      prestationHoraires: c.prestationHoraires || '22h00 - 02h00',
      prestationTarif: c.prestationTarif || 250,
      prestationAcompte: c.prestationAcompte || 75,
      prestationSolde: c.prestationSolde || 175,
      prestationTypeAmbiance: c.prestationTypeAmbiance || 'Généraliste, House',
      status: c.status || 'EN_ATTENTE'
    });
    setContratModalOpen(true);
  };

  const handleSaveContratSubmit = () => {
    if (!contratForm.clientNom.trim() || contratForm.prestationTarif <= 0) {
      addToast('Veuillez remplir le nom du client et spécifier un tarif valide.', 'error');
      return;
    }

    saveContrat({
      variables: {
        contrat: {
          id: editingContrat?.id || null,
          dateContrat: contratForm.dateContrat.trim(),
          clientNom: contratForm.clientNom.trim(),
          clientRepresentant: contratForm.clientRepresentant.trim(),
          prestationDate: contratForm.prestationDate.trim(),
          prestationHoraires: contratForm.prestationHoraires.trim(),
          prestationTarif: parseFloat(contratForm.prestationTarif.toString()),
          prestationAcompte: parseFloat(contratForm.prestationAcompte.toString()),
          prestationSolde: parseFloat(contratForm.prestationSolde.toString()),
          prestationTypeAmbiance: contratForm.prestationTypeAmbiance.trim(),
          status: contratForm.status
        }
      }
    });

    setContratModalOpen(false);
  };

  const handleDeleteContratClick = (id: string, client: string) => {
    if (confirm(`Supprimer définitivement le contrat de booking pour "${client}" ?`)) {
      deleteContrat({ variables: { id } });
    }
  };

  // Set default selected style if none
  useEffect(() => {
    if (stylesList.length > 0 && !selectedStyle) {
      setSelectedStyle(stylesList[0].name);
    }
  }, [stylesList, selectedStyle]);

  // Set default selected analysis file
  useEffect(() => {
    if (scannedFiles.length > 0 && !selectedFileForAnalysis) {
      setSelectedFileForAnalysis(scannedFiles[0].path);
    }
  }, [scannedFiles, selectedFileForAnalysis]);

  return (
    <div className="container">
      <header>
        <h1>🔮 DJ Music Suite & Style Classifier</h1>
        <p className="subtitle">Console de tri intelligente et assistant d'organisation pour serveurs NAS (FTP 192.168.0.12)</p>
      </header>

      {/* Navigation Tabs */}
      <div className="tabs-container">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          📊 Tableau de Bord & Conseils
        </button>
        <button
          onClick={() => setActiveTab('explorer')}
          className={`tab-btn ${activeTab === 'explorer' ? 'active' : ''}`}
        >
          🎵 Explorateur par Style ({stylesList.length})
        </button>
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`tab-btn ${activeTab === 'duplicates' ? 'active' : ''}`}
        >
          👯 Doublons Flous ({candidates.length})
        </button>
        <button
          onClick={() => setActiveTab('reclassify')}
          className={`tab-btn ${activeTab === 'reclassify' ? 'active' : ''}`}
        >
          🧠 Reclassement IA (gpt-4o-mini)
        </button>
        <button
          onClick={() => setActiveTab('analyzer')}
          className={`tab-btn ${activeTab === 'analyzer' ? 'active' : ''}`}
        >
          🔮 Analyseur IA (Gemini)
        </button>
        <button
          onClick={() => setActiveTab('management')}
          className={`tab-btn ${activeTab === 'management' ? 'active' : ''}`}
        >
          💼 Console de Gestion KLMT Events
        </button>
      </div>

      {/* Top control and scan status bar */}
      {activeTab !== 'management' && (
        <div className="top-actions">
          <div className="scan-status-info">
            {scanStatus?.scanning ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e040fb' }}>
                <span className="loader-spinner"></span> Scan FTP du NAS en cours... ({scanStatus.totalFiles} fichiers indexés)
              </span>
            ) : (
              <span>
                Dernier scan NAS : <strong style={{ color: '#ffffff' }}>{scanStatus?.lastScanTime || 'Jamais'}</strong> &bull;{' '}
                Fichiers scannés : <strong style={{ color: '#ffffff' }}>{totalTracks}</strong>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={handleExportApp}
              className="btn btn-secondary"
              style={{ borderColor: 'var(--accent-color)', color: '#ffffff' }}
            >
              📦 Exporter la Suite DJ (ZIP)
            </button>
            <button
              onClick={handleStartScan}
              disabled={scanStatus?.scanning || scanningInitiating}
              className="btn btn-primary"
            >
              {scanStatus?.scanning ? 'Analyse en cours...' : '🔄 Synchroniser avec le NAS (FTP)'}
            </button>
          </div>
        </div>
      )}

      {/* 1. DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Key Library Stats */}
          <h3 style={{ color: '#ffffff', margin: '10px 0 15px 0', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎵 Statistiques de la Bibliothèque Musicale (NAS)
          </h3>
          <section className="stats-grid">
            <div className="stat-card fuzzy-match">
              <div className="stat-value">{totalTracks}</div>
              <div className="stat-label">Morceaux Total</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{formatBytes(totalLibrarySize)}</div>
              <div className="stat-label">Volume Total (NAS)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{candidates.length}</div>
              <div className="stat-label">Doublons Flous Détectés</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stylesList.length}</div>
                <div className="stat-label">Styles / Dossiers</div>
              </div>
            </section>

            <div className="dashboard-layout">
              {/* Left Side: Distributions */}
              <div>
                <div className="dash-card">
                  <h3 className="dash-card-title">🎧 Répartition par Style Musical (Dossier parent)</h3>
                  {stylesList.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>Aucune donnée. Lancez un scan FTP pour charger votre musique.</p>
                  ) : (
                    stylesList.map((style) => {
                      const pct = totalTracks > 0 ? Math.round((style.count / totalTracks) * 100) : 0;
                      return (
                        <div key={style.name} style={{ marginBottom: '18px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.95rem' }}>
                            <span style={{ fontWeight: 600, color: '#ffffff' }}>📁 {style.name}</span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              <strong>{style.count}</strong> morceaux ({pct}%) &bull; {formatBytes(style.size)}
                            </span>
                          </div>
                          <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="dash-card">
                  <h3 className="dash-card-title">📀 Formats de Fichiers Présents</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px' }}>
                    {formatsList.map((format) => (
                      <div
                        key={format.name}
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '15px',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '5px' }}>
                          {format.name}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-hover)' }}>
                          {format.percentage}%
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {format.count} fichiers
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side: DJ Tips */}
              <div>
                <div className="dj-tips-box">
                  <h3 style={{ marginTop: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    💡 Conseils d'Organisation pour DJ
                  </h3>
                  <ul className="dj-tips-list">
                    <li>
                      <strong>Structurez votre NAS par Styles :</strong> Organisez votre dossier principal en sous-dossiers thématiques (ex: <code>House</code>, <code>Classic</code>, <code>EDM</code>). Cela vous permettra de naviguer plus rapidement en prestation.
                    </li>
                    <li>
                      <strong>Standardisez les noms de fichiers :</strong> Utilisez un nommage homogène tel que <code>Artiste - Titre (Remix ou Mix).ext</code>. Utilisez l'Explorateur par Style pour repérer et renommer les morceaux mal formatés.
                    </li>
                    <li>
                      <strong>Nettoyez les doublons :</strong> Avoir un même morceau sous deux formats différents ou dans deux répertoires altère votre indexation dans Rekordbox ou Serato. Utilisez l'onglet <strong>Doublons Flous</strong> pour faire du tri.
                    </li>
                    <li>
                      <strong>Privilégiez les formats de haute qualité :</strong> Préférez le <strong>FLAC</strong> ou le <strong>WAV</strong> pour vos scènes de clubs, et le <strong>MP3 (320kbps)</strong> pour économiser de l'espace disque.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Classification Audit Full-Width Section */}
            <div className="dash-card" style={{ marginTop: '25px' }}>
              <h3 className="dash-card-title">🔍 Audit de Classification de votre Bibliothèque</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.4' }}>
                Cet audit intelligent analyse automatiquement la structure de vos dossiers et fichiers pour repérer les morceaux mal classés ou non standardisés sur votre serveur NAS.
              </p>

              {/* Audit Sub-navigation */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setAuditSubTab('unclassified')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: auditSubTab === 'unclassified' ? '#e040fb' : 'var(--text-muted)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    padding: '8px 15px',
                    borderBottom: auditSubTab === 'unclassified' ? '2px solid #e040fb' : 'none',
                    fontSize: '0.95rem'
                  }}
                >
                  📁 Non classés ({unclassifiedTracks.length})
                </button>
                <button
                  onClick={() => setAuditSubTab('nonstandard')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: auditSubTab === 'nonstandard' ? '#e040fb' : 'var(--text-muted)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    padding: '8px 15px',
                    borderBottom: auditSubTab === 'nonstandard' ? '2px solid #e040fb' : 'none',
                    fontSize: '0.95rem'
                  }}
                >
                  ✏️ Noms non standardisés ({nonStandardizedTracks.length})
                </button>
                <button
                  onClick={() => setAuditSubTab('mismatches')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: auditSubTab === 'mismatches' ? '#e040fb' : 'var(--text-muted)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    padding: '8px 15px',
                    borderBottom: auditSubTab === 'mismatches' ? '2px solid #e040fb' : 'none',
                    fontSize: '0.95rem'
                  }}
                >
                  ⚠️ Style suspect ({styleMismatches.length})
                </button>
              </div>

              {/* Audit Items List */}
              {auditList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#00e676', fontWeight: 'bold' }}>
                  🎉 Félicitations ! Aucun problème détecté dans cette catégorie. Vos fichiers sont parfaitement organisés !
                </div>
              ) : (
                <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
                  {auditList.map((file: any) => {
                    return (
                      <div
                        key={file.path}
                        className="track-item-card"
                        style={{
                          padding: '12px 15px',
                          marginBottom: '10px',
                          backgroundColor: 'rgba(255,255,255,0.01)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px'
                        }}
                      >
                        <div className="track-info">
                          <div className="track-title" style={{ fontSize: '0.95rem' }}>
                            {auditSubTab === 'unclassified' && '📁 [Racine] '}
                            {auditSubTab === 'nonstandard' && '✏️ [Format incorrect] '}
                            {auditSubTab === 'mismatches' && '⚠️ [Style suspect] '}
                            {file.name}
                          </div>
                          <div className="track-path" style={{ fontSize: '0.78rem' }}>Chemin : {file.path}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenRename(file.path, file.name)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                          >
                            ✏️ Corriger / Déplacer
                          </button>
                          <button
                            onClick={() => handleDelete(file.path, file.name)}
                            className="btn btn-danger"
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                          >
                            🗑️ Supprimer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      {/* 2. STYLE EXPLORER TAB */}
      {activeTab === 'explorer' && (
        <div className="explorer-layout">
          {/* Left Sidebar: Style Folders List */}
          <div className="explorer-sidebar">
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px 0' }}>
              Styles Détectés
            </h3>
            {stylesList.map((style) => (
              <div
                key={style.name}
                onClick={() => setSelectedStyle(style.name)}
                className={`style-item ${selectedStyle === style.name ? 'active' : ''}`}
              >
                <span className="style-name">📁 {style.name}</span>
                <span className="style-count">{style.count}</span>
              </div>
            ))}
          </div>

          {/* Right Area: Track Listing for Selected Style */}
          <div>
            {selectedStyle ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ color: '#ffffff', margin: 0 }}>
                    Style : {selectedStyle}{' '}
                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                      ({stylesMap[selectedStyle]?.length || 0} pistes,{' '}
                      {formatBytes(stylesMap[selectedStyle]?.reduce((sum, f) => sum + f.size, 0) || 0)})
                    </span>
                  </h2>
                </div>

                {/* Explorer Search Input */}
                <div style={{ marginBottom: '15px' }}>
                  <input
                    type="text"
                    placeholder={`🔍 Rechercher un morceau dans le style ${selectedStyle}...`}
                    value={searchExplorer}
                    onChange={(e) => setSearchExplorer(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Tracks list */}
                <div>
                  {(stylesMap[selectedStyle] || [])
                    .filter((f: any) =>
                      searchExplorer.trim() === '' ||
                      f.name.toLowerCase().includes(searchExplorer.toLowerCase()) ||
                      f.path.toLowerCase().includes(searchExplorer.toLowerCase())
                    )
                    .map((file: any) => {
                      const ext = file.name.split('.').pop()?.toUpperCase() || 'INCONNU';
                      return (
                        <div key={file.path} className="track-item-card">
                          <div className="track-info">
                            <div className="track-title">🎵 {file.name}</div>
                            <div className="track-path">📂 {file.path}</div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <span className="meta-tag ext-tag">{ext}</span>
                              <span className="meta-tag size-tag">{file.sizeFormatted}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={() => {
                                setSelectedFileForAnalysis(file.path);
                                setAnalysisSource('scanned');
                                setActiveTab('analyzer');
                              }}
                              className="btn btn-warning"
                              title="Analyser la structure et le mix de ce morceau"
                            >
                              🔮 Analyser avec l'IA
                            </button>
                            <button
                              onClick={() => handleOpenRename(file.path, file.name)}
                              className="btn btn-secondary"
                              title="Renommer ce morceau sur le NAS"
                            >
                              ✏️ Renommer
                            </button>
                            <button
                              onClick={() => handleDelete(file.path, file.name)}
                              className="btn btn-danger"
                              title="Supprimer définitivement du NAS"
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Sélectionnez un style dans le menu de gauche pour lister ses morceaux.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. DUPLICATES TAB */}
      {activeTab === 'duplicates' && (
        <div>
          {/* Stats Display */}
          <section className="stats-grid">
            <div className="stat-card fuzzy-match">
              <div className="stat-value">{candidates.length}</div>
              <div className="stat-label">Doublons Affichés</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{criticalCount}</div>
              <div className="stat-label">Paires Critiques (&ge;90%)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{formatDiffCount}</div>
              <div className="stat-label">Formats Différents</div>
            </div>
          </section>

          {/* Filters and Sliders */}
          <section className="controls-panel">
            <div className="controls-grid">
              {/* Search */}
              <div className="control-group">
                <label className="control-label" htmlFor="search-input">
                  Rechercher un morceau ou dossier
                </label>
                <input
                  type="text"
                  id="search-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="🔍 Ex: Cece Peniston, Lola, Remix..."
                />
              </div>

              {/* Similarity Slider */}
              <div className="control-group">
                <label className="control-label" htmlFor="ratio-slider">
                  <span>Taux de similarité minimal</span>
                  <span className="value-display">{minRatio}%</span>
                </label>
                <div className="slider-container">
                  <input
                    type="range"
                    id="ratio-slider"
                    min="75"
                    max="98"
                    value={minRatio}
                    onChange={(e) => setMinRatio(parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Remix Filter checkbox */}
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>
                <input
                  type="checkbox"
                  checked={hideRemixes}
                  onChange={(e) => setHideRemixes(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                />
                Masquer les remixes et versions différentes (garder les deux dans la collection)
              </label>
            </div>
          </section>

          {/* Candidates List */}
          <section className="results-section">
            <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <h2>📋 Doublons identifiés par l'algorithme Java Gestalt</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => {
                    addToast("Recalcul et mise à jour des doublons flous...", "info");
                    refetchCandidates();
                  }}
                  disabled={loadingCandidates}
                  className="btn btn-secondary"
                  style={{ padding: '8px 15px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px', height: '38px', borderColor: 'var(--accent-color)' }}
                >
                  🔄 Rafraîchir la Liste
                </button>
                <span className="results-count">
                  {loadingCandidates ? 'Chargement...' : `Affichage de ${candidates.length} paire(s)`}
                </span>
              </div>
            </div>

            {loadingCandidates && candidates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <span className="loader-spinner" style={{ width: '24px', height: '24px', borderWidth: '4px' }}></span>
                <p>Calcul des doublons flous en cours...</p>
              </div>
            ) : candidates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                Aucun doublon trouvé avec ces critères de filtrage.
              </div>
            ) : (
              <div id="pairs-list">
                {candidates.map((pair: any, idx: number) => {
                  const ratioPct = Math.round(pair.ratio * 100);
                  let badgeClass = 'badge-info';
                  if (ratioPct >= 90) badgeClass = 'badge-danger';
                  else if (ratioPct >= 80) badgeClass = 'badge-warning';

                  const ext1 = pair.file1.name.split('.').pop()?.toUpperCase() || 'INCONNU';
                  const ext2 = pair.file2.name.split('.').pop()?.toUpperCase() || 'INCONNU';

                  const formatWarning = ext1 !== ext2;
                  const sizeDiff = Math.abs(pair.file1.size - pair.file2.size) / Math.max(pair.file1.size, pair.file2.size);
                  const sizeWarning = sizeDiff > 0.05;

                  return (
                    <div className="pair-card" key={pair.id}>
                      <div className="card-header">
                        <span className="pair-id">Paire #{idx + 1}</span>
                        <div className="card-badges">
                          {formatWarning && (
                            <span className="format-warning-badge">⚠️ Formats différents ({ext1} vs {ext2})</span>
                          )}
                          {sizeWarning && (
                            <span className="size-warning-badge">⚠️ Tailles différentes ({pair.file1.sizeFormatted} vs {pair.file2.sizeFormatted})</span>
                          )}
                          {pair.differentRemix && (
                            <span className="badge badge-remix">🎧 Remixes différents</span>
                          )}
                          <span className={`badge ${badgeClass}`}>{ratioPct}% de similarité</span>
                        </div>
                      </div>
                      <div className="card-body">
                        {/* File A */}
                        <div className="file-info-row">
                          <div className="file-letter letter-a">A</div>
                          <div className="file-details">
                            <div className="file-name">🎵 {pair.file1.name}</div>
                            <div className="file-path">📂 {pair.file1.path}</div>
                            <div className="file-meta">
                              <span className="meta-tag ext-tag">{ext1}</span>
                              <span className="meta-tag size-tag">{pair.file1.sizeFormatted}</span>
                            </div>
                          </div>
                          <div className="file-actions">
                            <button
                              onClick={() => handleOpenRename(pair.file1.path, pair.file1.name)}
                              className="btn btn-secondary"
                              title="Renommer ce fichier sur le serveur FTP"
                            >
                              ✏️ Renommer
                            </button>
                            <button
                              onClick={() => handleDelete(pair.file1.path, pair.file1.name)}
                              className="btn btn-danger"
                              title="Supprimer définitivement ce fichier sur le FTP"
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        </div>

                        <div className="pair-divider">vs</div>

                        {/* File B */}
                        <div className="file-info-row">
                          <div className="file-letter letter-b">B</div>
                          <div className="file-details">
                            <div className="file-name">🎵 {pair.file2.name}</div>
                            <div className="file-path">📂 {pair.file2.path}</div>
                            <div className="file-meta">
                              <span className="meta-tag ext-tag">{ext2}</span>
                              <span className="meta-tag size-tag">{pair.file2.sizeFormatted}</span>
                            </div>
                          </div>
                          <div className="file-actions">
                            <button
                              onClick={() => handleOpenRename(pair.file2.path, pair.file2.name)}
                              className="btn btn-secondary"
                              title="Renommer ce fichier sur le serveur FTP"
                            >
                              ✏️ Renommer
                            </button>
                            <button
                              onClick={() => handleDelete(pair.file2.path, pair.file2.name)}
                              className="btn btn-danger"
                              title="Supprimer définitivement ce fichier sur le FTP"
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Pair actions */}
                      <div className="pair-card-actions">
                        <button
                          onClick={() => handleIgnore(pair.file1.path, pair.file2.path)}
                          className="btn btn-warning"
                          title="Ignorer cette paire de doublons et la masquer de la liste"
                        >
                          🙈 Masquer ce doublon (Ignorer)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 4. AI RECLASSIFICATION TAB */}
      {activeTab === 'reclassify' && (
        <div>
          <div className="dash-card">
            <h2 className="dash-card-title">🧠 Reclassement Intelligent par IA (gpt-4o-mini)</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.5' }}>
              Pour économiser un maximum de tokens, vous pouvez filtrer la synchronisation et l'analyse par répertoire, ou bien lancer l'analyse de toute votre bibliothèque en tâche de fond. 
              Le modèle <strong>gpt-4o-mini</strong> analysera chaque répertoire et vous donnera le bilan des fichiers OK (bien rangés) et KO (à corriger), avec la possibilité de déplacer physiquement les fichiers mal classés sur votre NAS en un seul clic !
            </p>

            {/* Folder Selection Panel */}
            <div
              className="controls-panel"
              style={{
                padding: '20px',
                marginBottom: '25px',
                borderRadius: '8px',
                borderLeft: '4px solid var(--accent-hover)'
              }}
            >
              <h4 style={{ margin: '0 0 15px 0', color: '#ffffff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📁 Sélection des répertoires à analyser :
              </h4>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#ffffff', fontWeight: 'bold' }}>
                  <input
                    type="checkbox"
                    checked={stylesList.length > 0 && selectedFoldersForAnalysis.length === stylesList.length}
                    onChange={handleToggleSelectAllFolders}
                    style={{ accentColor: 'var(--accent-color)', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  Tout sélectionner / désélectionner ({stylesList.length} répertoires)
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {foldersAuditList.map((folder) => {
                  const isFullyAnalyzed = folder.unanalyzedCount === 0;
                  const isPartiallyAnalyzed = folder.unanalyzedCount > 0 && folder.unanalyzedCount < folder.total;
                  const analyzedCount = folder.total - folder.unanalyzedCount;
                  
                  return (
                    <label
                      key={folder.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        cursor: 'pointer',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        backgroundColor: selectedFoldersForAnalysis.includes(folder.name) ? 'rgba(156, 39, 176, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        border: selectedFoldersForAnalysis.includes(folder.name) ? '1px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.05)',
                        transition: 'all 0.2s ease',
                        color: selectedFoldersForAnalysis.includes(folder.name) ? '#ffffff' : 'var(--text-muted)',
                        minWidth: 0
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={selectedFoldersForAnalysis.includes(folder.name)}
                          onChange={() => handleToggleFolder(folder.name)}
                          style={{ accentColor: 'var(--accent-color)', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <span 
                          style={{ 
                            fontSize: '0.92rem', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            fontWeight: 500
                          }}
                          title={`${folder.name} (${folder.total})`}
                        >
                          {folder.name} ({folder.total})
                        </span>
                      </div>
                      
                      {/* Checkmark or Progress Badge */}
                      {isFullyAnalyzed && (
                        <span style={{ color: '#00e676', fontWeight: 'bold', fontSize: '1rem', paddingLeft: '5px' }} title="Entièrement Analysé !">
                          ✓
                        </span>
                      )}
                      {isPartiallyAnalyzed && (
                        <span style={{ color: '#ffb300', fontSize: '0.78rem', fontWeight: 'bold', paddingLeft: '5px' }} title="Analyse en cours">
                          {analyzedCount}/{folder.total}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Batch Controls Bar */}
            <div
              className="controls-panel"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '15px',
                padding: '20px',
                marginBottom: '25px',
                borderLeft: '4px solid var(--accent-color)'
              }}
            >
              <div>
                <h4 style={{ margin: '0 0 5px 0', color: '#ffffff', fontSize: '1.05rem' }}>🎯 Analyse par lot des répertoires sélectionnés</h4>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {batchAnalyzing
                    ? `Analyse en cours... ${batchProgress} / ${filesToAnalyze.length} morceaux traités.`
                    : `${filesToAnalyze.length} morceau(x) sélectionné(s) prêt(s) à être analysé(s) par l'IA (sur ${scannedFiles.length} au total).`}
                </p>
                {batchAnalyzing && (
                  <div className="progress-bar-container" style={{ width: '250px', marginTop: '8px' }}>
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${(batchProgress / filesToAnalyze.length) * 100}%`, backgroundColor: '#e040fb' }}
                    ></div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {batchAnalyzing ? (
                  <button onClick={handleStopBatchAnalysis} className="btn btn-danger" style={{ padding: '10px 20px' }}>
                    🛑 Arrêter l'Analyse
                  </button>
                ) : (
                  <button
                    onClick={handleStartBatchAnalysis}
                    disabled={filesToAnalyze.length === 0}
                    className="btn btn-primary"
                    style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    🧠 Lancer l'Analyse des Dossiers Sélectionnés ({filesToAnalyze.length})
                  </button>
                )}
              </div>
            </div>

            {/* Folder-by-Folder Audit Representation (No flat file lists, no filters, grouped by folder with OK/KO stats) */}
            <div style={{ marginTop: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '1.15rem', color: '#ffffff', margin: 0 }}>
                  📁 Bilan de Rangement par Style & Répertoire
                </h3>
                <button
                  onClick={handleExportReclassifyPDF}
                  className="btn btn-secondary"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: '#e040fb',
                    color: '#ffffff',
                    padding: '8px 15px',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    height: '38px'
                  }}
                >
                  📄 Exporter le Bilan (PDF)
                </button>
              </div>
              
              {foldersAuditList.map((folder) => {
                const analyzedCount = folder.total - folder.unanalyzedCount;
                const pct = folder.total > 0 ? Math.round((analyzedCount / folder.total) * 100) : 0;
                const isExpanded = !!expandedFolders[folder.name];
                
                return (
                  <div
                    key={folder.name}
                    className="dash-card"
                    style={{
                      padding: '20px',
                      marginBottom: '15px',
                      borderLeft: folder.koCount > 0 ? '4px solid #ffb300' : '4px solid #00e676',
                      backgroundColor: 'rgba(255,255,255,0.01)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div 
                      onClick={() => setExpandedFolders(prev => ({ ...prev, [folder.name]: !prev[folder.name] }))}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', cursor: 'pointer', userSelect: 'none' }}
                      title="Cliquez pour déplier / replier la liste"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ color: 'var(--accent-color)', fontSize: '1.2rem', transition: 'transform 0.2s ease', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>
                          ▶
                        </span>
                        <div>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#ffffff' }}>
                            📁 Répertoire : <span style={{ color: 'var(--accent-hover)' }}>{folder.name}</span>
                          </h4>
                          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', fontSize: '0.9rem' }}>
                            <span>Total : <strong>{folder.total}</strong></span>
                            <span style={{ color: '#00e676' }}>✓ OK (Bien classés) : <strong>{folder.okCount}</strong></span>
                            <span style={{ color: '#ffb300' }}>⚠️ KO (À corriger) : <strong>{folder.koCount}</strong></span>
                            <span style={{ color: 'var(--text-muted)' }}>Non analysés : <strong>{folder.unanalyzedCount}</strong></span>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                            Analysés : {analyzedCount} / {folder.total} ({pct}%)
                          </div>
                          <div className="progress-bar-container" style={{ width: '120px', height: '6px' }}>
                            <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: '#e040fb' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sub-list displaying ONLY the KO files inside this folder, visible ONLY when expanded */}
                    {isExpanded && (
                      <div style={{ marginTop: '20px', borderTop: '1px dashed var(--border-color)', paddingTop: '15px' }}>
                        {folder.koCount > 0 ? (
                          <>
                            <h5 style={{ margin: '0 0 12px 0', color: '#ffb300', fontSize: '0.95rem', fontWeight: 'bold' }}>
                              ⚠️ Liste des {folder.koCount} morceau(x) mal classés à corriger dans {folder.name} :
                            </h5>
                            
                            {folder.koFiles.map(({ file, sug }) => {
                              return (
                                <div
                                  key={file.path}
                                  className="track-item-card"
                                  style={{
                                    padding: '12px 15px',
                                    marginBottom: '10px',
                                    backgroundColor: 'rgba(255, 179, 0, 0.02)',
                                    border: '1px solid rgba(255, 179, 0, 0.15)',
                                    borderRadius: '8px'
                                  }}
                                >
                                  <div className="track-info">
                                    <div className="track-title" style={{ fontSize: '0.95rem' }}>🎵 {file.name}</div>
                                    <div className="track-path" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                                      Chemin : {file.path}
                                    </div>
                                    <div style={{ fontSize: '0.88rem', color: '#ffb300', marginTop: '6px', fontStyle: 'italic' }}>
                                      💡 Conseil : Déplacer vers <strong>{sug.recommendedStyle}</strong>. "{sug.explanation}"
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', alignSelf: 'center' }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation(); // Éviter de replier la carte lors du clic sur le bouton !
                                        handleMoveFile(file, sug.recommendedStyle);
                                      }}
                                      className="btn btn-primary"
                                      style={{
                                        backgroundColor: '#e040fb',
                                        color: '#ffffff',
                                        padding: '6px 12px',
                                        fontSize: '0.85rem',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      🔄 Déplacer vers {sug.recommendedStyle}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        ) : (
                          <div style={{ color: '#00e676', fontWeight: 'bold', fontSize: '0.95rem', padding: '10px 0' }}>
                            ✓ Félicitations ! Tous les fichiers analysés dans ce répertoire sont parfaitement classés. Aucun correctif nécessaire.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. AI ANALYZER TAB */}
      {activeTab === 'analyzer' && (
        <div>
          <div className="dash-card">
            <h2 className="dash-card-title">🔮 Analyse de Fichiers Audio avec l'Intelligence Artificielle</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.5' }}>
              Sélectionnez n'importe quel morceau présent sur votre serveur NAS ou fournissez le chemin d'un fichier audio local sur votre ordinateur (mix complet, single, ou enregistrement). 
              L'IA analysera le contenu pour vous dresser une tracklist complète, identifier les styles musicaux, estimer le BPM et vous donner des conseils d'organisation.
            </p>

            <div style={{ display: 'flex', gap: '30px', marginBottom: '25px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  <input
                    type="radio"
                    name="source"
                    checked={analysisSource === 'scanned'}
                    onChange={() => setAnalysisSource('scanned')}
                    style={{ accentColor: 'var(--accent-color)', width: '18px', height: '18px' }}
                  />
                  Musique sur mon NAS (FTP)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  <input
                    type="radio"
                    name="source"
                    checked={analysisSource === 'local'}
                    onChange={() => setAnalysisSource('local')}
                    style={{ accentColor: 'var(--accent-color)', width: '18px', height: '18px' }}
                  />
                  Fichier local sur mon ordinateur
                </label>
              </div>

              <div style={{ display: 'flex', gap: '30px', marginBottom: '25px', flexWrap: 'wrap', alignItems: 'center' }}>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontWeight: 'bold' }} htmlFor="provider-select">Choix de l'IA :</label>
                <select
                  id="provider-select"
                  value={analysisProvider}
                  onChange={(e) => setAnalysisProvider(e.target.value as 'gemini' | 'openai')}
                  style={{
                    padding: '10px 15px',
                    backgroundColor: '#0d1117',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="gemini">Google Gemini Pro 1.5 (Recommandé)</option>
                  <option value="openai">OpenAI (Whisper + GPT-4o)</option>
                </select>
              </div>
            </div>

            <div className="controls-panel" style={{ padding: '20px', marginBottom: '25px' }}>
              {analysisSource === 'scanned' ? (
                <div className="control-group">
                  <label className="control-label" htmlFor="file-select">
                    Choisir un morceau scanné sur le NAS :
                  </label>
                  {scannedFiles.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Aucun fichier indexé. Veuillez synchroniser votre NAS.</p>
                  ) : (
                    <select
                      id="file-select"
                      value={selectedFileForAnalysis}
                      onChange={(e) => setSelectedFileForAnalysis(e.target.value)}
                      style={{
                        padding: '12px',
                        backgroundColor: '#0d1117',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '1rem',
                        width: '100%',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {scannedFiles.map((file: any) => (
                        <option key={file.path} value={file.path}>
                          {getStyleFromPath(file.path)} &bull; {file.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="control-group">
                  <label className="control-label" htmlFor="local-path">
                    Saisir le chemin absolu du fichier audio local :
                  </label>
                  <input
                    type="text"
                    id="local-path"
                    value={customLocalPath}
                    onChange={(e) => setCustomLocalPath(e.target.value)}
                    placeholder="Ex: C:\Users\Clement\Music\mon_mix_dj_2026.mp3"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleStartAnalysis}
                  disabled={analyzing}
                  className="btn btn-primary"
                  style={{ padding: '12px 24px', fontSize: '1rem' }}
                >
                  {analyzing ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="loader-spinner"></span> Analyse par l'IA en cours...
                    </span>
                  ) : (
                    `🔮 Lancer l'analyse avec ${analysisProvider === 'gemini' ? 'Gemini Pro' : 'OpenAI'}`
                  )}
                </button>
              </div>
            </div>

            {/* Analysis Loader / Pending State */}
            {analyzing && (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                <span className="loader-spinner" style={{ width: '32px', height: '32px', borderWidth: '4px', marginBottom: '15px' }}></span>
                <h3 style={{ color: '#ffffff', margin: '0 0 10px 0' }}>Analyse en cours par {analysisProvider === 'gemini' ? 'Gemini Pro 1.5' : 'OpenAI'}</h3>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>
                  L'IA est en train d'écouter votre fichier audio. Cela prend généralement entre 1 et 3 minutes en fonction de la taille du fichier. Merci de patienter...
                </p>
              </div>
            )}

            {/* Analysis Result Output */}
            {analysisResult && (
              <div style={{ marginTop: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>
                  <h3 style={{ color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📋 Rapport d'Analyse Musicale Généré
                  </h3>
                  <button
                    onClick={handleExportPDF}
                    className="btn btn-secondary"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderColor: '#e040fb',
                      color: '#ffffff',
                      padding: '8px 15px',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      height: '38px'
                    }}
                  >
                    📄 Exporter en PDF
                  </button>
                </div>
                <div
                  style={{
                    backgroundColor: '#0d1117',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '25px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                    lineHeight: '1.6',
                    fontSize: '1.05rem',
                    color: '#c9d1d9',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '600px',
                    overflowY: 'auto',
                    boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.5)'
                  }}
                >
                  {analysisResult}
                </div>
                <div style={{ marginTop: '15px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'right' }}>
                  Analyse réalisée avec {analysisProvider === 'gemini' ? 'Gemini-1.5-pro' : 'OpenAI (Whisper + GPT-4o)'} &bull; Rapport enregistré localement.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Management Tab */}
      {activeTab === 'management' && (
        <div>
          <div className="dash-card">
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setMgmtSubTab('dashboard')} className={`btn ${mgmtSubTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 15px', fontSize: '0.9rem' }}>
                  📈 Dashboard
                </button>
                <button onClick={() => setMgmtSubTab('clients')} className={`btn ${mgmtSubTab === 'clients' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 15px', fontSize: '0.9rem' }}>
                  👥 Clients
                </button>
                <button onClick={() => setMgmtSubTab('documents')} className={`btn ${mgmtSubTab === 'documents' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 15px', fontSize: '0.9rem' }}>
                  📄 Devis & Factures
                </button>
                <button onClick={() => setMgmtSubTab('contrats')} className={`btn ${mgmtSubTab === 'contrats' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 15px', fontSize: '0.9rem' }}>
                  ✍️ Contrats de Booking
                </button>
                <button onClick={() => setMgmtSubTab('encaissements')} className={`btn ${mgmtSubTab === 'encaissements' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 15px', fontSize: '0.9rem' }}>
                  💰 Saisie des Encaissements
                </button>
              </div>
            </div>

            {/* A0. FINANCIAL DASHBOARD SUB-TAB */}
            {mgmtSubTab === 'dashboard' && (() => {
              const parseDate = (dateStr: any) => {
                if (!dateStr || typeof dateStr !== 'string') return null;
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                  const day = parseInt(parts[0], 10);
                  const month = parseInt(parts[1], 10);
                  const year = parseInt(parts[2], 10);
                  if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                    return { day, month, year };
                  }
                }
                return null;
              };

              const monthsNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jui', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

              const recettesForSelectedYear = recettes.filter((r: any) => {
                const parsed = parseDate(r.dateEncaissement);
                return parsed && parsed.year === selectedYear;
              });

              const totalCaSelectedYear = recettesForSelectedYear.reduce((sum: number, r: any) => sum + r.montantHt, 0);
              const countSelectedYear = recettesForSelectedYear.length;
              const averageSelectedYear = countSelectedYear > 0 ? (totalCaSelectedYear / countSelectedYear).toFixed(0) : '0';

              const monthlyCA = Array.from({ length: 12 }, (_, index) => {
                const monthNum = index + 1;
                const total = recettes.reduce((sum: number, r: any) => {
                  const parsed = parseDate(r.dateEncaissement);
                  if (parsed && parsed.year === selectedYear && parsed.month === monthNum) {
                    return sum + r.montantHt;
                  }
                  return sum;
                }, 0);
                return {
                  monthNum,
                  name: monthsNames[index],
                  total
                };
              });

              const maxMonthlyCa = Math.max(...monthlyCA.map(m => m.total), 1);

              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                      <h3 style={{ margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        📈 Récapitulatif Financier Dynamique
                      </h3>
                      <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Indicateurs clés et répartition mensuelle du chiffre d'affaires (HT) de Clément pour l'année sélectionnée
                      </p>
                    </div>
                    
                    {/* Year Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={() => setSelectedYear(prev => prev - 1)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.9rem', fontWeight: 'bold' }}
                        title="Année précédente (Clic à gauche / Clic gauche)"
                      >
                        ◀
                      </button>
                      <div
                        onClick={() => setSelectedYear(prev => prev - 1)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedYear(prev => prev + 1);
                        }}
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 'bold',
                          color: '#ffffff',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          padding: '6px 20px',
                          borderRadius: '20px',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          userSelect: 'none',
                          minWidth: '70px',
                          textAlign: 'center'
                        }}
                        title="Clic gauche : Année précédente (N-1) | Clic droit : Année suivante (+1)"
                      >
                        {selectedYear}
                      </div>
                      <button
                        onClick={() => setSelectedYear(prev => prev + 1)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.9rem', fontWeight: 'bold' }}
                        title="Année suivante (Clic à droite / Clic droit)"
                      >
                        ▶
                      </button>
                    </div>
                  </div>

                  <section className="stats-grid" style={{ marginBottom: '25px' }}>
                    <div className="stat-card" style={{ borderLeft: '4px solid #00e676' }}>
                      <div className="stat-value" style={{ color: '#00e676' }}>{totalCaSelectedYear.toLocaleString('fr-FR')} €</div>
                      <div className="stat-label">TOTAL CA ENCAISSÉ (HT) EN {selectedYear}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{countSelectedYear}</div>
                      <div className="stat-label">PRESTATIONS ENCAISSÉES EN {selectedYear}</div>
                    </div>
                    <div className="stat-card" style={{ borderLeft: '4px solid #e040fb' }}>
                      <div className="stat-value" style={{ color: '#e040fb' }}>{parseFloat(averageSelectedYear).toLocaleString('fr-FR')} €</div>
                      <div className="stat-label">CA MOYEN PAR PRESTATION EN {selectedYear}</div>
                    </div>
                  </section>

                  {/* Monthly CA Graph */}
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h4 style={{ margin: 0, color: '#ffffff' }}>📊 Graphique de Chiffre d'Affaires Mensuel (HT)</h4>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        💡 Astuce : clic gauche sur l'année = Année -1 | clic droit = Année +1
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      height: '180px',
                      paddingTop: '25px',
                      borderBottom: '2px solid var(--border-color)',
                      gap: '12px',
                      position: 'relative',
                      marginBottom: '5px'
                    }}>
                      {monthlyCA.map((m) => {
                        const heightPercent = m.total > 0 ? (m.total / maxMonthlyCa) * 100 : 0;
                        return (
                          <div key={m.monthNum} style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            height: '100%',
                            justifyContent: 'flex-end',
                            position: 'relative'
                          }}>
                            {/* Bar Tooltip */}
                            {m.total > 0 && (
                              <div style={{
                                position: 'absolute',
                                bottom: `calc(${heightPercent}% + 6px)`,
                                backgroundColor: '#0d1117',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                color: '#00e676',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                                pointerEvents: 'none',
                                zIndex: 10
                              }}>
                                {m.total.toLocaleString('fr-FR')} €
                              </div>
                            )}
                            
                            {/* Bar Column */}
                            <div style={{
                              width: '100%',
                              maxWidth: '40px',
                              height: `${heightPercent}%`,
                              background: m.total > 0 ? 'linear-gradient(180deg, #00e676 0%, #10b981 100%)' : 'rgba(255, 255, 255, 0.01)',
                              borderTopLeftRadius: '4px',
                              borderTopRightRadius: '4px',
                              transition: 'all 0.3s ease',
                              cursor: 'pointer',
                              boxShadow: m.total > 0 ? '0 0 10px rgba(0, 230, 118, 0.15)' : 'none',
                              border: m.total > 0 ? '1px solid #00e676' : '1px dashed rgba(255, 255, 255, 0.03)',
                              borderBottom: 'none'
                            }}
                            title={`${m.name}: ${m.total.toLocaleString('fr-FR')} € HT`}
                            />
                            
                            {/* Label */}
                            <div style={{
                              marginTop: '8px',
                              fontSize: '0.8rem',
                              color: m.total > 0 ? '#ffffff' : 'var(--text-muted)',
                              fontWeight: m.total > 0 ? 'bold' : 'normal'
                            }}>
                              {m.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Task List Panel (Top 5 Prioritaires) */}
                  {(() => {
                    const getPendingTasks = () => {
                      const tasks: { id: string; label: string; date: string; type: string; severity: 'high' | 'warning' | 'info' }[] = [];
                      const TODAY = new Date(2026, 6, 30); // 30 Juillet 2026

                      const parseDateToObj = (dateStr: any) => {
                        if (!dateStr || typeof dateStr !== 'string') return null;
                        const parts = dateStr.split('/');
                        if (parts.length === 3) {
                          const day = parseInt(parts[0], 10);
                          const month = parseInt(parts[1], 10);
                          const year = parseInt(parts[2], 10);
                          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                            return new Date(year, month - 1, day);
                          }
                        }
                        return null;
                      };

                      // 1. Contracts & Deposits
                      if (Array.isArray(contrats)) {
                        contrats.forEach((c: any) => {
                          if (c.status === 'EN_ATTENTE') {
                            const dateC = parseDateToObj(c.dateContrat);
                            const ageDays = dateC ? Math.floor((TODAY.getTime() - dateC.getTime()) / (24 * 60 * 60 * 1000)) : 0;
                            
                            if (ageDays > 7) {
                              tasks.push({
                                id: `contrat-late-${c.id}`,
                                label: `ALERTE ACOMPTE : Relancer ${c.clientNom} pour le contrat envoyé le ${c.dateContrat} (Acompte non reçu depuis plus de 7 jours)`,
                                date: c.prestationDate || 'Date inconnue',
                                type: '🚨 Acompte en retard',
                                severity: 'high'
                              });
                            } else {
                              tasks.push({
                                id: `contrat-${c.id}`,
                                label: `Faire signer le contrat de booking pour ${c.clientNom || 'Client inconnu'}`,
                                date: c.prestationDate || 'Date inconnue',
                                type: '✍️ Contrat à signer',
                                severity: 'warning'
                              });
                            }
                          }
                        });
                      }

                      // 2. Estimates & Invoices
                      if (Array.isArray(devisFactures)) {
                        devisFactures.forEach((df: any) => {
                          // Check if devis is validated but no contract exists
                          if (df.type === 'DEVIS' && df.status === 'VALIDÉ') {
                            const contractExists = Array.isArray(contrats) && contrats.some((c: any) => 
                              c.clientNom === df.clientNom && c.prestationDate === df.datePrestation
                            );
                            
                            if (!contractExists) {
                              tasks.push({
                                id: `devis-nocontract-${df.id}`,
                                label: `ALERTE SÉCURITÉ : Aucun contrat de booking créé pour le devis validé ${df.numero} (${df.clientNom})`,
                                date: df.datePrestation || df.dateEmission || 'Date inconnue',
                                type: '✍️ Contrat à créer',
                                severity: 'high'
                              });
                            } else {
                              // If contract exists, standard billing task
                              tasks.push({
                                id: `devis-${df.id}`,
                                label: `Émettre la facture finale pour le devis validé ${df.numero} (${df.clientNom})`,
                                date: df.datePrestation || df.dateEmission || 'Date inconnue',
                                type: '⚡ Facture à émettre',
                                severity: 'info'
                              });
                            }
                          }

                          // Drafts & Relances
                          if (df.status === 'BROUILLON' || df.status === 'ENVOYÉ') {
                            const dateE = parseDateToObj(df.dateEmission);
                            const ageDays = dateE ? Math.floor((TODAY.getTime() - dateE.getTime()) / (24 * 60 * 60 * 1000)) : 0;
                            
                            if (ageDays > 15 && df.status === 'ENVOYÉ') {
                              tasks.push({
                                id: `devis-relance-${df.id}`,
                                label: `Relancer le client ${df.clientNom} pour le document ${df.numero} envoyé depuis plus de 15 jours sans réponse`,
                                date: df.dateEmission || 'Date inconnue',
                                type: '⏳ Relance client',
                                severity: 'warning'
                              });
                            } else if (df.status === 'BROUILLON') {
                              tasks.push({
                                id: `draft-${df.id}`,
                                label: `Finaliser le brouillon de ${df.type === 'DEVIS' ? 'devis' : 'facture'} ${df.numero} (${df.clientNom})`,
                                date: df.dateEmission || 'Date inconnue',
                                type: '✏️ Brouillon',
                                severity: 'info'
                              });
                            }
                          }

                          // Unpaid invoices / Retard de paiement
                          if (df.type === 'FACTURE' && df.status === 'ENVOYÉ') {
                            const totalHt = df.totalHt || 0;
                            const dejaEncaiss = Array.isArray(recettes)
                              ? recettes
                                  .filter((r: any) => r.numeroFacture === df.numero)
                                  .reduce((sum: number, r: any) => sum + (r.montantHt || 0), 0)
                              : 0;
                            const reste = totalHt - dejaEncaiss;
                            
                            if (reste > 0.01) {
                              const dateP = parseDateToObj(df.datePrestation || df.dateEmission);
                              const isPast = dateP && dateP.getTime() < TODAY.getTime();
                              
                              if (isPast) {
                                tasks.push({
                                  id: `facture-late-${df.id}`,
                                  label: `ALERTE RETARD : Encaisser le solde de la facture ${df.numero} pour ${df.clientNom} (Reste : ${reste.toLocaleString('fr-FR')} € - Échéance dépassée)`,
                                  date: df.datePrestation || df.dateEmission || 'Date inconnue',
                                  type: '🚨 Retard de paiement',
                                  severity: 'high'
                                });
                              } else {
                                tasks.push({
                                  id: `facture-${df.id}`,
                                  label: `Encaisser le solde de la facture ${df.numero} pour ${df.clientNom} (Reste : ${reste.toLocaleString('fr-FR')} €)`,
                                  date: df.datePrestation || df.dateEmission || 'Date inconnue',
                                  type: '💰 Encaissement',
                                  severity: 'warning'
                                });
                              }
                            }
                          }
                        });
                      }

                      // Merge manual tasks
                      if (Array.isArray(manualTasks)) {
                        manualTasks.forEach((t: any) => {
                          tasks.push(t);
                        });
                      }

                      // Sort tasks by severity (high first, then warning, then info)
                      const severityOrder = { high: 0, warning: 1, info: 2 };
                      return tasks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]).slice(0, 5);
                    };

                    const pendingTasks = getPendingTasks();

                    return (
                      <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '20px',
                        marginTop: '15px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <h4 style={{ margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📋 Tâches Prioritaires à Réaliser ({pendingTasks.length})
                          </h4>
                          <button
                            onClick={() => setShowAddTaskForm(prev => !prev)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 12px', fontSize: '0.8rem', height: '28px', lineHeight: '1' }}
                          >
                            {showAddTaskForm ? '❌ Fermer' : '➕ Ajouter'}
                          </button>
                        </div>
                        
                        {pendingTasks.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '15px', color: '#00e676', fontWeight: 'bold', fontSize: '0.9rem' }}>
                            🎉 Félicitations ! Toutes vos prestations et factures sont parfaitement à jour.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {pendingTasks.map((t) => {
                              let badgeColor = '#ffffff';
                              let badgeBg = 'rgba(255,255,255,0.05)';
                              let itemBorder = '1px solid var(--border-color)';
                              
                              if (t.severity === 'high') {
                                badgeColor = '#ff4d4f';
                                badgeBg = 'rgba(255, 77, 79, 0.1)';
                                itemBorder = '1px solid rgba(255, 77, 79, 0.2)';
                              } else if (t.severity === 'warning') {
                                badgeColor = '#faad14';
                                badgeBg = 'rgba(250, 173, 20, 0.1)';
                                itemBorder = '1px solid rgba(250, 173, 20, 0.2)';
                              } else if (t.severity === 'info') {
                                badgeColor = '#1890ff';
                                badgeBg = 'rgba(24, 144, 255, 0.1)';
                                itemBorder = '1px solid rgba(24, 144, 255, 0.2)';
                              }

                              return (
                                <div key={t.id} style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '10px 12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.005)',
                                  border: itemBorder,
                                  borderRadius: '6px',
                                  gap: '15px',
                                  flexWrap: 'wrap'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '220px' }}>
                                    <span style={{
                                      fontSize: '0.75rem',
                                      fontWeight: 'bold',
                                      color: badgeColor,
                                      backgroundColor: badgeBg,
                                      padding: '3px 8px',
                                      borderRadius: '15px',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {t.type}
                                    </span>
                                    <span style={{ color: '#ffffff', fontSize: '0.88rem', lineHeight: '1.4' }}>
                                      {t.label}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                      Échéance : <strong>{t.date}</strong>
                                    </span>
                                    {t.type === '📌 Manuel' && (
                                      <button
                                        onClick={() => handleDeleteManualTask(t.id)}
                                        style={{
                                          background: 'rgba(0, 230, 118, 0.1)',
                                          border: '1px solid rgba(0, 230, 118, 0.3)',
                                          color: '#00e676',
                                          cursor: 'pointer',
                                          fontSize: '0.8rem',
                                          fontWeight: 'bold',
                                          padding: '4px 8px',
                                          borderRadius: '4px',
                                          transition: 'all 0.2s'
                                        }}
                                        title="Marquer comme accomplie (supprimer)"
                                      >
                                        ✓ Fait
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Simple Manual Task Form */}
                        {showAddTaskForm && (
                          <form onSubmit={handleAddManualTask} style={{ display: 'flex', gap: '10px', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div style={{ flex: '1', minWidth: '200px' }}>
                              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Description :</label>
                              <input
                                type="text"
                                value={newTaskLabel}
                                onChange={(e) => setNewTaskLabel(e.target.value)}
                                placeholder="Description de la tâche..."
                                style={{ width: '100%', boxSizing: 'border-box', padding: '8px', backgroundColor: '#0d1117', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#ffffff', fontSize: '0.9rem' }}
                              />
                            </div>
                            <div style={{ width: '150px' }}>
                              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Date d'échéance :</label>
                              <input
                                type="date"
                                value={newTaskDate}
                                onChange={(e) => setNewTaskDate(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '7px', backgroundColor: '#0d1117', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#ffffff', fontSize: '0.9rem' }}
                              />
                            </div>
                            <div style={{ width: '120px' }}>
                              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Priorité :</label>
                              <select
                                value={newTaskSeverity}
                                onChange={(e) => setNewTaskSeverity(e.target.value as any)}
                                style={{ width: '100%', padding: '8px', backgroundColor: '#0d1117', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#ffffff', fontSize: '0.9rem' }}
                              >
                                <option value="high">🔴 Élevée</option>
                                <option value="warning">🟡 Moyenne</option>
                                <option value="info">🔵 Faible</option>
                              </select>
                            </div>
                            <button
                              type="submit"
                              className="btn btn-primary"
                              style={{ padding: '8px 15px', height: '37px', fontSize: '0.9rem' }}
                            >
                              ➕ Ajouter
                            </button>
                          </form>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* A2. ENCAISSEMENTS SUB-TAB */}
            {mgmtSubTab === 'encaissements' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#ffffff' }}>📋 Livre des Recettes (Suivi des Encaissements)</h3>
                  <button onClick={handleOpenAddRecette} className="btn btn-primary" style={{ padding: '8px 15px', fontSize: '0.9rem' }}>
                    ➕ Ajouter un encaissement
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="ko-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Date Encaissement</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>N° Facture</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Client</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Nature de la Prestation</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--text-muted)' }}>Montant HT Encaissé</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Mode de Règlement</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-muted)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recettes.map((r: any) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)' }}>{r.dateEncaissement}</td>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)', fontWeight: 'bold', color: 'var(--accent-hover)' }}>{r.numeroFacture}</td>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)' }}>{r.client}</td>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)' }}>{r.naturePrestation}</td>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'right', fontWeight: 'bold', color: '#00e676' }}>{r.montantHt.toLocaleString('fr-FR')} €</td>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)' }}>
                            <span className="meta-tag ext-tag" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#ffffff' }}>{r.modeReglement}</span>
                          </td>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                            <button onClick={() => handleOpenEditRecette(r)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: '5px' }}>✏️</button>
                            <button onClick={() => handleDeleteRecetteClick(r.id, r.numeroFacture)} className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* B. CLIENTS SUB-TAB */}
            {mgmtSubTab === 'clients' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#ffffff' }}>👥 Annuaire Clients KLMT Events</h3>
                  <button onClick={handleOpenAddClient} className="btn btn-primary" style={{ padding: '8px 15px', fontSize: '0.9rem' }}>
                    ➕ Ajouter un client
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="ko-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Nom / Raison Sociale</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Adresse de facturation</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Email</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Téléphone</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-muted)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((c: any) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)', fontWeight: 'bold', color: '#ffffff' }}>{c.nom}</td>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>{c.adresse || '—'}</td>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)' }}>{c.email ? <a href={`mailto:${c.email}`} style={{ color: 'var(--accent-hover)' }}>{c.email}</a> : '—'}</td>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)' }}>{c.telephone || '—'}</td>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                            <button onClick={() => handleOpenEditClient(c)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: '5px' }}>✏️</button>
                            <button onClick={() => handleDeleteClientClick(c.id, c.nom)} className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* C. DOCUMENTS SUB-TAB */}
            {mgmtSubTab === 'documents' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#ffffff' }}>📄 Devis & Factures Générés</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleOpenAddDf('DEVIS')} className="btn btn-secondary" style={{ borderColor: 'var(--accent-color)', color: '#ffffff', padding: '8px 15px', fontSize: '0.9rem' }}>
                      ➕ Nouveau Devis
                    </button>
                    <button onClick={() => handleOpenAddDf('FACTURE')} className="btn btn-primary" style={{ padding: '8px 15px', fontSize: '0.9rem' }}>
                      ➕ Nouvelle Facture
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="ko-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Type</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Numéro</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Date émission</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Client</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--text-muted)' }}>Montant Net</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--text-muted)' }}>Montant Payé</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Statut</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-muted)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devisFactures.map((df: any) => {
                        const amount = df.totalTtc || 0;
                        const isDevis = df.type === 'DEVIS';
                        const paidAmount = df.type === 'FACTURE'
                          ? recettes
                              .filter((r: any) => r.numeroFacture === df.numero)
                              .reduce((sum: number, r: any) => sum + (r.montantHt || 0), 0)
                          : 0;
                        return (
                          <tr key={df.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '12px', border: '1px solid var(--border-color)' }}>
                              <span className={`badge ${isDevis ? 'badge-info' : 'badge-danger'}`} style={{ textTransform: 'uppercase', fontSize: '0.75rem', padding: '3px 8px' }}>
                                {df.type}
                              </span>
                            </td>
                            <td style={{ padding: '12px', border: '1px solid var(--border-color)', fontWeight: 'bold', color: '#ffffff' }}>{df.numero}</td>
                            <td style={{ padding: '12px', border: '1px solid var(--border-color)' }}>{df.dateEmission}</td>
                            <td style={{ padding: '12px', border: '1px solid var(--border-color)' }}>{df.clientNom}</td>
                            <td style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'right', fontWeight: 'bold', color: '#00e676' }}>{amount.toLocaleString('fr-FR')} €</td>
                            <td style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'right', fontWeight: 'bold', color: paidAmount > 0 ? '#00e676' : 'var(--text-muted)' }}>
                              {df.type === 'FACTURE' ? `${paidAmount.toLocaleString('fr-FR')} €` : '—'}
                            </td>
                            <td style={{ padding: '12px', border: '1px solid var(--border-color)' }}>
                              <span className="meta-tag size-tag" style={{
                                backgroundColor: df.status === 'PAYÉ' || df.status === 'VALIDÉ' ? 'rgba(0,230,118,0.1)' : df.status === 'BROUILLON' ? 'rgba(255,255,255,0.05)' : 'rgba(255,179,0,0.1)',
                                color: df.status === 'PAYÉ' || df.status === 'VALIDÉ' ? '#00e676' : df.status === 'BROUILLON' ? '#ffffff' : '#ffb300',
                                textTransform: 'uppercase',
                                border: 'none'
                              }}>
                                {df.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                              {isDevis && (
                                <button onClick={() => handleConvertToFacture(df)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: '5px', backgroundColor: 'rgba(0,230,118,0.1)', color: '#00e676', border: '1px solid #00e676' }} title="Convertir en Facture">⚡ Facturer</button>
                              )}
                              <button onClick={() => { setViewingDf(df); setDfViewModalOpen(true); }} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: '5px', color: '#e040fb' }} title="Aperçu / Imprimer">👁️ PDF</button>
                              <button onClick={() => handleOpenEditDf(df)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: '5px' }} title="Modifier">✏️</button>
                              <button onClick={() => handleDeleteDfClick(df.id, df.numero)} className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.8rem' }} title="Supprimer">🗑️</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* D. CONTRATS SUB-TAB */}
            {mgmtSubTab === 'contrats' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#ffffff' }}>✍️ Contrats de Prestation & Booking</h3>
                  <button onClick={handleOpenAddContrat} className="btn btn-primary" style={{ padding: '8px 15px', fontSize: '0.9rem' }}>
                    ➕ Nouveau Contrat Booking
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="ko-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Date Contrat</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Client</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Date Prestation</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Horaires</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--text-muted)' }}>Tarif</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--text-muted)' }}>Acompte requis</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>Statut</th>
                        <th style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-muted)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contrats.map((c: any) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)' }}>{c.dateContrat}</td>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)', fontWeight: 'bold', color: '#ffffff' }}>{c.clientNom}</td>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)' }}>{c.prestationDate}</td>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)' }}>{c.prestationHoraires}</td>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'right', fontWeight: 'bold' }}>{c.prestationTarif.toLocaleString('fr-FR')} €</td>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'right', color: '#ffb300' }}>{c.prestationAcompte.toLocaleString('fr-FR')} € (30%)</td>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)' }}>
                            <span className="meta-tag size-tag" style={{
                              backgroundColor: c.status === 'SIGNÉ' ? 'rgba(0,230,118,0.1)' : 'rgba(255,179,0,0.1)',
                              color: c.status === 'SIGNÉ' ? '#00e676' : '#ffb300',
                              border: 'none'
                            }}>
                              {c.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                            <button onClick={() => { setViewingContrat(c); setContratViewModalOpen(true); }} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: '5px', color: '#e040fb' }} title="Voir Contrat / Imprimer">✍️ Contrat</button>
                            <button onClick={() => handleOpenEditContrat(c)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: '5px' }} title="Modifier">✏️</button>
                            <button onClick={() => handleDeleteContratClick(c.id, c.clientNom)} className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.8rem' }} title="Supprimer">🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MANAGEMENT FORMS & MODALS --- */}

      {/* 1. Client Modal */}
      {clientModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>👥 {editingClient ? 'Modifier la fiche Client' : 'Ajouter un nouveau Client'}</h3>
            </div>
            <div className="modal-body">
              <div className="control-group" style={{ marginBottom: '15px' }}>
                <label className="control-label">Nom ou Raison Sociale : <span style={{ color: 'red' }}>*</span></label>
                <input type="text" value={clientForm.nom} onChange={(e) => setClientForm({ ...clientForm, nom: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Ex: Bar Le Central" />
              </div>
              <div className="control-group" style={{ marginBottom: '15px' }}>
                <label className="control-label">Adresse de facturation :</label>
                <input type="text" value={clientForm.adresse} onChange={(e) => setClientForm({ ...clientForm, adresse: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Ex: 12 Rue de la Paix, 44000 Nantes" />
              </div>
              <div className="control-group" style={{ marginBottom: '15px' }}>
                <label className="control-label">Adresse Email :</label>
                <input type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Ex: contact@barcentral.fr" />
              </div>
              <div className="control-group">
                <label className="control-label">Numéro de téléphone :</label>
                <input type="text" value={clientForm.telephone} onChange={(e) => setClientForm({ ...clientForm, telephone: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Ex: 06 12 34 56 78" />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setClientModalOpen(false)} className="btn btn-secondary">Annuler</button>
              <button onClick={handleSaveClientSubmit} className="btn btn-primary">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Recette Modal */}
      {recetteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>📊 {editingRecette ? 'Modifier l\'encaissement' : 'Saisir un nouvel Encaissement'}</h3>
            </div>
            <div className="modal-body">
              <div className="control-group" style={{ marginBottom: '15px' }}>
                <label className="control-label">Date Encaissement :</label>
                <input type="text" value={recetteForm.dateEncaissement} onChange={(e) => setRecetteForm({ ...recetteForm, dateEncaissement: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="JJ/MM/AAAA" />
              </div>
              <div className="control-group" style={{ marginBottom: '15px' }}>
                <label className="control-label">N° Facture : <span style={{ color: 'red' }}>*</span></label>
                <select
                  value={recetteForm.numeroFacture}
                  onChange={(e) => handleFactureChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#0d1117',
                    border: '1px solid var(--border-color)',
                    color: '#ffffff',
                    borderRadius: '8px'
                  }}
                >
                  <option value="">-- Choisir une facture --</option>
                  {devisFactures
                    .filter((df: any) => {
                      if (df.type !== 'FACTURE') return false;
                      if (df.numero === recetteForm.numeroFacture) return true;

                      // Calculer le solde restant
                      const dejaEncaiss = recettes
                        .filter((r: any) => r.numeroFacture === df.numero && r.id !== editingRecette?.id)
                        .reduce((sum: number, r: any) => sum + (r.montantHt || 0), 0);

                      return (df.totalHt || 0) - dejaEncaiss > 0.01;
                    })
                    .map((df: any) => (
                      <option key={df.id} value={df.numero}>
                        {df.numero} &bull; {df.clientNom} ({df.totalHt} € HT)
                      </option>
                    ))}
                  {recetteForm.numeroFacture && !devisFactures.some((df: any) => df.numero === recetteForm.numeroFacture) && (
                    <option value={recetteForm.numeroFacture}>
                      {recetteForm.numeroFacture} (Inexistante)
                    </option>
                  )}
                </select>
              </div>
              <div className="control-group" style={{ marginBottom: '15px' }}>
                <label className="control-label">Nom du Client : <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  list="clients-names"
                  value={recetteForm.client}
                  onChange={(e) => setRecetteForm({ ...recetteForm, client: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', backgroundColor: recetteForm.numeroFacture ? 'rgba(255,255,255,0.05)' : '' }}
                  placeholder="Saisir ou choisir un client..."
                  disabled={!!recetteForm.numeroFacture}
                />
                <datalist id="clients-names">
                  {clients.map((c: any) => <option key={c.id} value={c.nom} />)}
                </datalist>
              </div>
              <div className="control-group" style={{ marginBottom: '15px' }}>
                <label className="control-label">Nature de la Prestation : <span style={{ color: 'red' }}>*</span></label>
                <input type="text" value={recetteForm.naturePrestation} onChange={(e) => setRecetteForm({ ...recetteForm, naturePrestation: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Ex: Prestation artistique DJ + Son" />
              </div>
              <div className="control-group" style={{ marginBottom: '15px' }}>
                <label className="control-label">Montant Encaissé (HT) : <span style={{ color: 'red' }}>*</span></label>
                <input type="number" value={recetteForm.montantHt || ''} onChange={(e) => setRecetteForm({ ...recetteForm, montantHt: parseFloat(e.target.value) || 0 })} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Ex: 250" />
              </div>
              <div className="control-group">
                <label className="control-label">Mode de Règlement :</label>
                <select value={recetteForm.modeReglement} onChange={(e) => setRecetteForm({ ...recetteForm, modeReglement: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid var(--border-color)', color: '#ffffff', borderRadius: '8px' }}>
                  <option value="Virement">Virement</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Espèces">Espèces</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setRecetteModalOpen(false)} className="btn btn-secondary">Annuler</button>
              <button onClick={handleSaveRecetteSubmit} className="btn btn-primary">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Devis/Facture Editor Modal */}
      {dfModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <h3>📄 Éditeur de {dfForm.type === 'DEVIS' ? 'Devis' : 'Facture'} - Réf {dfForm.numero}</h3>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '20px' }}>
                <div className="control-group">
                  <label className="control-label">Type de document :</label>
                  <select disabled={editingDf != null} value={dfForm.type} onChange={(e) => setDevisFactureForm({ ...dfForm, type: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid var(--border-color)', color: '#ffffff', borderRadius: '8px' }}>
                    <option value="DEVIS">Devis</option>
                    <option value="FACTURE">Facture</option>
                  </select>
                </div>
                <div className="control-group">
                  <label className="control-label">Numéro du document :</label>
                  <input type="text" value={dfForm.numero} onChange={(e) => setDevisFactureForm({ ...dfForm, numero: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div className="control-group">
                  <label className="control-label">Date d'émission :</label>
                  <input type="text" value={dfForm.dateEmission} onChange={(e) => setDevisFactureForm({ ...dfForm, dateEmission: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div className="control-group">
                  <label className="control-label">Date de prestation :</label>
                  <input type="text" value={dfForm.datePrestation} onChange={(e) => setDevisFactureForm({ ...dfForm, datePrestation: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div className="control-group">
                  <label className="control-label">Sélectionner un Client :</label>
                  <select value={dfForm.clientNom} onChange={(e) => {
                    const selected = clients.find((c: any) => c.nom === e.target.value);
                    setDevisFactureForm({
                      ...dfForm,
                      clientNom: e.target.value,
                      clientAdresse: selected ? selected.adresse : ''
                    });
                  }} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid var(--border-color)', color: '#ffffff', borderRadius: '8px' }}>
                    <option value="">-- Choisir un client --</option>
                    {clients.map((c: any) => <option key={c.id} value={c.nom}>{c.nom}</option>)}
                  </select>
                </div>
                <div className="control-group">
                  <label className="control-label">Adresse de facturation :</label>
                  <input type="text" value={dfForm.clientAdresse} onChange={(e) => setDevisFactureForm({ ...dfForm, clientAdresse: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div className="control-group">
                  <label className="control-label">Validité / Date de règlement :</label>
                  <input type="text" value={dfForm.validite} onChange={(e) => setDevisFactureForm({ ...dfForm, validite: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div className="control-group">
                  <label className="control-label">RIB pour le virement :</label>
                  <input type="text" value={dfForm.rib} onChange={(e) => setDevisFactureForm({ ...dfForm, rib: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Line Items Editor */}
              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '15px', marginTop: '15px' }}>
                <h4 style={{ color: '#ffffff', margin: '0 0 10px 0' }}>📦 Détail des prestations :</h4>
                
                <table className="ko-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginBottom: '15px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'left' }}>Désignation de la Prestation</th>
                      <th style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'center', width: '80px' }}>Qté</th>
                      <th style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'center', width: '80px' }}>Unité</th>
                      <th style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'right', width: '120px' }}>Prix Unitaire HT</th>
                      <th style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'right', width: '120px' }}>Total HT</th>
                      <th style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'center', width: '60px' }}>Retirer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dfForm.items.map((it: any, index: number) => (
                      <tr key={index}>
                        <td style={{ padding: '8px', border: '1px solid var(--border-color)' }}>{it.designation}</td>
                        <td style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>{it.quantite}</td>
                        <td style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>{it.unite}</td>
                        <td style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'right' }}>{it.prixUnitaire.toLocaleString('fr-FR')} €</td>
                        <td style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'right', fontWeight: 'bold' }}>{it.montant.toLocaleString('fr-FR')} €</td>
                        <td style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                          <button onClick={() => handleRemoveItemFromDf(index)} className="btn btn-danger" style={{ padding: '2px 6px', fontSize: '0.75rem' }}>&times;</button>
                        </td>
                      </tr>
                    ))}
                    {/* Fast add line form */}
                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                        <input type="text" value={newItemForm.designation} onChange={(e) => setNewItemForm({ ...newItemForm, designation: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #30363d', backgroundColor: '#0d1117', color: '#ffffff', borderRadius: '4px', padding: '5px' }} placeholder="Ajouter une ligne (ex: Prestation artistique DJ...)" />
                      </td>
                      <td style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <input type="number" value={newItemForm.quantite || ''} onChange={(e) => setNewItemForm({ ...newItemForm, quantite: parseFloat(e.target.value) || 0 })} style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', border: '1px solid #30363d', backgroundColor: '#0d1117', color: '#ffffff', borderRadius: '4px', padding: '5px' }} />
                      </td>
                      <td style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <input type="text" value={newItemForm.unite} onChange={(e) => setNewItemForm({ ...newItemForm, unite: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', border: '1px solid #30363d', backgroundColor: '#0d1117', color: '#ffffff', borderRadius: '4px', padding: '5px' }} />
                      </td>
                      <td style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                        <input type="number" value={newItemForm.prixUnitaire || ''} onChange={(e) => setNewItemForm({ ...newItemForm, prixUnitaire: parseFloat(e.target.value) || 0 })} style={{ width: '100%', boxSizing: 'border-box', textAlign: 'right', border: '1px solid #30363d', backgroundColor: '#0d1117', color: '#ffffff', borderRadius: '4px', padding: '5px' }} placeholder="Tarif €" />
                      </td>
                      <td style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'right', fontWeight: 'bold' }}>
                        {(newItemForm.quantite * newItemForm.prixUnitaire).toLocaleString('fr-FR')} €
                      </td>
                      <td style={{ padding: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <button onClick={handleAddItemToDf} className="btn btn-primary" style={{ padding: '3px 8px', fontSize: '0.8rem' }}>➕</button>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Subtotals & deposit calculations */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginTop: '15px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                  <div className="control-group">
                    <label className="control-label">Acompte demandé (EUR) :</label>
                    <input type="number" value={dfForm.acompte || ''} onChange={(e) => setDevisFactureForm({ ...dfForm, acompte: parseFloat(e.target.value) || 0 })} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div className="control-group">
                    <label className="control-label">Statut du Document :</label>
                    <select value={dfForm.status} onChange={(e) => setDevisFactureForm({ ...dfForm, status: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid var(--border-color)', color: '#ffffff', borderRadius: '8px' }}>
                      <option value="BROUILLON">Brouillon</option>
                      <option value="VALIDÉ">Validé (Devis)</option>
                      <option value="ENVOYÉ">Envoyé</option>
                      <option value="PAYÉ">Payé (Facture)</option>
                      <option value="ANNULÉ">Annulé</option>
                    </select>
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '1.1rem', marginTop: '15px', fontWeight: 'bold' }}>
                  <p style={{ margin: '5px 0' }}>Total HT : <span style={{ color: '#ffffff' }}>{dfForm.totalHt.toLocaleString('fr-FR')} €</span></p>
                  <p style={{ margin: '5px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>TVA non applicable (art. 293 B du CGI)</p>
                  <p style={{ margin: '5px 0', fontSize: '1.3rem', color: '#00e676' }}>NET À PAYER / TOTAL NET : {dfForm.totalTtc.toLocaleString('fr-FR')} €</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDevisFactureModalOpen(false)} className="btn btn-secondary">Annuler</button>
              <button onClick={handleSaveDfSubmit} className="btn btn-primary">Enregistrer le document</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Booking Contract Editor Modal */}
      {contratModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>✍️ Éditeur de Contrat de Booking DJ</h3>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                <div className="control-group">
                  <label className="control-label">Associer à un Devis : <span style={{ color: 'red' }}>*</span></label>
                  <select
                    value={devisFactures.find((df: any) => df.clientNom === contratForm.clientNom && df.datePrestation === contratForm.prestationDate && df.type === 'DEVIS')?.numero || ''}
                    onChange={(e) => {
                      const selectedDevis = devisFactures.find((df: any) => df.numero === e.target.value && df.type === 'DEVIS');
                      if (selectedDevis) {
                        const ambiance = selectedDevis.items ? selectedDevis.items.map((it: any) => it.designation).join(', ') : 'Généraliste';
                        setContratForm({
                          ...contratForm,
                          clientNom: selectedDevis.clientNom || '',
                          prestationDate: selectedDevis.datePrestation || '',
                          prestationTarif: selectedDevis.totalTtc || 0,
                          prestationAcompte: selectedDevis.acompte || 0,
                          prestationSolde: (selectedDevis.totalTtc || 0) - (selectedDevis.acompte || 0),
                          prestationTypeAmbiance: ambiance.length > 100 ? ambiance.substring(0, 97) + '...' : ambiance
                        });
                      } else {
                        setContratForm({
                          ...contratForm,
                          clientNom: '',
                          prestationDate: '',
                          prestationTarif: 0,
                          prestationAcompte: 0,
                          prestationSolde: 0,
                          prestationTypeAmbiance: ''
                        });
                      }
                    }}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid var(--border-color)', color: '#ffffff', borderRadius: '8px' }}
                    disabled={editingContrat != null}
                  >
                    <option value="">-- Choisir un Devis --</option>
                    {devisFactures
                      .filter((df: any) => df.type === 'DEVIS')
                      .map((df: any) => (
                        <option key={df.id} value={df.numero}>
                          {df.numero} &bull; {df.clientNom} ({df.datePrestation})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="control-group">
                  <label className="control-label">Date du contrat :</label>
                  <input type="text" value={contratForm.dateContrat} onChange={(e) => setContratForm({ ...contratForm, dateContrat: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div className="control-group">
                  <label className="control-label">Nom du Client :</label>
                  <input type="text" disabled value={contratForm.clientNom} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.05)', color: '#ffffff' }} />
                </div>
                <div className="control-group">
                  <label className="control-label">Représentant du Client (Signataire) :</label>
                  <input type="text" value={contratForm.clientRepresentant} onChange={(e) => setContratForm({ ...contratForm, clientRepresentant: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Ex: M. Jean Martin (Gérant)" />
                </div>
                <div className="control-group">
                  <label className="control-label">Date de l'événement :</label>
                  <input type="text" disabled value={contratForm.prestationDate} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.05)', color: '#ffffff' }} />
                </div>
                <div className="control-group">
                  <label className="control-label">Horaires de prestation :</label>
                  <input type="text" value={contratForm.prestationHoraires} onChange={(e) => setContratForm({ ...contratForm, prestationHoraires: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Ex: 22h00 - 02h00" />
                </div>
                <div className="control-group">
                  <label className="control-label">Musicalité / Ambiance :</label>
                  <input type="text" value={contratForm.prestationTypeAmbiance} onChange={(e) => setContratForm({ ...contratForm, prestationTypeAmbiance: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Ex: Généraliste, House, Disco" />
                </div>
                <div className="control-group">
                  <label className="control-label">Tarif Total Convenu (EUR) :</label>
                  <input type="number" disabled value={contratForm.prestationTarif || ''} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.05)', color: '#ffffff' }} />
                </div>
                <div className="control-group">
                  <label className="control-label">Acompte requis (30%) :</label>
                  <input type="number" disabled value={contratForm.prestationAcompte || ''} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.05)', color: '#ffffff' }} />
                </div>
                <div className="control-group">
                  <label className="control-label">Solde à régler lors de la prestation :</label>
                  <input type="number" disabled value={contratForm.prestationSolde} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.05)', color: '#ffffff' }} />
                </div>
                <div className="control-group">
                  <label className="control-label">Statut de signature :</label>
                  <select value={contratForm.status} onChange={(e) => setContratForm({ ...contratForm, status: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid var(--border-color)', color: '#ffffff', borderRadius: '8px' }}>
                    <option value="EN_ATTENTE">En attente de signature</option>
                    <option value="SIGNÉ">Signé par les deux parties</option>
                    <option value="ANNULÉ">Annulé</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setContratModalOpen(false)} className="btn btn-secondary">Annuler</button>
              <button onClick={handleSaveContratSubmit} className="btn btn-primary">Enregistrer le Contrat</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Devis / Facture View & Print Modal */}
      {dfViewModalOpen && viewingDf && (
        <div className="modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="modal-content" style={{ maxWidth: '850px', backgroundColor: '#ffffff', color: '#1f2328', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #d0d7de', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#8e24aa' }}>🖨️ Aperçu d'impression - Réf {viewingDf.numero}</h3>
              <div>
                <button onClick={() => {
                  const printContent = document.getElementById('print-document-area')?.innerHTML;
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>${viewingDf.type} - ${viewingDf.numero}</title>
                          <style>
                            body { font-family: Arial, sans-serif; padding: 40px; color: #1f2328; line-height: 1.5; }
                            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                            th, td { border: 1px solid #d0d7de; padding: 10px; text-align: left; }
                            th { background-color: #f6f8fa; }
                            .text-right { text-align: right; }
                            .header { border-bottom: 2px solid #8e24aa; padding-bottom: 15px; margin-bottom: 30px; }
                            .totals-box { margin-top: 30px; text-align: right; font-size: 1.1rem; }
                          </style>
                        </head>
                        <body>
                          ${printContent}
                          <script>window.onload = function() { window.print(); };</script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }} className="btn btn-primary" style={{ marginRight: '10px', padding: '6px 12px', fontSize: '0.85rem' }}> Imprimer / Exporter PDF</button>
                <button onClick={() => setDfViewModalOpen(false)} className="btn btn-secondary" style={{ backgroundColor: '#f6f8fa', border: '1px solid #d0d7de', color: '#1f2328', padding: '6px 12px', fontSize: '0.85rem' }}>Fermer</button>
              </div>
            </div>

            {/* Print Document Area */}
            <div id="print-document-area" style={{ backgroundColor: '#ffffff', color: '#1f2328', padding: '10px', fontSize: '0.95rem', lineHeight: '1.5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '2px solid #8e24aa', paddingBottom: '15px' }}>
                <div>
                  <h2 style={{ margin: '0 0 5px 0', color: '#8e24aa' }}>Clément PIROT EI - KLMT Events</h2>
                  <p style={{ margin: '2px 0', fontSize: '0.85rem', color: '#57606a' }}>Siret : 949 123 456 00012 | Domicilié à : Nantes, France</p>
                  <p style={{ margin: '2px 0', fontSize: '0.85rem', color: '#57606a' }}>Email : clement@klmtevents.com | Tél : 06 43 00 00 00</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h1 style={{ margin: '0 0 5px 0', color: '#1f2328', fontSize: '2rem' }}>{viewingDf.type}</h1>
                  <p style={{ margin: '2px 0', fontWeight: 'bold' }}>NUMÉRO : {viewingDf.numero}</p>
                  <p style={{ margin: '2px 0' }}>Date d'émission : {viewingDf.dateEmission}</p>
                  <p style={{ margin: '2px 0' }}>Date de prestation : {viewingDf.datePrestation}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px', marginBottom: '30px' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', borderBottom: '1px solid #d0d7de', paddingBottom: '3px', color: '#57606a' }}>ÉMETTEUR :</h4>
                  <p style={{ margin: '3px 0', fontWeight: 'bold' }}>KLMT Events (Clément PIROT)</p>
                  <p style={{ margin: '3px 0' }}>Micro-entreprise enregistrée à Nantes</p>
                  <p style={{ margin: '3px 0' }}>TVA non applicable, art. 293 B du CGI</p>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', borderBottom: '1px solid #d0d7de', paddingBottom: '3px', color: '#57606a' }}>DESTINATAIRE :</h4>
                  <p style={{ margin: '3px 0', fontWeight: 'bold' }}>{viewingDf.clientNom}</p>
                  <p style={{ margin: '3px 0' }}>{viewingDf.clientAdresse || 'Adresse non spécifiée'}</p>
                  <p style={{ margin: '3px 0' }}>Validité : {viewingDf.validite}</p>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', margin: '25px 0', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f6f8fa', borderBottom: '2px solid #d0d7de' }}>
                    <th style={{ padding: '10px', border: '1px solid #d0d7de', textAlign: 'left' }}>Désignation des Prestations</th>
                    <th style={{ padding: '10px', border: '1px solid #d0d7de', textAlign: 'center', width: '60px' }}>Qté</th>
                    <th style={{ padding: '10px', border: '1px solid #d0d7de', textAlign: 'center', width: '80px' }}>Unité</th>
                    <th style={{ padding: '10px', border: '1px solid #d0d7de', textAlign: 'right', width: '130px' }}>Prix Unitaire HT</th>
                    <th style={{ padding: '10px', border: '1px solid #d0d7de', textAlign: 'right', width: '130px' }}>Montant HT</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingDf.items.map((it: any, index: number) => (
                    <tr key={index} style={{ borderBottom: '1px solid #d0d7de' }}>
                      <td style={{ padding: '10px', border: '1px solid #d0d7de' }}>{it.designation}</td>
                      <td style={{ padding: '10px', border: '1px solid #d0d7de', textAlign: 'center' }}>{it.quantite}</td>
                      <td style={{ padding: '10px', border: '1px solid #d0d7de', textAlign: 'center' }}>{it.unite}</td>
                      <td style={{ padding: '10px', border: '1px solid #d0d7de', textAlign: 'right' }}>{it.prixUnitaire.toLocaleString('fr-FR')} €</td>
                      <td style={{ padding: '10px', border: '1px solid #d0d7de', textAlign: 'right', fontWeight: 'bold' }}>{it.montant.toLocaleString('fr-FR')} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px', marginTop: '30px' }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#57606a' }}>MODE DE RÈGLEMENT CONVENU :</h4>
                  <p style={{ margin: '3px 0' }}>Par {viewingDf.modeReglement || 'Virement bancaire'}</p>
                  <p style={{ margin: '3px 0', fontSize: '0.8rem', color: '#57606a', fontStyle: 'italic' }}>RIB : {viewingDf.rib || '[Insérer RIB de Clément]'}</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '1.05rem' }}>
                  <p style={{ margin: '4px 0' }}>Total HT : <strong>{viewingDf.totalHt.toLocaleString('fr-FR')} €</strong></p>
                  <p style={{ margin: '4px 0', fontSize: '0.8rem', color: '#57606a' }}>TVA non applicable (art. 293 B du CGI)</p>
                  {viewingDf.acompte > 0 && <p style={{ margin: '4px 0', color: '#ffb300' }}>Acompte 30% requis : {viewingDf.acompte.toLocaleString('fr-FR')} €</p>}
                  <p style={{ margin: '4px 0', fontSize: '1.25rem', color: '#1a7f37' }}>NET À PAYER : <strong>{viewingDf.totalTtc.toLocaleString('fr-FR')} €</strong></p>
                </div>
              </div>

              <div style={{ marginTop: '50px', borderTop: '1px solid #d0d7de', paddingTop: '15px', fontSize: '0.8rem', color: '#57606a', textAlign: 'center' }}>
                Clément PIROT EI &bull; KLMT Events &bull; Dispensé d'immatriculation au registre du commerce et des sociétés (RCS) et au répertoire des métiers (RM).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Booking Contract View & Print Modal */}
      {contratViewModalOpen && viewingContrat && (
        <div className="modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="modal-content" style={{ maxWidth: '850px', backgroundColor: '#ffffff', color: '#1f2328', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #d0d7de', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#8e24aa' }}>🖨️ Aperçu Contrat de Prestation Artistique</h3>
              <div>
                <button onClick={() => {
                  const printContent = document.getElementById('print-contract-area')?.innerHTML;
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Contrat de Booking DJ - ${viewingContrat.clientNom}</title>
                          <style>
                            body { font-family: Arial, sans-serif; padding: 40px; color: #1f2328; line-height: 1.5; font-size: 0.95rem; }
                            h2 { border-bottom: 1px solid #d0d7de; padding-bottom: 5px; color: #8e24aa; font-size: 1.2rem; margin-top: 25px; }
                            p { margin: 8px 0; text-align: justify; }
                          </style>
                        </head>
                        <body>
                          ${printContent}
                          <script>window.onload = function() { window.print(); };</script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }} className="btn btn-primary" style={{ marginRight: '10px', padding: '6px 12px', fontSize: '0.85rem' }}>Imprimer / Exporter PDF</button>
                <button onClick={() => setContratViewModalOpen(false)} className="btn btn-secondary" style={{ backgroundColor: '#f6f8fa', border: '1px solid #d0d7de', color: '#1f2328', padding: '6px 12px', fontSize: '0.85rem' }}>Fermer</button>
              </div>
            </div>

            {/* Print Contract Area */}
            <div id="print-contract-area" style={{ backgroundColor: '#ffffff', color: '#1f2328', padding: '10px', fontSize: '0.9rem', lineHeight: '1.6', textAlign: 'justify' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #8e24aa', paddingBottom: '15px', marginBottom: '30px' }}>
                <h1 style={{ color: '#8e24aa', margin: '0 0 5px 0', fontSize: '1.8rem' }}>CONTRAT DE PRESTATION ET BOOKING DJ</h1>
                <p style={{ margin: 0, fontStyle: 'italic', color: '#57606a' }}>Clément PIROT EI - KLMT Events &bull; Date du Contrat : {viewingContrat.dateContrat}</p>
              </div>

              <h4 style={{ color: '#8e24aa', borderBottom: '1px solid #d0d7de', paddingBottom: '5px' }}>Entre les soussignés :</h4>
              <p><strong>Le Prestataire :</strong> Clément PIROT EI exerçant sous l'enseigne <strong>KLMT Events</strong>, domicilié à Nantes, Siret 949 123 456 00012, joignable par email à clement@klmtevents.com ou par téléphone au 06 43 00 00 00. Ci-après dénommé "Le DJ".</p>
              <p><strong>D'une part,</strong></p>
              <p><strong>Le Client :</strong> <strong>{viewingContrat.clientNom}</strong>, représenté par {viewingContrat.clientRepresentant || 'le responsable légal'}, ci-après dénommé "Le Client".</p>
              <p><strong>D'autre part,</strong></p>

              <h4 style={{ color: '#8e24aa', borderBottom: '1px solid #d0d7de', paddingBottom: '5px', marginTop: '20px' }}>Il a été convenu et arrêté ce qui suit :</h4>
              
              <h5 style={{ margin: '15px 0 5px 0', color: '#1f2328' }}>Article 1 - Objet du Contrat</h5>
              <p>Le Client engage Le DJ pour réaliser une prestation d'animation musicale en direct (DJing) pour l'événement prévu le <strong>{viewingContrat.prestationDate}</strong>. L'événement se déroulera dans les locaux désignés par Le Client.</p>
              
              <h5 style={{ margin: '15px 0 5px 0', color: '#1f2328' }}>Article 2 - Horaires & Conditions Techniques</h5>
              <p>La prestation musicale est planifiée selon les horaires suivants : <strong>{viewingContrat.prestationHoraires}</strong>. Le type d'ambiance musicale convenu est orienté : <em>{viewingContrat.prestationTypeAmbiance}</em>. Le DJ fournit son matériel de mix (Régie DDJ/PC) et s'engage à respecter les consignes de sécurité de l'établissement. Le Client s'engage à fournir un emplacement stable et une prise d'alimentation électrique 16A sécurisée.</p>

              <h5 style={{ margin: '15px 0 5px 0', color: '#1f2328' }}>Article 3 - Conditions Financières</h5>
              <p>La prestation artistique est fixée au tarif forfaitaire et net de <strong>{viewingContrat.prestationTarif.toLocaleString('fr-FR')} EUR</strong> (TVA non applicable, art. 293 B du CGI). Pour réserver définitivement la date, un acompte de 30% (soit <strong>{viewingContrat.prestationAcompte.toLocaleString('fr-FR')} EUR</strong>) doit être versé par Le Client à la signature du présent contrat. Le solde restant (soit <strong>{viewingContrat.prestationSolde.toLocaleString('fr-FR')} EUR</strong>) devra être versé au DJ au plus tard à l'issue de la prestation musicale.</p>

              <h5 style={{ margin: '15px 0 5px 0', color: '#1f2328' }}>Article 4 - Annulation & Force Majeure</h5>
              <p>En cas d'annulation du fait du Client à moins de 14 jours de la prestation, l'acompte versé restera définitivement acquis au DJ. En cas d'annulation pour force majeure (maladie grave, accident du DJ), l'acompte sera intégralement restitué au Client, sans autre indemnité. En cas de dégradations du matériel du DJ par des tiers ou le public, le Client est responsable du remboursement des frais de réparation ou de remplacement.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px', marginTop: '40px', paddingTop: '20px', borderTop: '1px dashed #d0d7de' }}>
                <div>
                  <p style={{ fontWeight: 'bold' }}>Pour KLMT Events (Le DJ) :</p>
                  <p style={{ fontSize: '0.8rem', color: '#57606a' }}>Bon pour accord</p>
                  <p style={{ marginTop: '50px' }}>Signature : Clément PIROT</p>
                </div>
                <div>
                  <p style={{ fontWeight: 'bold' }}>Pour Le Client (Bon pour accord) :</p>
                  <p style={{ fontSize: '0.8rem', color: '#57606a' }}>Lu et approuvé - Date : ___________________</p>
                  <p style={{ marginTop: '50px' }}>Signature :</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModalOpen && fileToRename && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>✏️ Renommer le fichier sur FTP</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                Chemin : {fileToRename.path}
              </p>
              <div className="control-group">
                <label className="control-label" style={{ marginBottom: '5px' }}>Nouveau nom du fichier :</label>
                <input
                  type="text"
                  value={newNameInput}
                  onChange={(e) => setNewNameInput(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setRenameModalOpen(false)} className="btn btn-secondary">
                Annuler
              </button>
              <button onClick={handleRenameSubmit} className="btn btn-primary">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="toasts-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast ${
              toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : ''
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '1.1rem', marginLeft: '10px' }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <footer>Développé par Gemini CLI &bull; DJ Music Assistant 2026</footer>
    </div>
  );
}
