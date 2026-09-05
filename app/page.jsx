import Link from 'next/link';

export default function Accueil() {
  return (
    <div className="shell">
      <div className="header">
        <p className="sigle">République de Guinée</p>
        <h1>RNCR — Registre National de Contrôle Routier</h1>
      </div>
      <div className="content">
        <p style={{ color: 'var(--ink-soft)', marginBottom: 28 }}>
          Choisissez votre espace.
        </p>

        <Link href="/verifier" className="btn">Vérifier un engin</Link>
        <Link href="/agent/login" className="btn secondaire">Espace agent</Link>
      </div>
    </div>
  );
}
