'use client';

import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function NouvelAgent() {
  const [form, setForm] = useState({ nom: '', telephone: '', email: '', motDePasse: '' });
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);
  const [chargement, setChargement] = useState(false);

  function majChamp(champ, valeur) {
    setForm((f) => ({ ...f, [champ]: valeur }));
  }

  async function creer(e) {
    e.preventDefault();
    setErreur('');
    setSucces(false);
    setChargement(true);

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setErreur('Votre session a expiré. Reconnectez-vous.');
      setChargement(false);
      return;
    }

    const reponse = await fetch('/api/agents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(form),
    });

    const resultat = await reponse.json();
    setChargement(false);

    if (!reponse.ok) {
      setErreur(resultat.erreur || 'Erreur lors de la création du compte.');
      return;
    }

    setSucces(true);
    setForm({ nom: '', telephone: '', email: '', motDePasse: '' });
  }

  return (
    <div className="shell">
      <div className="header">
        <p className="sigle">Espace agent</p>
        <h1>Ajouter un agent</h1>
      </div>
      <div className="content">
        {erreur && <div className="erreur">{erreur}</div>}
        {succes && (
          <div
            style={{
              background: '#EAF6EF',
              border: '1px solid var(--statut-actif)',
              color: 'var(--statut-actif)',
              padding: '10px 12px',
              borderRadius: 4,
              fontSize: 14,
              marginBottom: 16,
            }}
          >
            Compte agent créé avec succès.
          </div>
        )}

        <form onSubmit={creer}>
          <div className="field">
            <label htmlFor="nom">Nom complet</label>
            <input id="nom" required value={form.nom} onChange={(e) => majChamp('nom', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="telephone">Téléphone</label>
            <input id="telephone" value={form.telephone} onChange={(e) => majChamp('telephone', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="email">Adresse email</label>
            <input id="email" type="email" required value={form.email} onChange={(e) => majChamp('email', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="motDePasse">Mot de passe temporaire</label>
            <input id="motDePasse" type="text" required value={form.motDePasse} onChange={(e) => majChamp('motDePasse', e.target.value)} />
          </div>

          <button type="submit" className="btn" disabled={chargement}>
            {chargement ? 'Création…' : 'Créer le compte agent'}
          </button>
        </form>
      </div>
    </div>
  );
}
