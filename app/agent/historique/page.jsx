'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const LIBELLES = {
  actif: 'En règle',
  vole: 'Volé',
  suspect: 'Suspect',
  retire: 'Retiré',
};

export default function HistoriqueScans() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [scans, setScans] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/agent/login');
        return;
      }
      setSession(data.session);
      chargerHistorique(data.session.user.id);
    });
  }, []);

  async function chargerHistorique(userId) {
    setChargement(true);

    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!agent) {
      setScans([]);
      setChargement(false);
      return;
    }

    const { data } = await supabase
      .from('verifications')
      .select('id, resultat, created_at, engins(plaque, marque, modele)')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setScans(data || []);
    setChargement(false);
  }

  function formaterDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (!session) return null;

  return (
    <div className="shell">
      <div className="header">
        <p className="sigle">Espace agent</p>
        <h1>Historique de mes scans</h1>
      </div>
      <div className="content">
        {chargement && <p style={{ color: 'var(--ink-soft)' }}>Chargement…</p>}

        {!chargement && scans.length === 0 && (
          <p style={{ color: 'var(--ink-soft)' }}>Aucun scan enregistré pour l'instant.</p>
        )}

        {scans.map((s) => (
          <div key={s.id} className="liste-item">
            <span className="plaque">
              {s.engins ? `${s.engins.marque || ''} ${s.engins.modele || ''} — ${s.engins.plaque || 'sans plaque'}` : 'Engin supprimé'}
            </span>
            {' '}
            <span className={`badge ${s.resultat}`}>{LIBELLES[s.resultat] || s.resultat}</span>
            <div className="meta">{formaterDate(s.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
