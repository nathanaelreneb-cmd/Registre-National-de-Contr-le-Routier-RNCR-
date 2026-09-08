'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

export default function InscriptionCitoyen() {
  const router = useRouter();
  const [form, setForm] = useState({ nom: '', telephone: '', cni: '', email: '', motDePasse: '' });
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  function majChamp(champ, valeur) {
    setForm((f) => ({ ...f, [champ]: valeur }));
  }

  async function sInscrire(e) {
    e.preventDefault();
    setErreur('');
    setChargement(true);

    const reponse = await fetch('/api/citoyen/inscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const resultat = await reponse.json();

    if (!reponse.ok) {
      setChargement(false);
      setErreur(resultat.erreur || "Erreur lors de l'inscription.");
      return;
    }

    // Compte créé sans confirmation email requise : connexion immédiate
    const { error: erreurConnexion } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.motDePasse,
    });

    setChargement(false);

    if (erreurConnexion) {
      setErreur('Compte créé. Connectez-vous depuis la page de connexion.');
      return;
    }

    router.push('/citoyen/espace');
  }

  return (
    <div className="shell">
      <div className="header">
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 14, padding: 0, marginBottom: 10, cursor: 'pointer' }}>← Retour</button>
        <p className="sigle">Espace citoyen</p>
        <h1>Créer un compte</h1>
      </div>
      <div className="content">
        {erreur && <div className="erreur">{erreur}</div>}

        <form onSubmit={sInscrire}>
          <div className="field">
            <label htmlFor="nom">Nom complet</label>
            <input id="nom" required value={form.nom} onChange={(e) => majChamp('nom', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="telephone">Téléphone</label>
            <input id="telephone" required value={form.telephone} onChange={(e) => majChamp('telephone', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cni">Numéro CNI</label>
            <input id="cni" required value={form.cni} onChange={(e) => majChamp('cni', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="email">Adresse email</label>
            <input id="email" type="email" required value={form.email} onChange={(e) => majChamp('email', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="motDePasse">Mot de passe</label>
            <input id="motDePasse" type="password" required value={form.motDePasse} onChange={(e) => majChamp('motDePasse', e.target.value)} />
          </div>

          <button type="submit" className="btn" disabled={chargement}>
            {chargement ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 16, textAlign: 'center' }}>
          Déjà un compte ? <Link href="/citoyen/login" style={{ color: 'var(--brand)' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
