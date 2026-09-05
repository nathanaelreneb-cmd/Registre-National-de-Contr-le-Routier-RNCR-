'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../../../lib/supabaseClient';

export default function FicheEngin({ params }) {
  const { id } = params;
  const [engin, setEngin] = useState(null);

  useEffect(() => {
    supabase
      .from('engins')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setEngin(data));
  }, [id]);

  if (!engin) {
    return (
      <div className="shell">
        <div className="content"><p>Chargement…</p></div>
      </div>
    );
  }

  const lienVerification = typeof window !== 'undefined'
    ? `${window.location.origin}/verifier/${engin.qr_code}`
    : '';

  return (
    <div className="shell">
      <div className="header no-print">
        <p className="sigle">Espace agent</p>
        <h1>Fiche engin</h1>
      </div>
      <div className="content">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <QRCodeSVG value={lienVerification} size={200} />
          <p style={{ marginTop: 12, fontWeight: 700, letterSpacing: '0.05em' }}>{engin.qr_code}</p>
        </div>

        <dl className="fiche-info">
          <dt>Type</dt>
          <dd>{engin.type_engin}</dd>
          <dt>Marque / Modèle</dt>
          <dd>{engin.marque} {engin.modele}</dd>
          <dt>Plaque</dt>
          <dd>{engin.plaque || '—'}</dd>
          <dt>Numéro de châssis</dt>
          <dd>{engin.numero_chassis || '—'}</dd>
          <dt>Propriétaire</dt>
          <dd>{engin.proprietaire_nom}</dd>
          <dt>Statut</dt>
          <dd><span className={`badge ${engin.statut}`}>{engin.statut}</span></dd>
        </dl>

        <div className="divider no-print" />
        <button onClick={() => window.print()} className="btn no-print">Imprimer la fiche</button>
      </div>
    </div>
  );
}
