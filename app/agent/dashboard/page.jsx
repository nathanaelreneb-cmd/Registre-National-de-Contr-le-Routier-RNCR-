'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

export default function TableauDeBord() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [engins, setEngins] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/agent/login');
        return;
      }
      setSession(data.session);
      chargerEngins();
    });
  }, []);

  async function chargerEngins() {
    setChargement(true);
    const { data } = await supabase
      .from('engins')
      .select('id, plaque, type_engin, marque, modele, statut, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    setEngins(data || []);
    setChargement(false);
  }

  async function seDeconnecter() {
    await supabase.auth.signOut();
    router.push('/agent/login');
  }

  if (!session) return null;

  return (
    <div className="shell">
      <div className="header">
        <p className="sigle">Espace agent</p>
        <h1>Tableau de bord</h1>
      </div>
      <div className="content">
        <Link href="/agent/nouveau" className="btn">Enregistrer un engin</Link>
        <Link href="/agent/scanner" className="btn secondaire">Scanner un QR code</Link>
        <Link href="/agent/nouvel-agent" className="btn secondaire">Ajouter un agent</Link>

        <div className="divider" />

        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>
          Derniers engins enregistrés
        </p>

        {chargement && <p style={{ color: 'var(--ink-soft)' }}>Chargement…</p>}

        {!chargement && engins.length === 0 && (
          <p style={{ color: 'var(--ink-soft)' }}>Aucun engin enregistré pour l'instant.</p>
        )}

        {engins.map((e) => (
          <Link key={e.id} href={`/agent/fiche/${e.id}`} className="liste-item" style={{ display: 'block' }}>
            <span className="plaque">{e.plaque || 'Sans plaque'}</span>
            {' '}
            <span className={`badge ${e.statut}`}>{e.statut}</span>
            <div className="meta">{e.type_engin} — {e.marque} {e.modele}</div>
          </Link>
        ))}

        <div className="divider" />
        <button onClick={seDeconnecter} className="btn secondaire">Se déconnecter</button>
      </div>
    </div>
  );
}
