'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

const LIBELLES = {
  actif: 'En règle',
  vole: 'VOLÉ',
  suspect: 'SUSPECT',
  bloque: 'BLOQUÉ',
  retire: 'RETIRÉ',
  archive: 'ARCHIVÉ',
};

export default function ControleRoutier() {
  const router = useRouter();
  const [agent, setAgent] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [engin, setEngin] = useState(null);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [position, setPosition] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.push('/agent/login'); return; }
      const { data: a } = await supabase.from('agents')
        .select('id, role, actif').eq('user_id', data.session.user.id).maybeSingle();
      if (!a?.actif) { await supabase.auth.signOut(); router.push('/agent/login'); return; }
      setAgent(a);
      setChargement(false);
    });
  }, [router]);

  async function chercher(e) {
    e?.preventDefault();
    const terme = recherche.trim();
    setErreur(''); setMessage(''); setEngin(null);
    if (!terme) { setErreur('Saisissez une plaque, un numéro de châssis ou un QR code.'); return; }
    if (terme.length > 80) { setErreur('Recherche trop longue.'); return; }

    const normalise = terme.toUpperCase();
    const [qr, plaque, chassis] = await Promise.all([
      supabase.from('engins').select('id,qr_code,type_engin,marque,modele,couleur,plaque,numero_chassis,statut,statut_fiscal,assurance_expiration').eq('qr_code', normalise).maybeSingle(),
      supabase.from('engins').select('id,qr_code,type_engin,marque,modele,couleur,plaque,numero_chassis,statut,statut_fiscal,assurance_expiration').ilike('plaque', normalise).limit(1).maybeSingle(),
      supabase.from('engins').select('id,qr_code,type_engin,marque,modele,couleur,plaque,numero_chassis,statut,statut_fiscal,assurance_expiration').ilike('numero_chassis', normalise).limit(1).maybeSingle(),
    ]);
    const resultat = qr.data || plaque.data || chassis.data;
    if (!resultat) { setErreur('Aucun engin trouvé dans le registre.'); return; }
    setEngin(resultat);
  }

  function demanderPosition() {
    setErreur('');
    if (!navigator.geolocation) { setErreur('GPS indisponible sur cet appareil.'); return; }
    navigator.geolocation.getCurrentPosition(
      p => setPosition({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => setErreur('Position indisponible. Le contrôle peut être enregistré sans GPS.'),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }

  async function enregistrerControle() {
    if (!agent || !engin) return;
    setEnvoi(true); setErreur(''); setMessage('');
    const { error } = await supabase.from('verifications').insert({
      engin_id: engin.id,
      agent_id: agent.id,
      resultat: engin.statut || 'actif',
      via_public: false,
      lieu: null,
      lieu_latitude: position?.latitude ?? null,
      lieu_longitude: position?.longitude ?? null,
    });
    setEnvoi(false);
    if (error) { setErreur('Le contrôle n’a pas pu être enregistré.'); return; }
    setMessage('Contrôle routier enregistré avec succès.');
  }

  if (chargement) return <div className="shell"><div className="content"><p>Chargement…</p></div></div>;

  return (
    <div className="shell">
      <div className="header">
        <button onClick={() => window.history.back()} style={{background:'none',border:'none',color:'var(--brand)',fontSize:14,padding:0,marginBottom:10,cursor:'pointer'}}>← Retour</button>
        <p className="sigle">Espace agent</p>
        <h1>Contrôle routier</h1>
        <p style={{color:'var(--ink-soft)',fontSize:13}}>Rechercher un engin et enregistrer le contrôle effectué sur le terrain.</p>
      </div>
      <div className="content">
        {erreur && <div className="erreur">{erreur}</div>}
        {message && <div className="resultat-statut actif"><p className="grand-label">{message}</p></div>}

        <form onSubmit={chercher}>
          <label>Plaque, châssis ou QR code</label>
          <input value={recherche} onChange={e=>setRecherche(e.target.value)} maxLength={80} autoCapitalize="characters" placeholder="Ex. RC-1234-AB ou code QR" />
          <button className="btn" type="submit">Rechercher</button>
        </form>

        <Link href="/agent/scanner" className="btn secondaire" style={{marginTop:10}}>Scanner le QR avec la caméra</Link>

        {engin && (
          <div style={{marginTop:20}}>
            <div className={`resultat-statut ${engin.statut || 'actif'}`}>
              <p className="grand-label">{LIBELLES[engin.statut] || engin.statut || 'Statut inconnu'}</p>
            </div>
            <dl className="fiche-info">
              <dt>Engin</dt><dd>{engin.type_engin || '—'}</dd>
              <dt>Marque / Modèle</dt><dd>{engin.marque || '—'} {engin.modele || ''}</dd>
              <dt>Plaque</dt><dd>{engin.plaque || '—'}</dd>
              <dt>Châssis</dt><dd>{engin.numero_chassis || '—'}</dd>
              <dt>Couleur</dt><dd>{engin.couleur || '—'}</dd>
              <dt>Situation fiscale</dt><dd>{engin.statut_fiscal || '—'}</dd>
              <dt>Assurance</dt><dd>{engin.assurance_expiration ? new Date(engin.assurance_expiration).toLocaleDateString('fr-FR') : 'Non renseignée'}</dd>
            </dl>

            <button type="button" className="btn secondaire" onClick={demanderPosition} style={{marginTop:8}}>
              {position ? `GPS : ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}` : 'Ajouter la position GPS du contrôle'}
            </button>

            <button type="button" className="btn" disabled={envoi} onClick={enregistrerControle} style={{marginTop:10}}>
              {envoi ? 'Enregistrement…' : 'Enregistrer ce contrôle'}
            </button>

            {(engin.statut === 'vole' || engin.statut === 'suspect') && (
              <Link href={`/agent/signaler-interception/${engin.id}`} className="btn" style={{marginTop:10}}>
                Signaler l’interception
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
