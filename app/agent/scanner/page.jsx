'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ScannerAgent() {
  const router = useRouter();
  const zoneRef = useRef(null);
  const fichierRef = useRef(null);
  const [erreur, setErreur] = useState('');
  const [analyseEnCours, setAnalyseEnCours] = useState(false);

  useEffect(() => {
    let scanner;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      scanner = new Html5Qrcode('zone-scanner');

      Html5Qrcode.getCameras()
        .then((cameras) => {
          if (!cameras || cameras.length === 0) {
            setErreur("Aucune caméra détectée sur cet appareil. Utilisez l'option « Choisir une photo » ci-dessous.");
            return;
          }

          scanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 240 },
            (texteDecode) => {
              const partie = texteDecode.split('/').pop();
              scanner.stop().then(() => {
                router.push(`/verifier/${partie}`);
              });
            },
            () => {}
          ).then(() => {
            setErreur('');
          }).catch(() => {
            setErreur("Autorisation caméra refusée. Réautorisez la caméra dans les paramètres du site, ou utilisez « Choisir une photo » ci-dessous.");
          });
        })
        .catch(() => setErreur("Impossible d'accéder à la caméra. Utilisez l'option « Choisir une photo » ci-dessous."));
    });

    return () => {
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, []);

  async function analyserPhoto(e) {
    const fichier = e.target.files && e.target.files[0];
    if (!fichier) return;

    setErreur('');
    setAnalyseEnCours(true);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const lecteur = new Html5Qrcode('lecteur-fichier-cache');
      const texteDecode = await lecteur.scanFile(fichier, false);
      const partie = texteDecode.split('/').pop();
      router.push(`/verifier/${partie}`);
    } catch (err) {
      setAnalyseEnCours(false);
      setErreur("Aucun QR code reconnu sur cette photo. Réessayez avec une image plus nette et bien cadrée.");
    }
  }

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

        <div className="divider" />

        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10 }}>
          Pas de caméra disponible, ou QR déjà pris en photo ?
        </p>

        <button
          type="button"
          className="btn secondaire"
          disabled={analyseEnCours}
          onClick={() => fichierRef.current && fichierRef.current.click()}
        >
          {analyseEnCours ? 'Analyse en cours…' : 'Choisir une photo (galerie ou appareil photo)'}
        </button>

        <input
          ref={fichierRef}
          type="file"
          accept="image/*"
          onChange={analyserPhoto}
          style={{ display: 'none' }}
        />

        <div
          id="lecteur-fichier-cache"
          style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
        />
      </div>
    </div>
  );
      }
