'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { activerNotifications } from '../../../lib/pushNotifications';

const LIBELLES_SOS = {
  nouveau: 'Nouveau',
  pris_en_charge: 'Pris en charge',
  resolu: 'Résolu',
};

const LIBELLES_SIGNAL = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  resolu: 'Résolu',
};

export default function DashboardAdmin() {
  const router = useRouter();
  const [autorise, setAutorise] = useState(null);
  const [stats, setStats] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [messageNotif, setMessageNotif] = useState('');

  async function activerLesNotifications() {
    setMessageNotif('');
    try {
      await activerNotifications(supabase);
      setMessageNotif('Notifications activées.');
    } catch (err) {
      setMessageNotif(err.message);
    }
  }

  useEffect(() => {
    let actif = true;

    async function verifierAcces() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/admin/login');
        return;
      }

      const { data: agent } = await supabase
        .from('agents')
        .select('role, actif')
        .eq('user_id', data.session.user.id)
        .single();

      if (!agent || agent.role !== 'admin' || agent.actif === false) {
        router.push('/admin/login');
        return;
      }

      if (actif) {
        setAutorise(true);
        chargerStats();
      }
    }

    verifierAcces();
    return () => { actif = false; };
  }, [router]);

  async function chargerStats() {
    setChargement(true);

    const [
      { data: engins },
      { data: signalements },
      { count: totalVerifications },
      { count: totalPostes },
      { count: totalAgents },
      { count: totalCitoyens },
      { data: alertesSos },
    ] = await Promise.all([
      supabase.from('engins').select('statut'),
      supabase.from('signalements').select('statut, type, created_at').order('created_at', { ascending: false }).limit(8),
      supabase.from('verifications').select('id', { count: 'exact', head: true }),
      supabase.from('postes').select('id', { count: 'exact', head: true }),
      supabase.from('agents').select('id', { count: 'exact', head: true }).eq('actif', true),
      supabase.from('citoyens').select('id', { count: 'exact', head: true }),
      supabase.from('alertes_sos').select('id, nom, lieu, statut, created_at').order('created_at', { ascending: false }).limit(5),
    ]);

    const totalEngins = engins?.length || 0;
    const parStatut = { actif: 0, vole: 0, suspect: 0, retire: 0 };

    (engins || []).forEach((e) => {
      if (parStatut[e.statut] !== undefined) parStatut[e.statut] += 1;
    });

    const signalementsParStatut = { nouveau: 0, en_cours: 0, resolu: 0 };
    (signalements || []).forEach((s) => {
      if (signalementsParStatut[s.statut] !== undefined) signalementsParStatut[s.statut] += 1;
    });

    const sosNouvelles = (alertesSos || []).filter((a) => a.statut === 'nouveau').length;
    const tauxRegularisation = totalEngins > 0
      ? Math.round((parStatut.actif / totalEngins) * 100)
      : 0;

    setStats({
      totalEngins,
      parStatut,
      signalementsParStatut,
      totalSignalements: signalements?.length || 0,
      totalVerifications: totalVerifications || 0,
      totalPostes: totalPostes || 0,
      totalAgents: totalAgents || 0,
      totalCitoyens: totalCitoyens || 0,
      sosNouvelles,
      alertesSos: alertesSos || [],
      signalements: signalements || [],
      tauxRegularisation,
    });

    setChargement(false);
  }

  function dateCourte(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  if (autorise === null || chargement || !stats) {
    return (
      <div className="shell">
        <div className="content"><p>Chargement du tableau de bord…</p></div>
      </div>
    );
  }

  return (
    <div className="shell" style={{ maxWidth: 900 }}>
      <div className="header">
        <a href="/" style={{ display: 'inline-block', color: 'var(--brand)', fontSize: 14, marginBottom: 10, textDecoration: 'none' }}>
          ← Accueil
        </a>
        <p className="sigle">Portail Administration</p>
        <h1>Tableau de bord national</h1>
        <p style={{ color: 'var(--ink-soft)', marginTop: 6 }}>
          Vue opérationnelle du registre, des contrôles et des alertes.
        </p>
      </div>

      <div className="content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div className="liste-item">
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--brand-dark)' }}>{stats.totalEngins}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Engins enregistrés</div>
          </div>
          <div className="liste-item">
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--statut-actif)' }}>{stats.tauxRegularisation}%</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Engins actifs</div>
          </div>
          <div className="liste-item">
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--brand-dark)' }}>{stats.totalVerifications}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Contrôles effectués</div>
          </div>
          <div className="liste-item">
            <div style={{ fontSize: 28, fontWeight: 800, color: stats.sosNouvelles ? 'var(--statut-vole)' : 'var(--brand-dark)' }}>
              {stats.sosNouvelles}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>SOS nouveaux</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <section>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>État du registre</p>
            <div className="liste-item">
              <div><span className="badge actif">Actifs</span> {stats.parStatut.actif}</div>
              <div><span className="badge vole">Volés</span> {stats.parStatut.vole}</div>
              <div><span className="badge suspect">Suspects</span> {stats.parStatut.suspect}</div>
              <div>Retirés : {stats.parStatut.retire}</div>
            </div>
          </section>

          <section>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>Signalements</p>
            <div className="liste-item">
              <div>Nouveaux : <strong>{stats.signalementsParStatut.nouveau}</strong></div>
              <div>En cours : <strong>{stats.signalementsParStatut.en_cours}</strong></div>
              <div>Résolus : <strong>{stats.signalementsParStatut.resolu}</strong></div>
            </div>
          </section>
        </div>

        <div className="divider" />

        <section>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>Alertes SOS récentes</p>
          {stats.alertesSos.length === 0 ? (
            <div className="liste-item">Aucune alerte SOS enregistrée.</div>
          ) : (
            stats.alertesSos.map((alerte) => (
              <div className="liste-item" key={alerte.id} style={{ marginBottom: 8 }}>
                <strong>{alerte.nom || 'Citoyen'}</strong>
                <div style={{ fontSize: 13, marginTop: 4 }}>{alerte.lieu || 'Lieu non renseigné'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
                  {LIBELLES_SOS[alerte.statut] || alerte.statut || 'Statut inconnu'} · {dateCourte(alerte.created_at)}
                </div>
              </div>
            ))
          )}
        </section>

        <div className="divider" />

        <section>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>Derniers signalements</p>
          {stats.signalements.length === 0 ? (
            <div className="liste-item">Aucun signalement récent.</div>
          ) : (
            stats.signalements.map((signalement) => (
              <div className="liste-item" key={signalement.id} style={{ marginBottom: 8 }}>
                <strong>{signalement.type || 'Signalement'}</strong>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
                  {LIBELLES_SIGNAL[signalement.statut] || signalement.statut || 'Statut inconnu'} · {dateCourte(signalement.created_at)}
                </div>
              </div>
            ))
          )}
        </section>

        <div className="divider" />

        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10 }}>Accès opérationnels</p>
        <div style={{ display: 'grid', gap: 10 }}>
          <Link href="/admin/registre" className="btn secondaire">Registre central des engins</Link>
          <Link href="/admin/vols" className="btn secondaire">Gestion des vols & alertes</Link>
          <Link href="/admin/hierarchie" className="btn secondaire">Hiérarchie & comptes</Link>
          <Link href="/admin/trajet" className="btn secondaire">Suivi des trajets</Link>\n          <Link href="/admin/accidents" className="btn secondaire">Gestion des accidents & enquêtes</Link>
        </div>

        <div className="divider" />

        <button onClick={activerLesNotifications} className="btn secondaire">
          🔔 Activer les notifications
        </button>
        {messageNotif && (
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 8 }}>{messageNotif}</p>
        )}
      </div>
    </div>
  );
}
