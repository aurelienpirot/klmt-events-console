'use client';

import React, { useState } from 'react';
import { DevisFacture, Contrat, Indisponibilite } from '@/types';

interface CalendarTabProps {
  devisFactures: DevisFacture[];
  contrats: Contrat[];
  indisponibilites: Indisponibilite[];
  refreshData: () => Promise<void>;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function CalendarTab({
  devisFactures,
  contrats,
  indisponibilites,
  refreshData,
  addToast
}: CalendarTabProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [blockMotif, setBlockMotif] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Date Calculations
  const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Helper functions
  const getPrestationsForDate = (dateStr: string) => {
    return devisFactures.filter(df => df.datePrestation === dateStr);
  };

  const getPrestationColor = (df: DevisFacture) => {
    if (df.type === 'FACTURE' && df.status === 'PAYÉ') {
      return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', text: 'Payé', className: 'badge-paid' }; // VERT
    }
    const assocContrat = contrats.find(c => c.prestationDate === df.datePrestation && c.clientNom === df.clientNom);
    if (assocContrat?.status === 'SIGNÉ') {
      return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', text: 'Signé', className: 'badge-signed' }; // BLEU
    }
    if (df.status === 'VALIDÉ' || assocContrat?.status === 'EN_ATTENTE') {
      return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', text: 'En attente', className: 'badge-pending' }; // ORANGE
    }
    return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', text: df.status, className: 'badge-pending' };
  };

  const truncateText = (text: string, maxLen = 14) => {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
  };

  // Day cell click handler
  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const existing = indisponibilites.find(i => i.date === dateStr);
    setBlockMotif(existing ? existing.motif : '');
  };

  // Actions
  const handleBlockDate = async () => {
    if (!selectedDateStr) return;
    if (!blockMotif.trim()) {
      addToast('Veuillez saisir un motif pour bloquer cette date.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/indisponibilites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDateStr,
          motif: blockMotif.trim()
        })
      });
      if (response.ok) {
        addToast(`La date ${selectedDateStr} a été bloquée.`, 'success');
        setSelectedDateStr(null);
        await refreshData();
      } else {
        const err = await response.json();
        addToast(`Erreur : ${err.error || response.statusText}`, 'error');
      }
    } catch (err: any) {
      addToast(`Erreur : ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnblockDate = async (id: string) => {
    if (!confirm('Voulez-vous débloquer cette date et la rendre disponible ?')) {
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/indisponibilites?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        addToast('La date est à présent disponible !', 'success');
        setSelectedDateStr(null);
        await refreshData();
      } else {
        const err = await response.json();
        addToast(`Erreur : ${err.error || response.statusText}`, 'error');
      }
    } catch (err: any) {
      addToast(`Erreur : ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <style>{`
        .cal-day-cell {
          background-color: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 8px;
          min-height: 100px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }
        .cal-day-cell:hover {
          border-color: var(--accent-color);
          background-color: rgba(156, 39, 176, 0.05);
          transform: translateY(-2px);
        }
        .cal-day-today {
          border: 2px solid var(--accent-color) !important;
          box-shadow: 0 0 10px rgba(156, 39, 176, 0.2);
        }
        .cal-badge {
          display: block;
          font-size: 0.75rem;
          padding: 3px 6px;
          border-radius: 4px;
          margin-top: 4px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: left;
        }
        .badge-indisp {
          background-color: rgba(244, 63, 94, 0.12);
          color: #f43f5e;
          border: 1px solid rgba(244, 63, 94, 0.2);
        }
        .badge-paid {
          background-color: rgba(16, 185, 129, 0.12);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .badge-signed {
          background-color: rgba(59, 130, 246, 0.12);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .badge-pending {
          background-color: rgba(245, 158, 11, 0.12);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
      `}</style>

      {/* Header with Month / Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#ffffff' }}>📅 Calendrier Événementiel</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={handlePrevMonth} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
            ◀ Précédent
          </button>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ffffff', minWidth: '150px', textAlign: 'center' }}>
            {MONTHS_FR[currentMonth]} {currentYear}
          </span>
          <button onClick={handleNextMonth} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
            Suivant ▶
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '15px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f59e0b', display: 'inline-block' }}></span>
          <span>Contrat en attente / Devis validé (Orange)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#3b82f6', display: 'inline-block' }}></span>
          <span>Contrat signé / Acompte payé (Bleu)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#10b981', display: 'inline-block' }}></span>
          <span>Facture payée (Vert)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f43f5e', display: 'inline-block' }}></span>
          <span>Indisponible / Bloqué (Rouge)</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '20px' }}>
        {/* Days Header */}
        {DAYS_FR.map((day) => (
          <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)', paddingBottom: '8px', fontSize: '0.9rem' }}>
            {day}
          </div>
        ))}

        {/* Empty cells before month start */}
        {Array.from({ length: firstDayIndex }).map((_, idx) => (
          <div key={`empty-${idx}`} style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', minHeight: '100px' }} />
        ))}

        {/* Month Days */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const d = idx + 1;
          const dateStr = `${String(d).padStart(2, '0')}/${String(currentMonth + 1).padStart(2, '0')}/${currentYear}`;
          
          const isToday = today.getDate() === d && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
          const dayPrestations = getPrestationsForDate(dateStr);
          const dayIndisp = indisponibilites.find(i => i.date === dateStr);

          return (
            <div
              key={`day-${d}`}
              onClick={() => handleDayClick(dateStr)}
              className={`cal-day-cell ${isToday ? 'cal-day-today' : ''}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: isToday ? 'bold' : 'normal', 
                  color: isToday ? 'var(--accent-hover)' : 'var(--text-muted)',
                  backgroundColor: isToday ? 'rgba(156, 39, 176, 0.15)' : 'transparent',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {d}
                </span>
              </div>

              {/* Badges container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%', marginTop: '5px' }}>
                {dayIndisp && (
                  <div className="cal-badge badge-indisp" title={dayIndisp.motif}>
                    🚫 {truncateText(dayIndisp.motif, 12)}
                  </div>
                )}
                {dayPrestations.map((df) => {
                  const badgeInfo = getPrestationColor(df);
                  return (
                    <div key={df.id} className={`cal-badge ${badgeInfo.className}`} title={`${df.clientNom} - ${df.type} ${df.numero}`}>
                      🎵 {truncateText(df.clientNom, 12)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Date Detail / Block Modal */}
      {selectedDateStr && (
        <div className="modal-overlay" onClick={() => setSelectedDateStr(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>📅 Détails du {selectedDateStr}</h3>
            </div>
            
            <div className="modal-body" style={{ color: '#ffffff' }}>
              {/* Prestations list */}
              <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginTop: 0, color: 'var(--accent-hover)' }}>
                🎵 Prestations prévues ({getPrestationsForDate(selectedDateStr).length})
              </h4>
              
              {getPrestationsForDate(selectedDateStr).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: '10px 0 20px 0' }}>Aucune prestation prévue ce jour.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                  {getPrestationsForDate(selectedDateStr).map((df) => {
                    const contract = contrats.find(c => c.prestationDate === df.datePrestation && c.clientNom === df.clientNom);
                    const badgeInfo = getPrestationColor(df);
                    return (
                      <div key={df.id} style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '1.05rem', color: '#ffffff' }}>{df.clientNom}</strong>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontWeight: 'bold',
                            color: badgeInfo.color,
                            backgroundColor: badgeInfo.bg,
                            border: `1px solid ${badgeInfo.color}33`
                          }}>
                            {badgeInfo.text}
                          </span>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                          <div>
                            <strong>Document :</strong> {df.type} {df.numero}
                          </div>
                          <div>
                            <strong>Total :</strong> {df.totalTtc.toLocaleString('fr-FR')} € TTC
                          </div>
                          <div>
                            <strong>Horaires :</strong> {contract?.prestationHoraires || 'Non définis'}
                          </div>
                          <div>
                            <strong>Type de soirée :</strong> {contract?.prestationTypeAmbiance || 'Non défini'}
                          </div>
                        </div>
                        
                        {contract && (
                          <div style={{ marginTop: '8px', fontSize: '0.85rem', color: contract.status === 'SIGNÉ' ? '#10b981' : '#f59e0b' }}>
                            {contract.status === 'SIGNÉ' ? '✍️ Contrat signé & acompte payé' : '⏳ Contrat en attente de signature'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Availability Status */}
              <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginTop: '20px', color: 'var(--accent-hover)' }}>
                🚫 Bloquer / Débloquer la date
              </h4>
              
              {(() => {
                const isIndisp = indisponibilites.find(i => i.date === selectedDateStr);
                if (isIndisp) {
                  return (
                    <div style={{ padding: '12px', backgroundColor: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '8px', marginTop: '10px' }}>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}>
                        Cette date est marquée comme <strong>indisponible</strong>.
                      </p>
                      <p style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        <strong>Motif :</strong> {isIndisp.motif}
                      </p>
                      <button 
                        onClick={() => handleUnblockDate(isIndisp.id)} 
                        className="btn btn-danger"
                        style={{ width: '100%', padding: '10px', fontSize: '0.95rem' }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Opération en cours...' : '🔓 Rendre la date DISPONIBLE'}
                      </button>
                    </div>
                  );
                } else {
                  return (
                    <div style={{ marginTop: '10px' }}>
                      <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Cette date est libre. Vous pouvez la bloquer pour signaler une indisponibilité (vacances, congé, événement perso, etc.).
                      </p>
                      <div className="control-group" style={{ marginBottom: '15px' }}>
                        <label className="control-label" style={{ fontSize: '0.9rem', marginBottom: '5px' }}>Motif du blocage :</label>
                        <input 
                          type="text" 
                          value={blockMotif} 
                          onChange={(e) => setBlockMotif(e.target.value)} 
                          placeholder="Ex: Vacances, Anniversaire, Événement privé..." 
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                      <button 
                        onClick={handleBlockDate} 
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '10px', fontSize: '0.95rem' }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Opération en cours...' : '🔒 Bloquer cette date'}
                      </button>
                    </div>
                  );
                }
              })()}
            </div>
            
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', marginTop: '20px' }}>
              <button onClick={() => setSelectedDateStr(null)} className="btn btn-secondary">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
