'use client';

import React, { useState } from 'react';
import { Contrat, DevisFacture } from '@/types';

interface ContratsTabProps {
  contrats: Contrat[];
  devisFactures: DevisFacture[];
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

export default function ContratsTab({
  contrats,
  devisFactures,
  refreshData,
  addToast
}: ContratsTabProps) {
  const [contratModalOpen, setContratModalOpen] = useState(false);
  const [editingContrat, setEditingContrat] = useState<Contrat | null>(null);
  const [contratForm, setContratForm] = useState({
    dateContrat: '',
    clientNom: '',
    clientRepresentant: '',
    prestationDate: '',
    prestationHoraires: '',
    prestationTarif: 0,
    prestationAcompte: 0,
    prestationSolde: 0,
    prestationTypeAmbiance: '',
    status: 'EN_ATTENTE' as 'EN_ATTENTE' | 'SIGNÉ'
  });

  const [contratViewModalOpen, setContratViewModalOpen] = useState(false);
  const [viewingContrat, setViewingContrat] = useState<Contrat | null>(null);

  const handleOpenAddContrat = () => {
    setEditingContrat(null);
    const dateStr = new Date().toLocaleDateString('fr-FR');
    setContratForm({
      dateContrat: dateStr,
      clientNom: '',
      clientRepresentant: '',
      prestationDate: '',
      prestationHoraires: '',
      prestationTarif: 0,
      prestationAcompte: 0,
      prestationSolde: 0,
      prestationTypeAmbiance: '',
      status: 'EN_ATTENTE'
    });
    setContratModalOpen(true);
  };

  const handleOpenEditContrat = (c: Contrat) => {
    setEditingContrat(c);
    setContratForm({
      dateContrat: c.dateContrat || '',
      clientNom: c.clientNom || '',
      clientRepresentant: c.clientRepresentant || '',
      prestationDate: c.prestationDate || '',
      prestationHoraires: c.prestationHoraires || '',
      prestationTarif: c.prestationTarif || 0,
      prestationAcompte: c.prestationAcompte || 0,
      prestationSolde: c.prestationSolde || 0,
      prestationTypeAmbiance: c.prestationTypeAmbiance || '',
      status: c.status || 'EN_ATTENTE'
    });
    setContratModalOpen(true);
  };

  const handleSaveContratSubmit = async () => {
    if (!contratForm.clientNom.trim() || contratForm.prestationTarif <= 0) {
      addToast('Veuillez associer un devis valide avec un client et un montant.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/contrats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        })
      });

      if (response.ok) {
        addToast('Contrat enregistré avec succès !', 'success');
        setContratModalOpen(false);
        await refreshData();
      } else {
        const errData = await response.json().catch(() => ({ error: 'Erreur lors de la sauvegarde du contrat' }));
        addToast(`Erreur contrat : ${errData.error}`, 'error');
      }
    } catch (err: any) {
      addToast(`Erreur contrat : ${err.message}`, 'error');
    }
  };

  const handleDeleteContratClick = async (id: string, client: string) => {
    if (confirm(`Supprimer définitivement le contrat de booking pour "${client}" ?`)) {
      try {
        const response = await fetch(`/api/contrats?id=${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          addToast('Contrat supprimé avec succès !', 'success');
          await refreshData();
        } else {
          const errData = await response.json().catch(() => ({ error: 'Erreur lors de la suppression du contrat' }));
          addToast(`Erreur contrat : ${errData.error}`, 'error');
        }
      } catch (err: any) {
        addToast(`Erreur contrat : ${err.message}`, 'error');
      }
    }
  };

  return (
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
            {contrats.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '15px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Aucun contrat de prestation enregistré.
                </td>
              </tr>
            ) : (
              contrats.map((c) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Booking Contract Editor Modal */}
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
                    value={devisFactures.find((df) => df.clientNom === contratForm.clientNom && df.datePrestation === contratForm.prestationDate && df.type === 'DEVIS')?.numero || ''}
                    onChange={(e) => {
                      const selectedDevis = devisFactures.find((df) => df.numero === e.target.value && df.type === 'DEVIS');
                      if (selectedDevis) {
                        const ambiance = selectedDevis.items ? selectedDevis.items.map((it) => it.designation).join(', ') : 'Généraliste';
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
                      .filter((df) => df.type === 'DEVIS')
                      .map((df) => (
                        <option key={df.id} value={df.numero}>
                          {df.numero} &bull; {df.clientNom} ({df.datePrestation})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="control-group">
                  <label className="control-label">Date du contrat :</label>
                  <input
                    type="date"
                    value={convertToInputDateFormat(contratForm.dateContrat)}
                    onChange={(e) => setContratForm({ ...contratForm, dateContrat: convertToDbDateFormat(e.target.value) })}
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
                <div className="control-group">
                  <label className="control-label">Nom du Client :</label>
                  <input type="text" disabled value={contratForm.clientNom} style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.05)', color: '#ffffff' }} />
                </div>
                <div className="control-group">
                  <label className="control-label">Représentant du Client (Signataire) :</label>
                  <input type="text" value={contratForm.clientRepresentant} onChange={(e) => setContratForm({ ...contratForm, clientRepresentant: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Ex: M. Jean Martin" />
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
                  <input type="text" value={contratForm.prestationTypeAmbiance} onChange={(e) => setContratForm({ ...contratForm, prestationTypeAmbiance: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Ex: Généraliste" />
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
                  <select value={contratForm.status} onChange={(e) => setContratForm({ ...contratForm, status: e.target.value as 'EN_ATTENTE' | 'SIGNÉ' })} style={{ width: '100%', padding: '10px', backgroundColor: '#0d1117', border: '1px solid var(--border-color)', color: '#ffffff', borderRadius: '8px' }}>
                    <option value="EN_ATTENTE">En attente de signature</option>
                    <option value="SIGNÉ">Signé</option>
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

      {/* Booking Contract View & Print Modal */}
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
    </div>
  );
}
