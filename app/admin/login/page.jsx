'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function ConnexionAdmin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  async function seConnecter(e) {
    e.preventDefault();
    setErreur('');
    setChargement(true);

    const { data: connexion, error } = await supabase.auth.signInWithPassword({
      email,
      password: motDePasse,
    });

    if (error) {
      setChargement(false);
      setErreur("Identifiants incorrects. Vérifiez l'email et le mot de passe.");
      return;
    }

    const { data: agent } = await supabase
      .from('agents')
      .select('role')
      .eq('user_id', connexion.user.id)
      .single();

    setChargement(false);

    if (!agent || agent.role !== 'admin') {
      await supabase.auth.signOut();
      setErreur("Ce compte n'a pas accès au portail administration.");
      return;
    }

    router.push('/admin/dashboard');
  }

  return (
    <div className="shell">
      <div className="header">
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 14, padding: 0, marginBottom: 10, cursor: 'pointer' }}>← Retour</button>
        <p className="sigle">Portail Administration</p>
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
