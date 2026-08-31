'use client';

import React, { useState } from 'react';
import { Recette, DevisFacture, Contrat } from '@/types';

interface DashboardTabProps {
  recettes: Recette[];
  devisFactures: DevisFacture[];
  contrats: Contrat[];
  manualTasks: any[];
  saveManualTasks: (tasks: any[]) => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const getTodayDateStringForSeverity = (severity: 'high' | 'warning' | 'info') => {
  const today = new Date();
  let daysToAdd = 3; // 'warning' (Moyenne)
  if (severity === 'high') {
    daysToAdd = 1; // 'high' (Élevée)
  } else if (severity === 'info') {
    daysToAdd = 7; // 'info' (Faible)
  }
  today.setDate(today.getDate() + daysToAdd);
  const d = String(today.getDate()).padStart(2, '0');
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const y = today.getFullYear();
  return `${y}-${m}-${d}`;
};

export default function DashboardTab({
  recettes,
  devisFactures,
  contrats,
  manualTasks,
  saveManualTasks,
  addToast
}: DashboardTabProps) {
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Manual Tasks State
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskSeverity, setNewTaskSeverity] = useState<'high' | 'warning' | 'info'>('warning');
  const [newTaskDate, setNewTaskDate] = useState(() => getTodayDateStringForSeverity('warning'));
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const handleStartEditManualTask = (task: any) => {
    setEditingTaskId(task.id);
    setNewTaskLabel(task.label);
    setNewTaskDescription(task.description || '');
    setNewTaskSeverity(task.severity);
    
    // Convert dd/mm/yyyy to yyyy-mm-dd
    const parts = task.date.split('/');
    if (parts.length === 3) {
      setNewTaskDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      setNewTaskDate(getTodayDateStringForSeverity(task.severity));
    }
    
    setShowAddTaskForm(true);
  };

  const handleSaveManualTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskLabel.trim()) return;

    let taskDate = newTaskDate;
    if (!taskDate) {
      const todayObj = new Date();
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

    if (editingTaskId) {
      // Edit mode
      const updated = manualTasks.map(t => {
        if (t.id === editingTaskId) {
          return {
            ...t,
            label: newTaskLabel.trim(),
            description: newTaskDescription.trim() || undefined,
            date: taskDate,
            severity: newTaskSeverity
          };
        }
        return t;
      });
      saveManualTasks(updated);
      setEditingTaskId(null);
      addToast('Tâche modifiée avec succès !', 'success');
    } else {
      // Add mode
      const newTask = {
        id: `manual-${Date.now()}`,
        label: newTaskLabel.trim(),
        description: newTaskDescription.trim() || undefined,
        date: taskDate,
        type: '📌 Manuel',
        severity: newTaskSeverity
      };
      saveManualTasks([...manualTasks, newTask]);
      addToast('Tâche ajoutée avec succès !', 'success');
    }

    setNewTaskLabel('');
    setNewTaskDescription('');
    setNewTaskSeverity('warning');
    setNewTaskDate(getTodayDateStringForSeverity('warning'));
    setShowAddTaskForm(false);
  };

  const handleDeleteManualTask = (id: string) => {
    const updated = manualTasks.filter(t => t.id !== id);
    saveManualTasks(updated);
    addToast('Tâche accomplie !', 'success');
  };

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

  const getPendingTasks = () => {
    const tasks: { id: string; label: string; description?: string; date: string; type: string; severity: 'high' | 'warning' | 'info' }[] = [];
    const TODAY = new Date();

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
            tasks.push({
              id: `devis-${df.id}`,
              label: `Émettre la facture finale pour le devis validé ${df.numero} (${df.clientNom})`,
              date: df.datePrestation || df.dateEmission || 'Date inconnue',
              type: '⚡ Facture à émettre',
              severity: 'info'
            });
          }
        }

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

    if (Array.isArray(manualTasks)) {
      manualTasks.forEach((t: any) => {
        tasks.push(t);
      });
    }

    const severityOrder = { high: 0, warning: 1, info: 2 };
    return tasks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]).slice(0, 5);
  };

  const pendingTasks = getPendingTasks();

  const getUpcomingPrestations = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parseDateToObjLocal = (dateStr: string) => {
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

    return devisFactures
      .filter((df: any) => {
        const isValidated = df.status === 'VALIDÉ' || df.status === 'PAYÉ' || df.status === 'ENVOYÉ';
        if (!isValidated) return false;

        const pDate = parseDateToObjLocal(df.datePrestation);
        return pDate && pDate.getTime() >= today.getTime();
      })
      .sort((a, b) => {
        const dateA = parseDateToObjLocal(a.datePrestation)?.getTime() || 0;
        const dateB = parseDateToObjLocal(b.datePrestation)?.getTime() || 0;
        return dateA - dateB;
      })
      .slice(0, 5);
  };

  const upcomingPrestations = getUpcomingPrestations();

  return (
    <div>
      {/* 1. En-tête d'accueil chaleureux et intemporel */}
      <div style={{
        marginBottom: '25px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '15px'
      }}>
        <h3 style={{ margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
          👋 Bonjour Clément !
        </h3>
        <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Ravi de vous revoir. Voici votre <strong>tour de contrôle opérationnelle</strong> pour piloter l'activité de <strong>KLMT Events</strong> en temps réel.
        </p>
      </div>

      {/* 2. Centre d'Opérations : Prestations à Venir & Tâches à traiter en haut de l'écran */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', width: '100%', marginBottom: '30px' }}>
        
        {/* Colonne Gauche : Agenda des Prestations à Venir */}
        <div style={{
          flex: '1.2',
          minWidth: '320px',
          backgroundColor: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📅 Prestations à Venir ({upcomingPrestations.length})
          </h4>
          
          {upcomingPrestations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 15px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Aucune prestation validée ou facturée programmée prochainement.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {upcomingPrestations.map((df) => {
                // Determine status badge
                let statusText = 'Validé';
                let badgeColor = '#f59e0b';
                let badgeBg = 'rgba(245, 158, 11, 0.12)';

                if (df.type === 'FACTURE' && df.status === 'PAYÉ') {
                  statusText = 'Payé';
                  badgeColor = '#10b981';
                  badgeBg = 'rgba(16, 185, 129, 0.12)';
                } else {
                  const assocContrat = contrats.find(c => c.prestationDate === df.datePrestation && c.clientNom === df.clientNom);
                  if (assocContrat?.status === 'SIGNÉ') {
                    statusText = 'Signé';
                    badgeColor = '#3b82f6';
                    badgeBg = 'rgba(59, 130, 246, 0.12)';
                  } else {
                    statusText = 'En attente';
                    badgeColor = '#f59e0b';
                    badgeBg = 'rgba(245, 158, 11, 0.12)';
                  }
                }

                // Date parts
                const dateParts = df.datePrestation.split('/');
                const dayNum = dateParts[0] || '??';
                const monthIndex = dateParts[1] ? parseInt(dateParts[1], 10) - 1 : -1;
                const monthLabel = monthIndex >= 0 && monthIndex < 12 ? monthsNames[monthIndex] : 'Mois';
                const yearNum = dateParts[2] || '????';

                return (
                  <div key={df.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 15px',
                    backgroundColor: 'rgba(255, 255, 255, 0.015)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    gap: '15px',
                    flexWrap: 'wrap',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      {/* Mini Calendar Badge */}
                      <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-color)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        textAlign: 'center',
                        minWidth: '45px',
                        lineHeight: '1.2',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                          {monthLabel}
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ffffff', margin: '2px 0 1px 0' }}>
                          {dayNum}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                          {yearNum}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: '#ffffff', fontSize: '0.92rem', fontWeight: 'bold' }}>
                          {df.clientNom}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🎧 {df.items[0]?.designation || 'Prestation Événementielle'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ color: '#00e676', fontSize: '0.95rem', fontWeight: 'bold' }}>
                          {df.totalHt.toLocaleString('fr-FR')} € HT
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                          {df.numero}
                        </div>
                      </div>
                      
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: badgeColor,
                        backgroundColor: badgeBg,
                        border: `1px solid ${badgeColor}22`,
                        padding: '5px 12px',
                        borderRadius: '15px',
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                        minWidth: '65px'
                      }}>
                        {statusText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Colonne Droite : Liste des Tâches Prioritaires */}
        <div style={{
          flex: '1',
          minWidth: '320px',
          backgroundColor: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📋 Tâches Prioritaires ({pendingTasks.length})
            </h4>
            <button
              onClick={() => {
                setShowAddTaskForm(prev => {
                  const nextVal = !prev;
                  if (nextVal) {
                    setNewTaskLabel('');
                    setNewTaskDescription('');
                    setNewTaskSeverity('warning');
                    setNewTaskDate(getTodayDateStringForSeverity('warning'));
                    setEditingTaskId(null);
                  } else {
                    setEditingTaskId(null);
                  }
                  return nextVal;
                });
              }}
              className="btn btn-secondary"
              style={{ padding: '4px 12px', fontSize: '0.8rem', height: '28px', lineHeight: '1' }}
            >
              {showAddTaskForm ? (editingTaskId ? '❌ Annuler' : '❌ Fermer') : '➕ Ajouter'}
            </button>
          </div>
        
        {pendingTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '15px', color: '#00e676', fontWeight: 'bold', fontSize: '0.9rem' }}>
            🎉 Félicitations ! Toutes vos prestations et factures sont parfaitement à jour.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingTasks.map((t) => {
              let badgeColor = '#ffffff';
              let badgeBg = 'rgba(255,255,255,0.05)';
              let itemBorder = '1px solid var(--border-color)';
              
              if (t.severity === 'high') {
                badgeColor = '#ff4d4f';
                badgeBg = 'rgba(255, 77, 79, 0.12)';
                itemBorder = '1px solid rgba(255, 77, 79, 0.2)';
              } else if (t.severity === 'warning') {
                badgeColor = '#faad14';
                badgeBg = 'rgba(250, 173, 20, 0.12)';
                itemBorder = '1px solid rgba(250, 173, 20, 0.2)';
              } else if (t.severity === 'info') {
                badgeColor = '#1890ff';
                badgeBg = 'rgba(24, 144, 255, 0.12)';
                itemBorder = '1px solid rgba(24, 144, 255, 0.2)';
              }

              return (
                <div key={t.id} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px 15px',
                  backgroundColor: 'rgba(255, 255, 255, 0.015)',
                  border: itemBorder,
                  borderRadius: '8px',
                  gap: '10px'
                }}>
                  {/* Ligne 1 : Badge et Date d'Échéance alignés */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      color: badgeColor,
                      backgroundColor: badgeBg,
                      border: `1px solid ${badgeColor}22`,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      whiteSpace: 'nowrap'
                    }}>
                      {t.type}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Échéance : <strong style={{ color: '#ffffff' }}>{t.date}</strong>
                    </span>
                  </div>

                  {/* Ligne 2 : Titre de l'alerte en pleine largeur */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#ffffff', fontSize: '0.88rem', fontWeight: 'bold', lineHeight: '1.4' }}>
                      {t.label}
                    </span>
                    {t.description && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                        {t.description}
                      </span>
                    )}
                  </div>

                  {/* Ligne 3 (Optionnelle) : Boutons d'action pour tâches manuelles */}
                  {t.type === '📌 Manuel' && (
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      marginTop: '4px',
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      paddingTop: '8px'
                    }}>
                      <button
                        onClick={() => handleStartEditManualTask(t)}
                        style={{
                          background: 'rgba(24, 144, 255, 0.1)',
                          border: '1px solid rgba(24, 144, 255, 0.3)',
                          color: '#1890ff',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          transition: 'all 0.2s'
                        }}
                        title="Modifier la tâche"
                      >
                        ✏️ Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteManualTask(t.id)}
                        style={{
                          background: 'rgba(0, 230, 118, 0.1)',
                          border: '1px solid rgba(0, 230, 118, 0.3)',
                          color: '#00e676',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          transition: 'all 0.2s'
                        }}
                        title="Marquer comme accomplie (supprimer)"
                      >
                        ✓ Fait
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modale Popup de Saisie/Édition de Tâche */}
        {showAddTaskForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}>
            <form onSubmit={handleSaveManualTask} style={{
              backgroundColor: 'var(--card-bg, #161b22)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '25px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
              <h3 style={{ margin: '0 0 5px 0', color: '#ffffff', fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                {editingTaskId ? '✏️ Modifier la Tâche' : '➕ Ajouter une Tâche'}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Titre :</label>
                <input
                  type="text"
                  value={newTaskLabel}
                  onChange={(e) => setNewTaskLabel(e.target.value)}
                  placeholder="Titre de la tâche..."
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#0d1117', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#ffffff', fontSize: '0.9rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Description :</label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation(); // Évite de soumettre le formulaire
                    }
                  }}
                  placeholder="Description détaillée (Entrée pour aller à la ligne)..."
                  rows={4}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px',
                    backgroundColor: '#0d1117',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: '1.4'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Date d'échéance :</label>
                  <input
                    type="date"
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    onFocus={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px', backgroundColor: '#0d1117', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#ffffff', fontSize: '0.9rem', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Priorité :</label>
                  <select
                    value={newTaskSeverity}
                    onChange={(e) => {
                      const val = e.target.value as 'high' | 'warning' | 'info';
                      setNewTaskSeverity(val);
                      setNewTaskDate(getTodayDateStringForSeverity(val));
                    }}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#0d1117', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#ffffff', fontSize: '0.9rem' }}
                  >
                    <option value="high">🔴 Élevée</option>
                    <option value="warning">🟡 Moyenne</option>
                    <option value="info">🔵 Faible</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTaskForm(false);
                    setEditingTaskId(null);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '8px 15px', fontSize: '0.9rem' }}
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.9rem' }}
                >
                  {editingTaskId ? '💾 Enregistrer' : '➕ Ajouter'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>  {/* Ferme la Colonne Droite */}
    </div>  {/* Ferme le conteneur Flexbox en 2 colonnes */}

    {/* 3. Section Basse : Statistiques & Bilan Financier (Annuel) */}
    <div style={{
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      paddingTop: '25px',
      marginBottom: '15px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h4 style={{ margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
            📊 Statistiques & Performances Financières
          </h4>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Suivi du chiffre d'affaires (HT), nombre de prestations et panier moyen de Clément pour l'année sélectionnée
          </p>
        </div>
        
        {/* Filtre de l'année déplacé au sein de la section financière */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setSelectedYear(prev => prev - 1)}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.9rem', fontWeight: 'bold' }}
            title="Année précédente"
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
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: '#ffffff',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              padding: '6px 20px',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              userSelect: 'none',
              minWidth: '60px',
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
            title="Année suivante"
          >
            ▶
          </button>
        </div>
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

    {/* Graphique de CA Mensuel en pleine largeur tout en bas */}
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.01)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '20px',
      boxSizing: 'border-box'
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
  </div>
  );
}
