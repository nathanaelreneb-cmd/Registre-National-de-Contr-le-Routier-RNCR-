'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function ConnexionAgent() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  async function seConnecter(e) {
    e.preventDefault();
    setErreur('');
    setChargement(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: motDePasse,
    });

    setChargement(false);

    if (error) {
      setErreur("Identifiants incorrects. Vérifiez l'email et le mot de passe.");
      return;
    }

    router.push('/agent/dashboard');
  }

  return (
    <div className="shell">
      <div className="header">
        <p className="sigle">Espace agent</p>
        <h1>Connexion</h1>
      </div>
      <div className="content">
        {erreur && <div className="erreur">{erreur}</div>}

        <form onSubmit={seConnecter}>
          <div className="field">
            <label htmlFor="email">Adresse email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="mdp">Mot de passe</label>
            <input
              id="mdp"
              type="password"
              autoComplete="current-password"
              required
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          </div>

          <button type="submit" className="btn" disabled={chargement}>
            {chargement ? 'Connexion en cours…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
