'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../../../lib/supabaseClient';

export default function EspaceCitoyen() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [citoyen, setCitoyen] = useState(null);
  const [engins, setEngins] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [plaqueAAssocier, setPlaqueAAssocier] = useState('');
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [profilIntrouvable, setProfilIntrouvable] = useState(false);
  const [nomProfil, setNomProfil] = useState('');
  const [telephoneProfil, setTelephoneProfil] = useState('');
  const [cniProfil, setCniProfil] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push('/citoyen/login');
        return;
      }
      setSession(data.session);
      const { data: c } = await supabase.from('citoyens').select('*').eq('user_id', data.session.user.id).maybeSingle();
      if (!c) {
        setProfilIntrouvable(true);
        setChargement(false);
        return;
      }
      setCitoyen(c);
      chargerEngins(c);
    });
  }, []);

  async function completerProfil(e) {
    e.preventDefault();
    setErreur('');
    if (!nomProfil.trim() || !telephoneProfil.trim() || !cniProfil.trim()) {
      setErreur('Tous les champs sont obligatoires.');
      return;
    }

    const { data: nouveauProfil, error } = await supabase
      .from('citoyens')
      .insert({ user_id: session.user.id, nom: nomProfil.trim(), telephone: telephoneProfil.trim(), cni: cniProfil.trim() })
      .select()
      .single();

    if (error) {
      setErreur("Erreur lors de l'enregistrement du profil.");
      return;
    }

    setProfilIntrouvable(false);
    setCitoyen(nouveauProfil);
    chargerEngins(nouveauProfil);
  }

  async function chargerEngins(c) {
    if (!c) { setChargement(false); return; }
    setChargement(true);
    const { data } = await supabase
      .from('engins')
      .select('id, plaque, marque, modele, type_engin, statut, qr_code')
      .eq('proprietaire_citoyen_id', c.id)
      .order('created_at', { ascending: false });
    setEngins(data || []);
    setChargement(false);
  }

  async function associerEngin(e) {
    e.preventDefault();
    setErreur('');
    setMessage('');
    if (!plaqueAAssocier.trim()) return;

    const { data: { session: s } } = await supabase.auth.getSession();
    const reponse = await fetch('/api/citoyen/associer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.access_token}` },
      body: JSON.stringify({ plaque: plaqueAAssocier.trim() }),
    });
    const resultat = await reponse.json();

    if (!reponse.ok) {
      setErreur(resultat.erreur);
      return;
    }

    setMessage('Engin associé à votre compte.');
    setPlaqueAAssocier('');
    chargerEngins(citoyen);
  }

  async function declarerVol(enginId) {
    setErreur('');
    setMessage('');
    const { data: { session: s } } = await supabase.auth.getSession();
    const reponse = await fetch('/api/citoyen/declarer-vol', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.access_token}` },
      body: JSON.stringify({ enginId }),
    });
    const resultat = await reponse.json();

    if (!reponse.ok) {
      setErreur(resultat.erreur);
      return;
    }

    setMessage('Vol déclaré. Le portail public affichera désormais cette alerte.');
    chargerEngins(citoyen);
  }

  async function envoyerSos() {
    setErreur('');
    setMessage('');
    const { data: { session: s } } = await supabase.auth.getSession();
    const reponse = await fetch('/api/sos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.access_token}` },
      body: JSON.stringify({}),
    });
    const resultat = await reponse.json();

    if (!reponse.ok) {
      setErreur(resultat.erreur);
      return;
    }

    setMessage('Alerte SOS envoyée. Le poste le plus proche a été notifié.');
  }

  async function seDeconnecter() {
    await supabase.auth.signOut();
    router.push('/citoyen/login');
  }

  if (profilIntrouvable) {
    return (
      <div className="shell">
        <div className="header">
          <p className="sigle">Espace citoyen</p>
          <h1>Compléter votre profil</h1>
        </div>
        <div className="content">
          <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>
            Votre compte existe mais votre profil est incomplet. Renseignez ces informations pour continuer.
          </p>
          {erreur && <div className="erreur">{erreur}</div>}
          <form onSubmit={completerProfil}>
            <div className="field">
              <label htmlFor="nomProfil">Nom complet</label>
              <input id="nomProfil" value={nomProfil} onChange={(e) => setNomProfil(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="telephoneProfil">Téléphone</label>
              <input id="telephoneProfil" value={telephoneProfil} onChange={(e) => setTelephoneProfil(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="cniProfil">Numéro CNI</label>
              <input id="cniProfil" value={cniProfil} onChange={(e) => setCniProfil(e.target.value)} />
            </div>
            <button type="submit" className="btn">Enregistrer</button>
          </form>
        </div>
      </div>
    );
  }

  if (!session || !citoyen) {
    return (
      <div className="shell">
        <div className="content"><p>Chargement…</p></div>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="header">
        <p className="sigle">Espace citoyen</p>
        <h1>Bonjour, {citoyen.nom}</h1>
      </div>
      <div className="content">
        {erreur && <div className="erreur">{erreur}</div>}
        {message && (
          <div style={{ background: '#EAF6EF', border: '1px solid var(--statut-actif)', color: 'var(--statut-actif)', padding: '10px 12px', borderRadius: 4, fontSize: 14, marginBottom: 16 }}>
            {message}
          </div>
        )}

        <button onClick={envoyerSos} className="btn" style={{ background: 'var(--statut-vole)' }}>
          🆘 SOS — Envoyer une alerte au poste le plus proche
        </button>

        <div className="divider" />

        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>Mes véhicules</p>

        {chargement && <p style={{ color: 'var(--ink-soft)' }}>Chargement…</p>}

        {!chargement && engins.length === 0 && (
          <p style={{ color: 'var(--ink-soft)' }}>Aucun véhicule associé à votre compte pour l'instant.</p>
        )}

        {engins.map((e) => (
          <div key={e.id} className="liste-item">
            <span className="plaque">{e.plaque || 'Sans plaque'}</span>
            {' '}
            <span className={`badge ${e.statut}`}>{e.statut}</span>
            <div className="meta">{e.type_engin} — {e.marque} {e.modele}</div>

            <div style={{ marginTop: 10, textAlign: 'center' }}>
              <QRCodeCanvas value={`${typeof window !== 'undefined' ? window.location.origin : ''}/verifier/${e.qr_code}`} size={120} includeMargin={true} />
            </div>

            {e.statut !== 'vole' && (
              <button
                className="btn secondaire"
                style={{ marginTop: 10, width: 'auto', padding: '8px 14px', fontSize: 13 }}
                onClick={() => {
                  if (confirm('Confirmer la déclaration de vol de ce véhicule ?')) declarerVol(e.id);
                }}
              >
                Déclarer volé
              </button>
            )}
          </div>
        ))}

        <div className="divider" />

        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>
          Associer un véhicule déjà enregistré par un agent
        </p>
        <form onSubmit={associerEngin} style={{ display: 'flex', gap: 8 }}>
          <input
            value={plaqueAAssocier}
            onChange={(e) => setPlaqueAAssocier(e.target.value)}
            placeholder="Plaque du véhicule"
            style={{ flex: 1, padding: 10, border: '1px solid var(--line)', borderRadius: 4 }}
          />
          <button type="submit" className="btn secondaire" style={{ width: 'auto', padding: '10px 16px' }}>Associer</button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8 }}>
          Ça ne marche que si le numéro CNI enregistré par l'agent correspond exactement au vôtre.
        </p>

        <div className="divider" />
        <button onClick={seDeconnecter} className="btn secondaire">Se déconnecter</button>
      </div>
    </div>
  );
}
