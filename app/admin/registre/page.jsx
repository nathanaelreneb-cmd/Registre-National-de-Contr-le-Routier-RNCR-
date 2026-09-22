'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

export default function RegistreCentral() {
  const router = useRouter();
  const [autorise, setAutorise] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [dejaCherche, setDejaCherche] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let actif = true;

    async function verifierAcces() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/admin/login');
        return;
      }

      const { data: agent } = await supabase
        .from('agents')
        .select('role, actif')
        .eq('user_id', data.session.user.id)
        .single();

      if (!agent || agent.role !== 'admin' || agent.actif === false) {
        router.push('/admin/login');
        return;
      }

      if (actif) setAutorise(true);
    }

    verifierAcces();
    return () => { actif = false; };
  }, [router]);

  async function rechercher(e) {
    e.preventDefault();
    const terme = recherche.trim().slice(0, 80);
    if (!terme) return;

    setChargement(true);
    setDejaCherche(true);
    setErreur('');

    // Évite d'injecter directement le terme dans une expression .or().
    const [
      plaque,
      chassis,
      proprietaire,
      qr,
    ] = await Promise.all([
      supabase.from('engins').select('id, plaque, numero_chassis, marque, modele, statut, proprietaire_nom, created_at').ilike('plaque', `%${terme}%`).limit(30),
      supabase.from('engins').select('id, plaque, numero_chassis, marque, modele, statut, proprietaire_nom, created_at').ilike('numero_chassis', `%${terme}%`).limit(30),
      supabase.from('engins').select('id, plaque, numero_chassis, marque, modele, statut, proprietaire_nom, created_at').ilike('proprietaire_nom', `%${terme}%`).limit(30),
      supabase.from('engins').select('id, plaque, numero_chassis, marque, modele, statut, proprietaire_nom, created_at').ilike('qr_code', `%${terme}%`).limit(30),
    ]);

    const erreurs = [plaque, chassis, proprietaire, qr].filter((r) => r.error);
    if (erreurs.length) {
      setErreur('La recherche n’a pas pu être effectuée.');
      setResultats([]);
      setChargement(false);
      return;
    }

    const uniques = new Map();
    [plaque.data, chassis.data, proprietaire.data, qr.data]
      .flat()
      .forEach((engin) => uniques.set(engin.id, engin));

    const resultatFinal = [...uniques.values()]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 30);

    setResultats(resultatFinal);
    setChargement(false);
  }

  if (autorise === null) {
    return (
      <div className="shell">
        <div className="content"><p>Chargement…</p></div>
      </div>
    );
  }

  return (
    <div className="shell" style={{ maxWidth: 760 }}>
      <div className="header">
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 14, padding: 0, marginBottom: 10, cursor: 'pointer' }}>
          ← Retour
        </button>
        <p className="sigle">Portail Administration</p>
        <h1>Registre central des engins</h1>
        <p style={{ color: 'var(--ink-soft)', marginTop: 6 }}>
          Recherche rapide par plaque, châssis, propriétaire ou QR.
        </p>
      </div>

      <div className="content">
        <form onSubmit={rechercher}>
          <div className="field">
            <label htmlFor="recherche">Critère de recherche</label>
            <input
              id="recherche"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value.slice(0, 80))}
              placeholder="Ex. NO-073-A08"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="btn" disabled={chargement || !recherche.trim()}>
            {chargement ? 'Recherche…' : 'Rechercher'}
          </button>
        </form>

        <div className="divider" />

        {erreur && <p style={{ color: 'var(--statut-vole)' }}>{erreur}</p>}

        {!chargement && dejaCherche && !erreur && resultats.length === 0 && (
          <p style={{ color: 'var(--ink-soft)' }}>Aucun engin correspondant.</p>
        )}

        {resultats.map((engin) => (
          <div key={engin.id} className="liste-item" style={{ marginBottom: 10 }}>
            <Link href={`/admin/registre/${engin.id}`} style={{ display: 'block' }}>
              <span className="plaque">{engin.plaque || 'Sans plaque'}</span>{' '}
              <span className={`badge ${engin.statut || ''}`}>{engin.statut || 'inconnu'}</span>
              <div className="meta">
                {engin.marque || ''} {engin.modele || ''} — {engin.proprietaire_nom || 'Propriétaire inconnu'}
              </div>
            </Link>
            <Link
              href={`/admin/trajet/${engin.id}`}
              className="btn secondaire"
              style={{ width: 'auto', padding: '8px 14px', fontSize: 13, marginTop: 10, display: 'inline-block' }}
            >
              Voir le trajet
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
