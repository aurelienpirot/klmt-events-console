'use client';

import React, { useState, useEffect } from 'react';
import DashboardTab from '@/components/DashboardTab';
import ClientsTab from '@/components/ClientsTab';
import DevisFacturesTab from '@/components/DevisFacturesTab';
import ContratsTab from '@/components/ContratsTab';
import RecettesTab from '@/components/RecettesTab';
import CalendarTab from '@/components/CalendarTab';
import { Client, Recette, DevisFacture, Contrat, Indisponibilite } from '@/types';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function Home() {
  const [mgmtSubTab, setMgmtSubTab] = useState<'dashboard' | 'clients' | 'documents' | 'contrats' | 'encaissements' | 'calendar'>('dashboard');
  const [clients, setClients] = useState<Client[]>([]);
  const [recettes, setRecettes] = useState<Recette[]>([]);
  const [devisFactures, setDevisFactures] = useState<DevisFacture[]>([]);
  const [contrats, setContrats] = useState<Contrat[]>([]);
  const [indisponibilites, setIndisponibilites] = useState<Indisponibilite[]>([]);
  const [manualTasks, setManualTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

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

  const refreshAllData = async () => {
    try {
      const [resClients, resRecettes, resDf, resContrats, resIndisp, resTasks] = await Promise.all([
        fetch('/api/clients').then(r => r.json()),
        fetch('/api/recettes').then(r => r.json()),
        fetch('/api/devis-factures').then(r => r.json()),
        fetch('/api/contrats').then(r => r.json()),
        fetch('/api/indisponibilites').then(r => r.json()),
        fetch('/api/tasks').then(r => r.json())
      ]);
      
      if (resClients.error || resRecettes.error || resDf.error || resContrats.error || resIndisp.error || resTasks.error) {
        throw new Error("Certaines requêtes d'API ont échoué.");
      }

      setClients(resClients);
      setRecettes(resRecettes);
      setDevisFactures(resDf);
      setContrats(resContrats);
      setIndisponibilites(resIndisp);
      setManualTasks(resTasks);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("Erreur de chargement des données. Veuillez vérifier l'API.");
      addToast("Erreur de synchronisation !", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const saveManualTasks = async (tasks: any[]) => {
    setManualTasks(tasks);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tasks)
      });
      if (!response.ok) {
        addToast("Erreur lors de la sauvegarde de la tâche.", "error");
      }
    } catch (e) {
      console.error(e);
      addToast("Erreur lors de la sauvegarde de la tâche.", "error");
    }
  };

  if (loading) {
    return <div style={{ color: '#ffffff', textAlign: 'center', marginTop: '100px', fontSize: '1.2rem' }}>Chargement de la console KLMT Events...</div>;
  }

  return (
    <div className="container">
      <header>
        <h1>💼 Console de Gestion KLMT Events</h1>
        <p className="subtitle">Dashboard Financier, Facturation & Gestion de Prestations pour Clément</p>
      </header>

      {error && <div style={{ backgroundColor: 'rgba(244,63,94,0.1)', border: '1px solid var(--danger-color)', color: '#f43f5e', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', overflowX: 'auto' }}>
        <button onClick={() => setMgmtSubTab('dashboard')} className={`btn ${mgmtSubTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 15px', fontSize: '0.9rem' }}>🏠 Accueil</button>
        <button onClick={() => setMgmtSubTab('clients')} className={`btn ${mgmtSubTab === 'clients' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 15px', fontSize: '0.9rem' }}>👥 Clients</button>
        <button onClick={() => setMgmtSubTab('documents')} className={`btn ${mgmtSubTab === 'documents' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 15px', fontSize: '0.9rem' }}>📄 Devis & Factures</button>
        <button onClick={() => setMgmtSubTab('contrats')} className={`btn ${mgmtSubTab === 'contrats' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 15px', fontSize: '0.9rem' }}>✍️ Contrats Booking</button>
        <button onClick={() => setMgmtSubTab('encaissements')} className={`btn ${mgmtSubTab === 'encaissements' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 15px', fontSize: '0.9rem' }}>💰 Encaissements</button>
        <button onClick={() => setMgmtSubTab('calendar')} className={`btn ${mgmtSubTab === 'calendar' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 15px', fontSize: '0.9rem' }}>📅 Calendrier Événementiel</button>
      </div>

      <main style={{ minHeight: '400px' }}>
        {mgmtSubTab === 'dashboard' && <DashboardTab recettes={recettes} devisFactures={devisFactures} contrats={contrats} manualTasks={manualTasks} saveManualTasks={saveManualTasks} addToast={addToast} />}
        {mgmtSubTab === 'clients' && <ClientsTab clients={clients} refreshData={refreshAllData} addToast={addToast} />}
        {mgmtSubTab === 'documents' && <DevisFacturesTab devisFactures={devisFactures} clients={clients} recettes={recettes} refreshData={refreshAllData} addToast={addToast} />}
        {mgmtSubTab === 'contrats' && <ContratsTab contrats={contrats} devisFactures={devisFactures} refreshData={refreshAllData} addToast={addToast} />}
        {mgmtSubTab === 'encaissements' && <RecettesTab recettes={recettes} devisFactures={devisFactures} clients={clients} refreshData={refreshAllData} addToast={addToast} />}
        {mgmtSubTab === 'calendar' && <CalendarTab devisFactures={devisFactures} contrats={contrats} indisponibilites={indisponibilites} refreshData={refreshAllData} addToast={addToast} />}
      </main>

      {/* Toasts */}
      <div className="toasts-container" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
        {toasts.map(t => (
          <div key={t.id} onClick={() => removeToast(t.id)} className={`toast ${t.type}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderRadius: '6px', marginBottom: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', cursor: 'pointer', minWidth: '250px', backgroundColor: t.type === 'success' ? 'var(--success-color)' : t.type === 'error' ? 'var(--danger-color)' : 'var(--info-color)', color: '#ffffff', fontSize: '0.9rem' }}>
            <span>{t.message}</span>
            <span style={{ marginLeft: '15px', opacity: 0.7, fontSize: '0.8rem' }}>✕</span>
          </div>
        ))}
      </div>
    </div>
  );
}
