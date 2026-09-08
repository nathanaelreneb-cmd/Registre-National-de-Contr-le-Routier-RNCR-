'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

export default function ConnexionCitoyen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  async function seConnecter(e) {
    e.preventDefault();
    setErreur('');
    setChargement(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });

    setChargement(false);

    if (error) {
      setErreur("Identifiants incorrects. Vérifiez l'email et le mot de passe.");
      return;
    }

    router.push('/citoyen/espace');
  }

  return (
    <div className="shell">
      <div className="header">
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 14, padding: 0, marginBottom: 10, cursor: 'pointer' }}>← Retour</button>
        <p className="sigle">Espace citoyen</p>
        <h1>Connexion</h1>
      </div>
      <div className="content">
        {erreur && <div className="erreur">{erreur}</div>}

        <form onSubmit={seConnecter}>
          <div className="field">
            <label htmlFor="email">Adresse email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="mdp">Mot de passe</label>
            <input id="mdp" type="password" required value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          </div>
          <button type="submit" className="btn" disabled={chargement}>
            {chargement ? 'Connexion en cours…' : 'Se connecter'}
          </button>
        </form>

        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 16, textAlign: 'center' }}>
          Pas encore de compte ? <Link href="/citoyen/inscription" style={{ color: 'var(--brand)' }}>En créer un</Link>
        </p>
      </div>
    </div>
  );
}
