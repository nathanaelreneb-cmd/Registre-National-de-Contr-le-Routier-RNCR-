'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const LIBELLES_TYPE = {
  interception: 'Interception (engin volé retrouvé)',
  suspect: 'Engin suspect signalé',
};

const LIBELLES_STATUT = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  resolu: 'Résolu',
};

export default function Signalements() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [signalements, setSignalements] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/agent/login');
        return;
      }
      setSession(data.session);
      supabase
        .from('agents')
        .select('role')
        .eq('user_id', data.session.user.id)
        .single()
        .then(({ data: agentData }) => {
          setRole(agentData ? agentData.role : 'agent');
        });
      chargerSignalements();
    });
  }, []);

  async function chargerSignalements() {
    setChargement(true);
    const { data } = await supabase
      .from('signalements')
      .select('id, engin_id, type, lieu, personne_trouvee, statut, photo_url, created_at, engins(plaque, marque, modele, statut)')
      .order('created_at', { ascending: false })
      .limit(50);
    setSignalements(data || []);
    setChargement(false);
  }

  async function changerStatut(signalement, nouveauStatut) {
    const { error } = await supabase
      .from('signalements')
      .update({
        statut: nouveauStatut,
        resolu_at: nouveauStatut === 'resolu' ? new Date().toISOString() : null,
      })
      .eq('id', signalement.id);

    if (error) return;

    // Une interception résolue = l'engin redevient actif (propriétaire confirmé)
    if (nouveauStatut === 'resolu' && signalement.type === 'interception') {
      await supabase
        .from('engins')
        .update({ statut: 'actif' })
        .eq('id', signalement.engin_id);
    }

    chargerSignalements();
  }

  if (!session) return null;

  return (
    <div className="shell">
      <div className="header">
        <p className="sigle">Espace agent</p>
        <h1>Signalements</h1>
      </div>
      <div className="content">
        {chargement && <p style={{ color: 'var(--ink-soft)' }}>Chargement…</p>}

        {!chargement && signalements.length === 0 && (
          <p style={{ color: 'var(--ink-soft)' }}>Aucun signalement pour l'instant.</p>
        )}

        {signalements.map((s) => (
          <div key={s.id} className="liste-item">
            <span className="plaque">
              {s.engins ? `${s.engins.marque || ''} ${s.engins.modele || ''} — ${s.engins.plaque || 'sans plaque'}` : 'Engin supprimé'}
            </span>
            {' '}
            <span className={`badge ${s.statut === 'resolu' ? 'actif' : s.statut === 'en_cours' ? 'suspect' : 'vole'}`}>
              {LIBELLES_STATUT[s.statut]}
            </span>
            <div className="meta">
              {LIBELLES_TYPE[s.type]} — {s.lieu || 'lieu non précisé'}
              {s.personne_trouvee ? ` — personne trouvée : ${s.personne_trouvee}` : ''}
            </div>
            {s.photo_url && (
              <div style={{ marginTop: 8 }}>
                <a href={s.photo_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--brand)' }}>
                  Voir la photo
                </a>
              </div>
            )}

            {role === 'responsable' && s.statut !== 'resolu' && (
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                {s.statut === 'nouveau' && (
                  <button
                    className="btn secondaire"
                    style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }}
                    onClick={() => changerStatut(s, 'en_cours')}
                  >
                    Marquer en cours
                  </button>
                )}
                <button
                  className="btn secondaire"
                  style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }}
                  onClick={() => changerStatut(s, 'resolu')}
                >
                  Marquer résolu
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
