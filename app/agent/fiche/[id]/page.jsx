'use client';

import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../../../../lib/supabaseClient';

export default function FicheEngin({ params }) {
  const { id } = params;
  const [engin, setEngin] = useState(null);
  const [partageIndisponible, setPartageIndisponible] = useState(false);

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

  function recupererCanvas() {
    return document.getElementById('qr-canvas-fiche');
  }

  function telecharger() {
    const canvas = recupererCanvas();
    if (!canvas) return;
    const lien = document.createElement('a');
    lien.download = `${engin.qr_code}.png`;
    lien.href = canvas.toDataURL('image/png');
    lien.click();
  }

  async function partagerOuTelecharger() {
    const canvas = recupererCanvas();
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      const fichier = new File([blob], `${engin.qr_code}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
        try {
          await navigator.share({
            files: [fichier],
            title: engin.qr_code,
            text: `QR code de vérification RNCR — ${engin.qr_code}`,
          });
          return;
        } catch (err) {
          return;
        }
      }

      setPartageIndisponible(true);
      telecharger();
    });
  }

  return (
    <div className="shell">
      <div className="header no-print">
        <p className="sigle">Espace agent</p>
        <h1>Fiche engin</h1>
      </div>
      <div className="content">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <QRCodeCanvas id="qr-canvas-fiche" value={lienVerification} size={220} />
          <p style={{ marginTop: 12, fontWeight: 700, letterSpacing: '0.05em' }}>{engin.qr_code}</p>
        </div>

        <button onClick={partagerOuTelecharger} className="btn no-print">
          Enregistrer / partager l'image du QR
        </button>
        {partageIndisponible && (
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8 }}>
            L'image a été téléchargée dans votre appareil (dossier Téléchargements / Galerie).
          </p>
        )}

        <div className="divider" />

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
        <button onClick={() => window.print()} className="btn secondaire no-print">Imprimer la fiche</button>
      </div>
    </div>
  );
}
