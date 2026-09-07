'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

export default function DetailEnginAdmin({ params }) {
  const { id } = params;
  const router = useRouter();
  const [autorise, setAutorise] = useState(null);
  const [engin, setEngin] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [signalements, setSignalements] = useState([]);

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
  }, [id]);

  async function charger() {
    const { data: enginData } = await supabase.from('engins').select('*').eq('id', id).single();
    setEngin(enginData);

    const { data: verifs } = await supabase
      .from('verifications')
      .select('id, resultat, via_public, created_at')
      .eq('engin_id', id)
      .order('created_at', { ascending: false })
      .limit(20);
    setVerifications(verifs || []);

    const { data: sigs } = await supabase
      .from('signalements')
      .select('id, type, statut, lieu, personne_trouvee, created_at')
      .eq('engin_id', id)
      .order('created_at', { ascending: false });
    setSignalements(sigs || []);
  }

  function formaterDate(iso) {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  if (autorise === null || !engin) {
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
        <h1>Fiche engin — vue complète</h1>
      </div>
      <div className="content">
        <div className={`resultat-statut ${engin.statut}`} style={{ padding: 16 }}>
          <p className="grand-label" style={{ fontSize: 18 }}>{engin.plaque || 'Sans plaque'} — {engin.statut}</p>
        </div>

        <dl className="fiche-info">
          <dt>Type</dt>
          <dd>{engin.type_engin}</dd>
          <dt>Marque / Modèle / Couleur</dt>
          <dd>{engin.marque || '—'} {engin.modele || ''} {engin.couleur ? `(${engin.couleur})` : ''}</dd>
          <dt>Numéro de châssis</dt>
          <dd>{engin.numero_chassis || '—'}</dd>
          <dt>Code QR</dt>
          <dd>{engin.qr_code}</dd>
          <dt>Propriétaire</dt>
          <dd>{engin.proprietaire_nom || 'Inconnu'}</dd>
          <dt>Téléphone du propriétaire</dt>
          <dd>{engin.proprietaire_telephone || '—'}</dd>
          <dt>CNI du propriétaire</dt>
          <dd>{engin.proprietaire_cni || '—'}</dd>
          <dt>Enregistré le</dt>
          <dd>{formaterDate(engin.created_at)}</dd>
        </dl>

        <div className="divider" />

        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>
          Signalements ({signalements.length})
        </p>
        {signalements.length === 0 && <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Aucun.</p>}
        {signalements.map((s) => (
          <div key={s.id} className="liste-item">
            <span className="plaque" style={{ fontSize: 14 }}>{s.type === 'interception' ? 'Interception' : 'Signalement suspect'}</span>
            {' '}
            <span className={`badge ${s.statut === 'resolu' ? 'actif' : s.statut === 'en_cours' ? 'suspect' : 'vole'}`}>{s.statut}</span>
            <div className="meta">{formaterDate(s.created_at)} — {s.lieu || 'lieu non précisé'}</div>
          </div>
        ))}

        <div className="divider" />

        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>
          Historique des contrôles ({verifications.length})
        </p>
        {verifications.length === 0 && <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Aucun.</p>}
        {verifications.map((v) => (
          <div key={v.id} className="liste-item">
            <span style={{ fontSize: 14 }}>{v.via_public ? 'Vérification publique' : 'Contrôle agent'}</span>
            <div className="meta">{formaterDate(v.created_at)} — résultat : {v.resultat}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
