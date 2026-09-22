'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

function etatExpiration(date) {
  if (!date) return { label: 'Date manquante', tone: 'a_verifier' };
  const d = new Date(date + 'T23:59:59');
  const maintenant = new Date();
  const jours = Math.ceil((d - maintenant) / 86400000);
  if (jours < 0) return { label: 'Expiré', tone: 'expire' };
  if (jours <= 30) return { label: `Expire dans ${jours} jour(s)`, tone: 'bientot' };
  return { label: 'Valide', tone: 'valide' };
}

export default function AlertesConformite() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [lignes, setLignes] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/agent/login');
        return;
      }
      const { data: agent } = await supabase
        .from('agents')
        .select('role, actif')
        .eq('user_id', data.session.user.id)
        .maybeSingle();

      if (!agent?.actif || agent.role === 'admin') {
        await supabase.auth.signOut();
        router.push('/agent/login');
        return;
      }

      setSession(data.session);
      await charger();
    })();
  }, [router]);

  async function charger() {
    setChargement(true);
    const maintenant = new Date();
    const limite = new Date(maintenant.getTime() + 31 * 86400000);
    const dateLimite = limite.toISOString().slice(0, 10);

    const [{ data: controles }, { data: documents }, { data: engins }] = await Promise.all([
      supabase
        .from('controles_techniques')
        .select('id, engin_id, date_expiration, resultat, centre_controle, reference_controle')
        .not('date_expiration', 'is', null)
        .lte('date_expiration', dateLimite)
        .order('date_expiration', { ascending: true })
        .limit(100),
      supabase
        .from('engins_documents')
        .select('id, engin_id, type_document, numero_document, date_expiration, statut')
        .not('date_expiration', 'is', null)
        .lte('date_expiration', dateLimite)
        .order('date_expiration', { ascending: true })
        .limit(100),
      supabase
        .from('engins')
        .select('id, plaque, type_engin, marque, modele, assurance_expiration')
        .not('assurance_expiration', 'is', null)
        .lte('assurance_expiration', dateLimite)
        .order('assurance_expiration', { ascending: true })
        .limit(100),
    ]);

    const ids = new Set([
      ...(controles || []).map(x => x.engin_id),
      ...(documents || []).map(x => x.engin_id),
      ...(engins || []).map(x => x.id),
    ]);

    let map = new Map();
    if (ids.size) {
      const { data } = await supabase
        .from('engins')
        .select('id, plaque, type_engin, marque, modele')
        .in('id', Array.from(ids));
      map = new Map((data || []).map(x => [x.id, x]));
    }

    const result = [
      ...(controles || []).map(x => ({ ...x, categorie: 'Contrôle technique', date: x.date_expiration })),
      ...(documents || []).map(x => ({ ...x, categorie: `Document : ${x.type_document}`, date: x.date_expiration })),
      ...(engins || []).map(x => ({ ...x, categorie: 'Assurance', date: x.assurance_expiration })),
    ].map(x => ({ ...x, engin: map.get(x.engin_id || x.id) || null }))
     .sort((a, b) => new Date(a.date) - new Date(b.date));

    setLignes(result);
    setChargement(false);
  }

  if (!session) return null;

  const expirees = lignes.filter(x => etatExpiration(x.date).tone === 'expire').length;
  const bientot = lignes.filter(x => etatExpiration(x.date).tone === 'bientot').length;

  return (
    <div className="shell">
      <div className="header">
        <Link href="/agent/dashboard" style={{ color: 'var(--brand)', textDecoration: 'none' }}>← Tableau de bord</Link>
        <p className="sigle">Conformité des engins</p>
        <h1>Alertes d'expiration</h1>
        <p style={{ color: 'var(--ink-soft)' }}>Échéances dépassées ou prévues dans les 30 prochains jours.</p>
      </div>

      <div className="content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          <div className="liste-item"><strong>{expirees}</strong><div className="meta">Déjà expirées</div></div>
          <div className="liste-item"><strong>{bientot}</strong><div className="meta">À surveiller</div></div>
        </div>

        {chargement && <p>Chargement…</p>}
        {!chargement && lignes.length === 0 && (
          <div className="liste-item">Aucune échéance d'assurance, de contrôle technique ou de document dans les 30 prochains jours.</div>
        )}

        {lignes.map((x) => {
          const etat = etatExpiration(x.date);
          const e = x.engin;
          return (
            <div key={`${x.categorie}-${x.id}`} className="liste-item" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <strong>{x.categorie}</strong>
                <span className={`badge ${etat.tone}`}>{etat.label}</span>
              </div>
              <div className="meta">
                {e?.plaque || 'Sans plaque'} — {e?.type_engin || ''} {e?.marque || ''} {e?.modele || ''}
              </div>
              <div className="meta">Échéance : {new Date(x.date + 'T12:00:00').toLocaleDateString('fr-FR')}</div>
              <Link href={e ? `/agent/conformite/${e.id}` : '/agent/dashboard'} className="btn secondaire" style={{ marginTop: 8 }}>
                Ouvrir le dossier
              </Link>
            </div>
          );
        })}

        <button onClick={charger} className="btn secondaire">Actualiser</button>
      </div>
    </div>
  );
}
