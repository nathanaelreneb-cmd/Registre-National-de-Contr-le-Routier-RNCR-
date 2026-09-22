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

    const { data: connexion, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: motDePasse,
    });

    if (authError || !connexion.user) {
      setChargement(false);
      setErreur("Identifiants incorrects. Vérifiez l'email et le mot de passe.");
      return;
    }

    const { data: agent, error: profilError } = await supabase
      .from('agents')
      .select('id, role, actif, badge_id')
      .eq('user_id', connexion.user.id)
      .maybeSingle();

    setChargement(false);

    if (profilError) {
      console.error('Erreur vérification accès agent:', profilError);
      await supabase.auth.signOut();
      setErreur("Impossible de vérifier les droits de ce compte. Réessayez.");
      return;
    }

    if (!agent) {
      await supabase.auth.signOut();
      setErreur("Ce compte n'a pas accès à l'espace agent.");
      return;
    }

    if (agent.actif === false) {
      await supabase.auth.signOut();
      setErreur("Ce compte agent est désactivé.");
      return;
    }

    if (agent.role === 'admin') {
      await supabase.auth.signOut();
      setErreur("Ce compte est un compte administrateur. Utilisez le Portail Administration.");
      return;
    }

    // Prise de service : position enregistrée en tâche de fond, jamais bloquante.
    const enregistrerPriseService = (coords) => {
      const payload = { agent_id: agent.id, badge_id: agent.badge_id };
      if (coords) {
        payload.latitude = coords.latitude;
        payload.longitude = coords.longitude;
      }
      supabase.from('prises_service').insert(payload).then(({ error }) => {
        if (error) console.error('Erreur prise de service:', error);
      });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => enregistrerPriseService(pos.coords),
        () => enregistrerPriseService(null),
        { timeout: 5000 }
      );
    } else {
      enregistrerPriseService(null);
    }

    router.push('/agent/dashboard');
  }

  return (
    <div className="shell">
      <div className="header">
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 14, padding: 0, marginBottom: 10, cursor: 'pointer' }}>← Retour</button>
        <p className="sigle">Espace agent</p>
        <h1>Connexion</h1>
      </div>
      <div className="content">
        {erreur && <div className="erreur">{erreur}</div>}

        <form onSubmit={seConnecter}>
          <div className="field">
            <label htmlFor="email">Adresse email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="mdp">Mot de passe</label>
            <input id="mdp" type="password" autoComplete="current-password" required value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          </div>
          <button type="submit" className="btn" disabled={chargement}>
            {chargement ? 'Connexion en cours…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
