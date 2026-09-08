'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

const LIBELLES_TYPE = {
  declaration_vol: 'Déclaration de vol',
  interception: 'Interception',
  suspect: 'Signalement suspect',
};

export default function GestionVols() {
  const router = useRouter();
  const [autorise, setAutorise] = useState(null);
  const [alertes, setAlertes] = useState([]);
  const [sos, setSos] = useState([]);
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
      charger();
    });
  }, []);

  async function charger() {
    setChargement(true);
    const { data } = await supabase
      .from('signalements')
      .select('id, type, statut, lieu, personne_trouvee, created_at, engins(id, plaque, marque, modele, proprietaire_nom, proprietaire_telephone, statut)')
      .order('created_at', { ascending: false })
      .limit(50);
    setAlertes(data || []);

    const { data: alertesSos } = await supabase
      .from('alertes_sos')
      .select('id, nom, telephone, lieu, statut, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    setSos(alertesSos || []);

    setChargement(false);
  }

  async function changerStatutSos(id, nouveauStatut) {
    await supabase.from('alertes_sos').update({ statut: nouveauStatut }).eq('id', id);
    charger();
  }

  async function changerStatut(id, nouveauStatut) {
    await supabase
      .from('signalements')
      .update({ statut: nouveauStatut, resolu_at: nouveauStatut === 'resolu' ? new Date().toISOString() : null })
      .eq('id', id);
    charger();
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
        <h1>Gestion des vols & alertes</h1>
      </div>
      <div className="content">
        {chargement && <p style={{ color: 'var(--ink-soft)' }}>Chargement…</p>}

        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>Alertes SOS citoyennes</p>
        {!chargement && sos.length === 0 && (
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginBottom: 16 }}>Aucune alerte SOS.</p>
        )}
        {sos.map((s) => (
          <div key={s.id} className="liste-item">
            <span className="plaque">🆘 {s.nom || 'Citoyen'}</span>
            {' '}
            <span className={`badge ${s.statut === 'resolu' ? 'actif' : s.statut === 'en_cours' ? 'suspect' : 'vole'}`}>{s.statut}</span>
            <div className="meta">{s.telephone || 'Téléphone inconnu'} — {new Date(s.created_at).toLocaleString('fr-FR')}</div>
            {s.statut !== 'resolu' && (
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                {s.statut === 'nouveau' && (
                  <button className="btn secondaire" style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }} onClick={() => changerStatutSos(s.id, 'en_cours')}>
                    Marquer en cours
                  </button>
                )}
                <button className="btn secondaire" style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }} onClick={() => changerStatutSos(s.id, 'resolu')}>
                  Marquer résolu
                </button>
              </div>
            )}
          </div>
        ))}

        <div className="divider" />

        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>Déclarations, interceptions, signalements</p>

        {!chargement && alertes.length === 0 && (
          <p style={{ color: 'var(--ink-soft)' }}>Aucune alerte pour l'instant.</p>
        )}

        {alertes.map((a) => (
          <div key={a.id} className="liste-item">
            <span className="plaque">
              {a.engins ? `${a.engins.plaque || 'sans plaque'} — ${a.engins.marque || ''} ${a.engins.modele || ''}` : 'Engin supprimé'}
            </span>
            {' '}
            <span className={`badge ${a.statut === 'resolu' ? 'actif' : a.statut === 'en_cours' ? 'suspect' : 'vole'}`}>
              {a.statut}
            </span>
            <div className="meta">
              {LIBELLES_TYPE[a.type]} — {a.lieu || 'lieu non précisé'}
              {a.engins && a.engins.proprietaire_nom ? ` — propriétaire : ${a.engins.proprietaire_nom} (${a.engins.proprietaire_telephone || 'tél. inconnu'})` : ''}
            </div>

            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {a.engins && (
                <Link href={`/admin/registre/${a.engins.id}`} className="btn secondaire" style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }}>
                  Voir la fiche
                </Link>
              )}
              {a.statut === 'nouveau' && (
                <button className="btn secondaire" style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }} onClick={() => changerStatut(a.id, 'en_cours')}>
                  Marquer en cours
                </button>
              )}
              {a.statut !== 'resolu' && (
                <button className="btn secondaire" style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }} onClick={() => changerStatut(a.id, 'resolu')}>
                  Marquer résolu
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
