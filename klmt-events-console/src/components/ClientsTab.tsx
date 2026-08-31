'use client';

import React, { useState } from 'react';
import { Client } from '@/types';

interface ClientsTabProps {
  clients: Client[];
  refreshData: () => Promise<void>;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function ClientsTab({
  clients,
  refreshData,
  addToast
}: ClientsTabProps) {
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState({ nom: '', adresse: '', email: '', telephone: '' });

  const handleOpenAddClient = () => {
    setEditingClient(null);
    setClientForm({ nom: '', adresse: '', email: '', telephone: '' });
    setClientModalOpen(true);
  };

  const handleOpenEditClient = (client: Client) => {
    setEditingClient(client);
    setClientForm({
      nom: client.nom || '',
      adresse: client.adresse || '',
      email: client.email || '',
      telephone: client.telephone || ''
    });
    setClientModalOpen(true);
  };

  const handleSaveClientSubmit = async () => {
    if (!clientForm.nom.trim()) {
      addToast('Le nom du client est obligatoire.', 'error');
      return;
    }
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingClient?.id || null,
          nom: clientForm.nom.trim(),
          adresse: clientForm.adresse.trim(),
          email: clientForm.email.trim(),
          telephone: clientForm.telephone.trim()
        })
      });
      if (response.ok) {
        addToast('Client enregistré avec succès !', 'success');
        setClientModalOpen(false);
        await refreshData();
      } else {
        const errData = await response.json();
        addToast(`Erreur client : ${errData.error || response.statusText}`, 'error');
      }
    } catch (err: any) {
      addToast(`Erreur client : ${err.message}`, 'error');
    }
  };

  const handleDeleteClientClick = async (id: string, name: string) => {
    if (confirm(`Supprimer définitivement le client "${name}" ?`)) {
      try {
        const response = await fetch(`/api/clients?id=${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          addToast('Client supprimé avec succès !', 'success');
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
            {clients.map((c) => (
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

      {/* Client Modal */}
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
    </div>
  );
}
