'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function NouvelAgent() {
  const [form, setForm] = useState({ nom: '', telephone: '', email: '', motDePasse: '', role: 'agent', badgeId: '' });
  const [corps, setCorps] = useState([]);
  const [regions, setRegions] = useState([]);
  const [postes, setPostes] = useState([]);
  const [corpsChoisi, setCorpsChoisi] = useState('');
  const [regionChoisie, setRegionChoisie] = useState('');
  const [posteChoisi, setPosteChoisi] = useState('');
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    supabase.from('corps').select('*').order('nom').then(({ data }) => setCorps(data || []));
    supabase.from('regions').select('*').order('nom').then(({ data }) => setRegions(data || []));
    supabase.from('postes').select('*').order('nom').then(({ data }) => setPostes(data || []));
  }, []);

  function majChamp(champ, valeur) {
    setForm((f) => ({ ...f, [champ]: valeur }));
  }

  const regionsFiltrees = regions.filter((r) => !corpsChoisi || r.corps_id === corpsChoisi);
  const postesFiltres = postes.filter((p) => !regionChoisie || p.region_id === regionChoisie);

  async function creer(e) {
    e.preventDefault();
    setErreur('');
    setSucces(false);

    if (form.role !== 'admin' && form.role !== 'responsable_regional' && !posteChoisi) {
      setErreur('Choisissez le poste de rattachement de ce compte.');
      return;
    }
    if (form.role === 'responsable_regional' && !regionChoisie) {
      setErreur('Choisissez la région de rattachement de ce compte.');
      return;
    }

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
      body: JSON.stringify({ ...form, posteId: posteChoisi || null, regionId: regionChoisie || null }),
    });

    const resultat = await reponse.json();
    setChargement(false);

    if (!reponse.ok) {
      setErreur(resultat.erreur || 'Erreur lors de la création du compte.');
      return;
    }

    setSucces(true);
    setForm({ nom: '', telephone: '', email: '', motDePasse: '', role: 'agent', badgeId: '' });
    setCorpsChoisi('');
    setRegionChoisie('');
    setPosteChoisi('');
  }

  return (
    <div className="shell">
      <div className="header">
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 14, padding: 0, marginBottom: 10, cursor: 'pointer' }}>← Retour</button>
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
            <label htmlFor="badgeId">Numéro de badge / matricule</label>
            <input id="badgeId" value={form.badgeId} onChange={(e) => majChamp('badgeId', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="email">Adresse email</label>
            <input id="email" type="email" required value={form.email} onChange={(e) => majChamp('email', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="motDePasse">Mot de passe temporaire</label>
            <input id="motDePasse" type="text" required value={form.motDePasse} onChange={(e) => majChamp('motDePasse', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="role">Rôle</label>
            <select id="role" value={form.role} onChange={(e) => majChamp('role', e.target.value)}>
              <option value="agent">Agent de terrain</option>
              <option value="responsable">Responsable de poste</option>
              <option value="responsable_regional">Responsable régional</option>
            </select>
          </div>

          <div className="divider" />

          <div className="field">
            <label htmlFor="corps">Corps</label>
            <select id="corps" value={corpsChoisi} onChange={(e) => { setCorpsChoisi(e.target.value); setRegionChoisie(''); setPosteChoisi(''); }}>
              <option value="">Choisir un corps</option>
              {corps.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>

          <div className="field">
            <label htmlFor="region">Région</label>
            <select id="region" value={regionChoisie} onChange={(e) => { setRegionChoisie(e.target.value); setPosteChoisi(''); }}>
              <option value="">Choisir une région</option>
              {regionsFiltrees.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
            </select>
          </div>

          {form.role !== 'responsable_regional' && (
            <div className="field">
              <label htmlFor="poste">Poste</label>
              <select id="poste" value={posteChoisi} onChange={(e) => setPosteChoisi(e.target.value)}>
                <option value="">Choisir un poste</option>
                {postesFiltres.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
          )}

          <button type="submit" className="btn" disabled={chargement}>
            {chargement ? 'Création…' : 'Créer le compte agent'}
          </button>
        </form>
      </div>
    </div>
  );
}
