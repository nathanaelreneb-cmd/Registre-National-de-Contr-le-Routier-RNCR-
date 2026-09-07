'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

export default function DashboardAdmin() {
  const router = useRouter();
  const [autorise, setAutorise] = useState(null);
  const [stats, setStats] = useState(null);
  const [chargement, setChargement] = useState(true);

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
      chargerStats();
    });
  }, []);

  async function chargerStats() {
    setChargement(true);

    const { data: engins } = await supabase.from('engins').select('statut');
    const { data: signalements } = await supabase.from('signalements').select('statut, type');
    const { count: totalVerifications } = await supabase
      .from('verifications')
      .select('id', { count: 'exact', head: true });
    const { count: totalPostes } = await supabase.from('postes').select('id', { count: 'exact', head: true });
    const { count: totalAgents } = await supabase.from('agents').select('id', { count: 'exact', head: true });

    const totalEngins = engins ? engins.length : 0;
    const parStatut = { actif: 0, vole: 0, suspect: 0, retire: 0 };
    (engins || []).forEach((e) => {
      if (parStatut[e.statut] !== undefined) parStatut[e.statut] += 1;
    });

    const signalementsParStatut = { nouveau: 0, en_cours: 0, resolu: 0 };
    (signalements || []).forEach((s) => {
      if (signalementsParStatut[s.statut] !== undefined) signalementsParStatut[s.statut] += 1;
    });

    const tauxRegularisation = totalEngins > 0 ? Math.round((parStatut.actif / totalEngins) * 100) : 0;

    setStats({
      totalEngins,
      parStatut,
      signalementsParStatut,
      totalSignalements: signalements ? signalements.length : 0,
      totalVerifications: totalVerifications || 0,
      totalPostes: totalPostes || 0,
      totalAgents: totalAgents || 0,
      tauxRegularisation,
    });

    setChargement(false);
  }

  if (autorise === null || chargement || !stats) {
    return (
      <div className="shell">
        <div className="content"><p>Chargement…</p></div>
      </div>
    );
  }

  return (
    <div className="shell" style={{ maxWidth: 720 }}>
      <div className="header">
        <p className="sigle">Portail Administration</p>
        <h1>Tableau de bord national</h1>
      </div>
      <div className="content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 4, padding: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--brand-dark)' }}>{stats.totalEngins}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Engins enregistrés</div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 4, padding: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--statut-actif)' }}>{stats.tauxRegularisation}%</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Taux de régularisation</div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 4, padding: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--brand-dark)' }}>{stats.totalVerifications}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Contrôles effectués</div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 4, padding: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--brand-dark)' }}>{stats.totalAgents}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Agents actifs</div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>Répartition des engins par statut</p>
        <div className="liste-item">
          <span className="badge actif">Actif</span> {stats.parStatut.actif}
          {'   '}
          <span className="badge vole">Volé</span> {stats.parStatut.vole}
          {'   '}
          <span className="badge suspect">Suspect</span> {stats.parStatut.suspect}
        </div>

        <div className="divider" />

        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>Signalements</p>
        <div className="liste-item">
          Nouveaux : {stats.signalementsParStatut.nouveau}
          {'   '}En cours : {stats.signalementsParStatut.en_cours}
          {'   '}Résolus : {stats.signalementsParStatut.resolu}
        </div>

        <div className="divider" />

        <Link href="/admin/registre" className="btn secondaire">Registre central des engins</Link>
      </div>
    </div>
  );
}
