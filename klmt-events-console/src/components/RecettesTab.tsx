'use client';

import React, { useState } from 'react';
import { Recette, DevisFacture, Client } from '@/types';

interface RecettesTabProps {
  recettes: Recette[];
  devisFactures: DevisFacture[];
  clients: Client[];
  refreshData: () => Promise<void>;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const convertToInputDateFormat = (dateStr: string) => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateStr;
};

const convertToDbDateFormat = (dateStr: string) => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export default function RecettesTab({
  recettes,
  devisFactures,
  clients,
  refreshData,
  addToast
}: RecettesTabProps) {
  const [recetteModalOpen, setRecetteModalOpen] = useState(false);
  const [editingRecette, setEditingRecette] = useState<Recette | null>(null);
  const [recetteForm, setRecetteForm] = useState({
    dateEncaissement: '',
    numeroFacture: '',
    client: '',
    naturePrestation: '',
    montantHt: 0,
    modeReglement: 'Virement'
  });

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

  const handleOpenEditRecette = (recette: Recette) => {
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

    const selectedFacture = devisFactures.find((df) => df.numero === numFacture && df.type === 'FACTURE');
    if (selectedFacture) {
      const dejaEncaiss = recettes
        .filter((r) => r.numeroFacture === numFacture && r.id !== editingRecette?.id)
        .reduce((sum, r) => sum + (r.montantHt || 0), 0);

      const soldeRestant = Math.max(0, (selectedFacture.totalHt || 0) - dejaEncaiss);

      setRecetteForm({
        ...recetteForm,
        numeroFacture: numFacture,
        client: selectedFacture.clientNom || '',
        naturePrestation: selectedFacture.items?.[0]?.designation || `Règlement facture ${numFacture}`,
        montantHt: parseFloat(soldeRestant.toFixed(2))
      });
    }
  };

  const handleSaveRecetteSubmit = async () => {
    const numFacture = recetteForm.numeroFacture.trim();
    if (!numFacture || !recetteForm.client.trim() || !recetteForm.naturePrestation.trim() || recetteForm.montantHt <= 0) {
      addToast('Veuillez remplir tous les champs obligatoires et saisir un montant positif.', 'error');
      return;
    }

    // Validation locale par rapport à la facture
    const selectedFacture = devisFactures.find((df) => df.numero === numFacture && df.type === 'FACTURE');
    if (!selectedFacture) {
      addToast(`La facture "${numFacture}" n'existe pas.`, 'error');
      return;
    }

    const dejaEncaiss = recettes
      .filter((r) => r.numeroFacture === numFacture && r.id !== editingRecette?.id)
      .reduce((sum, r) => sum + (r.montantHt || 0), 0);

    const resteAPayer = selectedFacture.totalHt - dejaEncaiss;
    if (recetteForm.montantHt > resteAPayer + 0.01) {
      addToast(`Le montant saisi (${recetteForm.montantHt} €) dépasse le reste à payer sur cette facture (${resteAPayer.toFixed(2)} €).`, 'error');
      return;
    }

    try {
      const response = await fetch('/api/recettes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRecette?.id || null,
          dateEncaissement: recetteForm.dateEncaissement.trim(),
          numeroFacture: numFacture,
          client: recetteForm.client.trim(),
          naturePrestation: recetteForm.naturePrestation.trim(),
          montantHt: parseFloat(recetteForm.montantHt.toString()),
          modeReglement: recetteForm.modeReglement
        })
      });

      if (response.ok) {
        addToast(editingRecette ? 'Encaissement modifié avec succès !' : 'Encaissement enregistré avec succès !', 'success');
        setRecetteModalOpen(false);
        await refreshData();
      } else {
        const errData = await response.json().catch(() => ({ error: 'Erreur lors de la sauvegarde' }));
        addToast(`Erreur encaissement : ${errData.error}`, 'error');
      }
    } catch (err: any) {
      addToast(`Erreur lors de l'enregistrement : ${err.message}`, 'error');
    }
  };

  const handleDeleteRecetteClick = async (id: string, ref: string) => {
    if (confirm(`Supprimer définitivement l'encaissement réf ${ref} ?`)) {
      try {
        const response = await fetch(`/api/recettes?id=${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          addToast('Encaissement supprimé avec succès !', 'success');
          await refreshData();
        } else {
          const errData = await response.json().catch(() => ({ error: 'Erreur lors de la suppression' }));
          addToast(`Erreur encaissement : ${errData.error}`, 'error');
        }
      } catch (err: any) {
        addToast(`Erreur lors de la suppression : ${err.message}`, 'error');
      }
    }
  };

  return (
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
            {recettes.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '15px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Aucun encaissement enregistré.
                </td>
              </tr>
            ) : (
              recettes.map((r) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Recette Modal */}
      {recetteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>📊 {editingRecette ? 'Modifier l\'encaissement' : 'Saisir un nouvel Encaissement'}</h3>
            </div>
            <div className="modal-body">
              <div className="control-group" style={{ marginBottom: '15px' }}>
                <label className="control-label">Date Encaissement :</label>
                <input
                  type="date"
                  value={convertToInputDateFormat(recetteForm.dateEncaissement)}
                  onChange={(e) => setRecetteForm({ ...recetteForm, dateEncaissement: convertToDbDateFormat(e.target.value) })}
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
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px', backgroundColor: '#0d1117', border: '1px solid var(--border-color)', color: '#ffffff', borderRadius: '8px', cursor: 'pointer' }}
                />
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
                    .filter((df) => {
                      if (df.type !== 'FACTURE') return false;
                      if (df.numero === recetteForm.numeroFacture) return true;

                      const dejaEncaiss = recettes
                        .filter((r) => r.numeroFacture === df.numero && r.id !== editingRecette?.id)
                        .reduce((sum, r) => sum + (r.montantHt || 0), 0);

                      return (df.totalHt || 0) - dejaEncaiss > 0.01;
                    })
                    .map((df) => (
                      <option key={df.id} value={df.numero}>
                        {df.numero} &bull; {df.clientNom} ({df.totalHt} € HT)
                      </option>
                    ))}
                  {recetteForm.numeroFacture && !devisFactures.some((df) => df.numero === recetteForm.numeroFacture) && (
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
                  {clients.map((c) => <option key={c.id} value={c.nom} />)}
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
    </div>
  );
}
