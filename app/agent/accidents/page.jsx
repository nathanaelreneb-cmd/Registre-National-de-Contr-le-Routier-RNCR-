'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const TYPES = [
  ['collision','Collision'],
  ['sortie_route','Sortie de route'],
  ['renversement','Renversement'],
  ['collision_pieton','Collision avec piéton'],
  ['autre','Autre'],
];

const GRAVITES = [
  ['materiel','Dégâts matériels'],
  ['blessures','Blessures'],
  ['grave','Blessures graves'],
  ['mortel','Décès'],
];

export default function DeclarerAccident() {
  const router = useRouter();
  const [agent, setAgent] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [position, setPosition] = useState(null);
  const [form, setForm] = useState({
    date_heure: new Date().toISOString().slice(0,16),
    lieu: '',
    type_accident: 'collision',
    gravite: 'materiel',
    description: '',
    conditions_meteo: '',
    etat_route: '',
    eclairage: '',
    cause_presumee: '',
    alcool_drogue: '',
    vitesse_estimee: '',
    nombre_deces: 0,
    nombre_blesses_graves: 0,
    nombre_blesses_legers: 0,
    nombre_pietons: 0,
    nombre_motos: 0,
    nombre_transports_collectifs: 0,
    secours_appeles: false,
    ambulance: false,
    hopital_destination: '',
    rapport_police: '',
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push('/agent/login');
        return;
      }
      const { data: a } = await supabase
        .from('agents')
        .select('id, role, actif, poste_id')
        .eq('user_id', data.session.user.id)
        .maybeSingle();
      if (!a?.actif) {
        await supabase.auth.signOut();
        router.push('/agent/login');
        return;
      }
      setAgent(a);
      setChargement(false);
    });
  }, [router]);

  function modifier(champ, valeur) {
    setForm((ancien) => ({ ...ancien, [champ]: valeur }));
  }

  function demanderPosition() {
    setErreur('');
    if (!navigator.geolocation) {
      setErreur('La géolocalisation n’est pas disponible sur cet appareil.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setErreur('Position indisponible. L’accident peut quand même être enregistré sans GPS.'),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }

  async function enregistrer(e) {
    e.preventDefault();
    if (!agent) return;
    setErreur('');
    setMessage('');
    if (!form.lieu.trim()) {
      setErreur('Le lieu de l’accident est obligatoire.');
      return;
    }

    setEnvoi(true);
    const dossier = `ACC-${new Date().getFullYear()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
    const { data, error } = await supabase
      .from('accidents')
      .insert({
        numero_dossier: dossier,
        date_heure: new Date(form.date_heure).toISOString(),
        lieu: form.lieu.trim().slice(0,500),
        latitude: position?.latitude ?? null,
        longitude: position?.longitude ?? null,
        type_accident: form.type_accident,
        gravite: form.gravite,
        description: form.description.trim().slice(0,4000) || null,
        conditions_meteo: form.conditions_meteo.trim().slice(0,100) || null,
        etat_route: form.etat_route.trim().slice(0,200) || null,
        eclairage: form.eclairage.trim().slice(0,100) || null,
        cause_presumee: form.cause_presumee.trim().slice(0,500) || null,
        alcool_drogue: form.alcool_drogue.trim().slice(0,200) || null,
        vitesse_estimee: form.vitesse_estimee ? Number(form.vitesse_estimee) : null,
        nombre_deces: Number(form.nombre_deces) || 0,
        nombre_blesses_graves: Number(form.nombre_blesses_graves) || 0,
        nombre_blesses_legers: Number(form.nombre_blesses_legers) || 0,
        nombre_pietons: Number(form.nombre_pietons) || 0,
        nombre_motos: Number(form.nombre_motos) || 0,
        nombre_transports_collectifs: Number(form.nombre_transports_collectifs) || 0,
        secours_appeles: form.secours_appeles,
        ambulance: form.ambulance,
        hopital_destination: form.hopital_destination.trim().slice(0,300) || null,
        rapport_police: form.rapport_police.trim().slice(0,2000) || null,
        created_by_agent_id: agent.id,
        poste_id: agent.poste_id || null,
      })
      .select('id, numero_dossier')
      .single();

    setEnvoi(false);
    if (error) {
      setErreur(error.message || 'Impossible d’enregistrer l’accident.');
      return;
    }
    setMessage(`Accident enregistré. Dossier ${data.numero_dossier}.`);
    setTimeout(() => router.push('/agent/historique-accidents'), 800);
  }

  if (chargement) return <div className="shell"><div className="content"><p>Chargement…</p></div></div>;

  return (
    <div className="shell">
      <div className="header">
        <button onClick={() => window.history.back()} style={{ background:'none', border:'none', color:'var(--brand)', fontSize:14, padding:0, marginBottom:10, cursor:'pointer' }}>← Retour</button>
        <p className="sigle">Espace agent</p>
        <h1>Enregistrer un accident</h1>
        <p style={{ color:'var(--ink-soft)', fontSize:13 }}>Créer un dossier terrain avec localisation, gravité, victimes et circonstances.</p>
      </div>
      <div className="content">
        {erreur && <div className="erreur">{erreur}</div>}
        {message && <div className="resultat-statut actif"><p className="grand-label">{message}</p></div>}

        <form onSubmit={enregistrer}>
          <label>Localisation / lieu *</label>
          <input value={form.lieu} onChange={(e)=>modifier('lieu',e.target.value)} maxLength={500} required placeholder="Ex. Route Le Prince, carrefour..." />

          <button type="button" className="btn secondaire" onClick={demanderPosition} style={{marginTop:8}}>
            {position ? `GPS enregistré : ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}` : 'Ajouter ma position GPS'}
          </button>

          <label>Date et heure *</label>
          <input type="datetime-local" value={form.date_heure} onChange={(e)=>modifier('date_heure',e.target.value)} required />

          <label>Type d’accident</label>
          <select value={form.type_accident} onChange={(e)=>modifier('type_accident',e.target.value)}>
            {TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>

          <label>Gravité</label>
          <select value={form.gravite} onChange={(e)=>modifier('gravite',e.target.value)}>
            {GRAVITES.map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>

          <div className="divider" />
          <p style={{fontWeight:600}}>Bilan humain et véhicules</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[
              ['nombre_deces','Décès'],['nombre_blesses_graves','Blessés graves'],
              ['nombre_blesses_legers','Blessés légers'],['nombre_pietons','Piétons'],
              ['nombre_motos','Motos'],['nombre_transports_collectifs','Transports collectifs']
            ].map(([v,l])=><div key={v}><label>{l}</label><input type="number" min="0" max="9999" value={form[v]} onChange={(e)=>modifier(v,e.target.value)} /></div>)}
          </div>

          <label>Conditions météo</label>
          <input value={form.conditions_meteo} onChange={(e)=>modifier('conditions_meteo',e.target.value)} maxLength={100} placeholder="Pluie, sec, brouillard..." />
          <label>État de la route</label>
          <input value={form.etat_route} onChange={(e)=>modifier('etat_route',e.target.value)} maxLength={200} placeholder="Bon, dégradé, travaux..." />
          <label>Éclairage</label>
          <input value={form.eclairage} onChange={(e)=>modifier('eclairage',e.target.value)} maxLength={100} placeholder="Jour, nuit éclairée..." />
          <label>Cause présumée</label>
          <input value={form.cause_presumee} onChange={(e)=>modifier('cause_presumee',e.target.value)} maxLength={500} />
          <label>Alcool / drogue</label>
          <input value={form.alcool_drogue} onChange={(e)=>modifier('alcool_drogue',e.target.value)} maxLength={200} placeholder="Non constaté / en cours / confirmé..." />
          <label>Vitesse estimée (km/h)</label>
          <input type="number" min="0" max="500" value={form.vitesse_estimee} onChange={(e)=>modifier('vitesse_estimee',e.target.value)} />

          <label>Description / constat</label>
          <textarea rows="5" maxLength={4000} value={form.description} onChange={(e)=>modifier('description',e.target.value)} placeholder="Décrire les faits observés sans transformer une hypothèse en conclusion." />

          <label>Destination hospitalière</label>
          <input value={form.hopital_destination} onChange={(e)=>modifier('hopital_destination',e.target.value)} maxLength={300} />

          <label>Rapport / référence police</label>
          <textarea rows="3" maxLength={2000} value={form.rapport_police} onChange={(e)=>modifier('rapport_police',e.target.value)} />

          <label style={{display:'flex',alignItems:'center',gap:8,marginTop:12}}>
            <input type="checkbox" checked={form.secours_appeles} onChange={(e)=>modifier('secours_appeles',e.target.checked)} />
            Secours appelés
          </label>
          <label style={{display:'flex',alignItems:'center',gap:8}}>
            <input type="checkbox" checked={form.ambulance} onChange={(e)=>modifier('ambulance',e.target.checked)} />
            Ambulance / évacuation
          </label>

          <button className="btn" type="submit" disabled={envoi} style={{marginTop:18}}>
            {envoi ? 'Enregistrement…' : 'Enregistrer l’accident'}
          </button>
        </form>
      </div>
    </div>
  );
}
