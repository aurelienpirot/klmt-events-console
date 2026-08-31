'use client';

import React, { useState } from 'react';
import { DevisFacture, Client, Recette, ItemDevis } from '@/types';

interface DevisFacturesTabProps {
  devisFactures: DevisFacture[];
  clients: Client[];
  recettes: Recette[];
  refreshData: () => Promise<void>;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function DevisFacturesTab({
  devisFactures,
  clients,
  recettes,
  refreshData,
  addToast
}: DevisFacturesTabProps) {
  const [dfModalOpen, setDevisFactureModalOpen] = useState(false);
  const [editingDf, setEditingDevisFacture] = useState<DevisFacture | null>(null);
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
  
  // Item edit state inside editor
  const [newItemForm, setNewItemForm] = useState({ designation: '', quantite: 1, unite: 'Forfait', prixUnitaire: 0 });

  // View/Print Modals
  const [dfViewModalOpen, setDfViewModalOpen] = useState(false);
  const [viewingDf, setViewingDf] = useState<DevisFacture | null>(null);

  const handleOpenAddDf = (type: 'DEVIS' | 'FACTURE') => {
    setEditingDevisFacture(null);
    const dateStr = new Date().toLocaleDateString('fr-FR');
    setDevisFactureForm({
      numero: type === 'DEVIS' ? `D2026-00${devisFactures.filter((df) => df.type === 'DEVIS').length + 1}` : `F2026-00${devisFactures.filter((df) => df.type === 'FACTURE').length + 1}`,
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

  const handleOpenEditDf = (df: DevisFacture) => {
    setEditingDevisFacture(df);
    setDevisFactureForm({
      numero: df.numero || '',
      type: df.type || 'DEVIS',
      dateEmission: df.dateEmission || '',
      datePrestation: df.datePrestation || '',
      clientNom: df.clientNom || '',
      clientAdresse: df.clientAdresse || '',
      validite: df.validite || '',
      items: df.items ? df.items.map((it) => ({
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

  const handleConvertToFacture = async (devis: DevisFacture) => {
    const nextFactureNum = `F2026-00${devisFactures.filter((df) => df.type === 'FACTURE').length + 1}`;
    const cleanedItems = devis.items ? devis.items.map((it) => ({
      designation: it.designation,
      quantite: it.quantite,
      unite: it.unite,
      prixUnitaire: it.prixUnitaire,
      montant: it.montant
    })) : [];

    try {
      const response = await fetch('/api/devis-factures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        })
      });
      if (response.ok) {
        addToast('Facture générée avec succès !', 'success');
        await refreshData();
      } else {
        const errData = await response.json();
        addToast(`Erreur facturation : ${errData.error || response.statusText}`, 'error');
      }
    } catch (err: any) {
      addToast(`Erreur facturation : ${err.message}`, 'error');
    }
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

  const handleSaveDfSubmit = async () => {
    if (!dfForm.numero.trim() || !dfForm.clientNom.trim() || dfForm.items.length === 0) {
      addToast('Veuillez spécifier un numéro, sélectionner un client et ajouter au moins un article.', 'error');
      return;
    }
    
    // Clean items before sending
    const cleanedItems = dfForm.items.map((it: any) => ({
      designation: it.designation,
      quantite: parseFloat(it.quantite.toString()),
      unite: it.unite,
      prixUnitaire: parseFloat(it.prixUnitaire.toString()),
      montant: parseFloat(it.montant.toString())
    }));

    try {
      const response = await fetch('/api/devis-factures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        })
      });
      if (response.ok) {
        addToast('Document enregistré avec succès !', 'success');
        setDevisFactureModalOpen(false);
        await refreshData();
      } else {
        const errData = await response.json();
        addToast(`Erreur document : ${errData.error || response.statusText}`, 'error');
      }
    } catch (err: any) {
      addToast(`Erreur document : ${err.message}`, 'error');
    }
  };

  const handleDeleteDfClick = async (id: string, num: string) => {
    if (confirm(`Supprimer définitivement le document ${num} ?`)) {
      try {
        const response = await fetch(`/api/devis-factures?id=${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          addToast('Document supprimé avec succès !', 'success');
          await refreshData();
        } else {
          const errData = await response.json();
          addToast(`Erreur suppression : ${errData.error || response.statusText}`, 'error');
        }
      } catch (err: any) {
        addToast(`Erreur suppression : ${err.message}`, 'error');
      }
    }
  };

  return (
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
            {devisFactures.map((df) => {
              const amount = df.totalTtc || 0;
              const isDevis = df.type === 'DEVIS';
              const paidAmount = df.type === 'FACTURE'
                ? recettes
                    .filter((r) => r.numeroFacture === df.numero)
                    .reduce((sum: number, r) => sum + (r.montantHt || 0), 0)
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

      {/* Devis/Facture Editor Modal */}
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
                    const selected = clients.find((c) => c.nom === e.target.value);
                    setDevisFactureForm({
                      ...dfForm,
                      clientNom: e.target.value,
                      clientAdresse: selected ? selected.adresse : ''
                    });
                  }} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid var(--border-color)', color: '#ffffff', borderRadius: '8px' }}>
                    <option value="">-- Choisir un client --</option>
                    {clients.map((c) => <option key={c.id} value={c.nom}>{c.nom}</option>)}
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
                    {dfForm.items.map((it: ItemDevis, index: number) => (
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
                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '8px', border: '1px solid var(--border-color)' }}>
                        <input type="text" value={newItemForm.designation} onChange={(e) => setNewItemForm({ ...newItemForm, designation: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #30363d', backgroundColor: '#0d1117', color: '#ffffff', borderRadius: '4px', padding: '5px' }} placeholder="Ajouter une ligne..." />
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

                {/* Subtotals */}
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

      {/* Devis / Facture View & Print Modal */}
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
                }} className="btn btn-primary" style={{ marginRight: '10px', padding: '6px 12px', fontSize: '0.85rem' }}>Imprimer / Exporter PDF</button>
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
                  {viewingDf.items.map((it: ItemDevis, index: number) => (
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
    </div>
  );
}
