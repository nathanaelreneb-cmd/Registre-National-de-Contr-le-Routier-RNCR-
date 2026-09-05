'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SaisirCode() {
  const router = useRouter();
  const [code, setCode] = useState('');

  function verifier(e) {
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
        <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>
          Scannez le QR code collé sur l'engin, ou saisissez le code inscrit dessus.
        </p>
        <form onSubmit={verifier}>
          <div className="field">
            <label htmlFor="code">Code de l'engin</label>
            <input
              id="code"
              placeholder="RNCR-XXXXXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <button type="submit" className="btn">Vérifier</button>
        </form>
      </div>
    </div>
  );
}
