'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SaisirCode() {
  const router = useRouter();
  const fichierRef = useRef(null);
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState('');
  const [analyseEnCours, setAnalyseEnCours] = useState(false);

  useEffect(() => {
    let scanner;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      scanner = new Html5Qrcode('zone-scanner-public');

      Html5Qrcode.getCameras()
        .then((cameras) => {
          if (!cameras || cameras.length === 0) {
            setErreur("Aucune caméra détectée. Utilisez « Choisir une photo » ou saisissez le code à la main ci-dessous.");
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
          );
        })
        .catch(() => setErreur("Impossible d'accéder à la caméra. Utilisez « Choisir une photo » ou saisissez le code à la main ci-dessous."));
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
      const lecteur = new Html5Qrcode('lecteur-fichier-cache-public');
      const texteDecode = await lecteur.scanFile(fichier, false);
      const partie = texteDecode.split('/').pop();
      router.push(`/verifier/${partie}`);
    } catch (err) {
      setAnalyseEnCours(false);
      setErreur("Aucun QR code reconnu sur cette photo. Réessayez avec une image plus nette.");
    }
  }

  function verifierCodeManuel(e) {
    e.preventDefault();
    if (!code.trim()) return;
    router.push(`/verifier/${code.trim().toUpperCase()}`);
  }

  return (
    <div className="shell">
      <div className="header">
        <p className="sigle">Vérification publique</p>
        <h1>Vérifier un engin</h1>
      </div>
      <div className="content">
        {erreur && <div className="erreur">{erreur}</div>}

        <div id="zone-scanner-public" style={{ width: '100%', borderRadius: 4, overflow: 'hidden' }} />
        <p style={{ marginTop: 16, marginBottom: 20, fontSize: 13, color: 'var(--ink-soft)' }}>
          Cadrez le QR code collé sur l'engin. La vérification s'ouvre automatiquement.
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
          id="lecteur-fichier-cache-public"
          style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
        />

        <div className="divider" />

        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10 }}>
          Ou saisissez le code inscrit sur l'engin :
        </p>

        <form onSubmit={verifierCodeManuel}>
          <div className="field">
            <label htmlFor="code">Code de l'engin</label>
            <input
              id="code"
              placeholder="RNCR-XXXXXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <button type="submit" className="btn secondaire">Vérifier ce code</button>
        </form>
      </div>
    </div>
  );
                                }
