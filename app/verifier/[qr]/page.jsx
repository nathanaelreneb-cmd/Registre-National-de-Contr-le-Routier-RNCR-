'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

const LIBELLES = {
  actif: 'Engin en règle',
  vole: 'Engin déclaré volé',
  suspect: 'Engin signalé suspect',
  retire: 'Enregistrement retiré',
};

export default function ResultatVerification({ params }) {
  const { qr } = params;
  const [engin, setEngin] = useState(undefined); // undefined = chargement, null = introuvable
  const [dejaEnregistre, setDejaEnregistre] = useState(false);
  const [estAgentConnecte, setEstAgentConnecte] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEstAgentConnecte(!!data.session);
    });
  }, []);

  useEffect(() => {
    async function chercher() {
      const { data } = await supabase
        .from('engins')
        .select('id, type_engin, marque, modele, plaque, statut, qr_code')
        .eq('qr_code', qr)
        .maybeSingle();

      setEngin(data || null);

      if (data && !dejaEnregistre) {
        setDejaEnregistre(true);
        await supabase.from('verifications').insert({
          engin_id: data.id,
          resultat: data.statut,
          via_public: true,
        });
      }
    }
    chercher();
  }, [qr]);

  if (engin === undefined) {
    return (
      <div className="shell">
        <div className="content"><p>Vérification en cours…</p></div>
      </div>
    );
  }

  if (engin === null) {
    return (
      <div className="shell">
        <div className="header">
          <p className="sigle">Vérification publique</p>
          <h1>Résultat</h1>
        </div>
        <div className="content">
          <div className="resultat-statut suspect">
            <p className="grand-label">Code inconnu</p>
          </div>
          <p style={{ color: 'var(--ink-soft)' }}>
            Ce code ne correspond à aucun engin enregistré dans le registre national.
          </p>
          <Link href="/verifier" className="btn secondaire" style={{ marginTop: 20 }}>Réessayer</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="header">
        <p className="sigle">Vérification publique</p>
        <h1>Résultat</h1>
      </div>
      <div className="content">
        <div className={`resultat-statut ${engin.statut}`}>
          <p className="grand-label">{LIBELLES[engin.statut] || engin.statut}</p>
        </div>

        <dl className="fiche-info">
          <dt>Type</dt>
          <dd>{engin.type_engin}</dd>
          <dt>Marque / Modèle</dt>
          <dd>{engin.marque || '—'} {engin.modele || ''}</dd>
          <dt>Plaque</dt>
          <dd>{engin.plaque || '—'}</dd>
        </dl>

        {estAgentConnecte && (engin.statut === 'vole' || engin.statut === 'suspect') && (
          <Link href={`/agent/signaler-interception/${engin.id}`} className="btn" style={{ marginBottom: 16 }}>
            Signaler l'interception
          </Link>
        )}

        <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 20 }}>
          Pour la sécurité du propriétaire, les coordonnées personnelles ne sont jamais affichées ici.
        </p>
      </div>
    </div>
  );
}
