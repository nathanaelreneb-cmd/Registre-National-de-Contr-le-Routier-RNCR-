'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

export default function RegistreCentral() {
  const router = useRouter();
  const [autorise, setAutorise] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [dejaCherche, setDejaCherche] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push('/admin/login');
        return;
      }
      const { data: agent } = await supabase
        .from('agents')
        .select('role')
        .eq('user_id', data.session.user.id)
        .single();

      if (!agent || agent.role !== 'admin') {
        router.push('/admin/login');
        return;
      }
      setAutorise(true);
    });
  }, []);

  async function rechercher(e) {
    e.preventDefault();
    const terme = recherche.trim();
    if (!terme) return;

    setChargement(true);
    setDejaCherche(true);

    const { data } = await supabase
      .from('engins')
      .select('id, plaque, numero_chassis, marque, modele, statut, proprietaire_nom')
      .or(`plaque.ilike.%${terme}%,numero_chassis.ilike.%${terme}%,proprietaire_nom.ilike.%${terme}%,qr_code.ilike.%${terme}%`)
      .order('created_at', { ascending: false })
      .limit(30);

    setResultats(data || []);
    setChargement(false);
  }

  if (autorise === null) {
    return (
      <div className="shell">
        <div className="content"><p>Chargement…</p></div>
      </div>
    );
  }

  return (
    <div className="shell" style={{ maxWidth: 720 }}>
      <div className="header">
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 14, padding: 0, marginBottom: 10, cursor: 'pointer' }}>← Retour</button>
        <p className="sigle">Portail Administration</p>
        <h1>Registre central</h1>
      </div>
      <div className="content">
        <form onSubmit={rechercher}>
          <div className="field">
            <label htmlFor="recherche">Rechercher par plaque, châssis, propriétaire ou code QR</label>
            <input
              id="recherche"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Ex : NO-073-A08"
            />
          </div>
          <button type="submit" className="btn">Rechercher</button>
        </form>

        <div className="divider" />

        {chargement && <p style={{ color: 'var(--ink-soft)' }}>Recherche en cours…</p>}

        {!chargement && dejaCherche && resultats.length === 0 && (
          <p style={{ color: 'var(--ink-soft)' }}>Aucun résultat.</p>
        )}

        {resultats.map((e) => (
          <Link key={e.id} href={`/admin/registre/${e.id}`} className="liste-item" style={{ display: 'block' }}>
            <span className="plaque">{e.plaque || 'Sans plaque'}</span>
            {' '}
            <span className={`badge ${e.statut}`}>{e.statut}</span>
            <div className="meta">{e.marque} {e.modele} — {e.proprietaire_nom || 'Propriétaire inconnu'}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
