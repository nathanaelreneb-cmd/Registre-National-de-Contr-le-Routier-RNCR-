'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ScannerAgent() {
  const router = useRouter();
  const zoneRef = useRef(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let scanner;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      scanner = new Html5Qrcode('zone-scanner');

      Html5Qrcode.getCameras()
        .then((cameras) => {
          if (!cameras || cameras.length === 0) {
            setErreur("Aucune caméra détectée sur cet appareil.");
            return;
          }

          scanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 240 },
            (texteDecode) => {
              // texteDecode = lien complet /verifier/CODE ou juste le code
              const partie = texteDecode.split('/').pop();
              scanner.stop().then(() => {
                router.push(`/verifier/${partie}`);
              });
            },
            () => {}
          );
        })
        .catch(() => setErreur("Impossible d'accéder à la caméra. Vérifiez les autorisations."));
    });

    return () => {
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="shell">
      <div className="header">
        <p className="sigle">Espace agent</p>
        <h1>Scanner un QR code</h1>
      </div>
      <div className="content">
        {erreur && <div className="erreur">{erreur}</div>}
        <div id="zone-scanner" ref={zoneRef} style={{ width: '100%', borderRadius: 4, overflow: 'hidden' }} />
        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--ink-soft)' }}>
          Cadrez le QR code collé sur l'engin. La vérification s'ouvre automatiquement.
        </p>
      </div>
    </div>
  );
}
