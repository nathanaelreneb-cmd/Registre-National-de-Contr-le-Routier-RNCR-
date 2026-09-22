'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';

const STATUT_PERMIS = { valide:'Valide', expire:'Expiré', suspendu:'Suspendu', retire:'Retiré', invalide:'Invalide' };

function dateFr(v){ return v ? new Date(v).toLocaleDateString('fr-FR') : '—'; }

export default function DossierConducteur({ params }) {
  const { id } = params; const router = useRouter();
  const [autorise,setAutorise]=useState(null); const [chargement,setChargement]=useState(true); const [erreur,setErreur]=useState('');
  const [conducteur,setConducteur]=useState(null); const [permis,setPermis]=useState([]); const [engins,setEngins]=useState([]);
  const [form,setForm]=useState({numero_permis:'',date_delivrance:'',date_expiration:'',autorite_delivrance:'',categories:'',restrictions:''});
  const [saving,setSaving]=useState(false); const [enginRecherche,setEnginRecherche]=useState(''); const [enginsTrouves,setEnginsTrouves]=useState([]); const [association,setAssociation]=useState(false);

  async function charger(){
    setChargement(true);
    const [c,p,ce] = await Promise.all([
      supabase.from('conducteurs').select('id,citoyen_id,numero_cni,nom,prenom,date_naissance,sexe,telephone,adresse,statut,observations').eq('id',id).maybeSingle(),
      supabase.from('permis_conduire').select('id,numero_permis,date_delivrance,date_expiration,autorite_delivrance,categories,restrictions,statut,suspension_debut,suspension_fin,motif_suspension,retrait_at,observations,created_at').eq('conducteur_id',id).order('created_at',{ascending:false}),
      supabase.from('conducteur_engins').select('id,engin_id,est_principal,date_debut,date_fin').eq('conducteur_id',id).order('created_at',{ascending:false})
    ]);
    if(c.error || !c.data){setErreur('Dossier conducteur introuvable.');setChargement(false);return;}
    setConducteur(c.data); setPermis(p.data||[]);
    const ids=(ce.data||[]).map(x=>x.engin_id);
    if(ids.length){ const {data:e}=await supabase.from('engins').select('id,plaque,type_engin,marque,modele,statut').in('id',ids); setEngins(e||[]); } else setEngins([]);
    setChargement(false);
  }

  useEffect(()=>{(async()=>{const {data}=await supabase.auth.getSession(); if(!data.session)return router.push('/agent/login'); const {data:a}=await supabase.from('agents').select('role,actif').eq('user_id',data.session.user.id).maybeSingle(); if(!a?.actif || !['agent','responsable','responsable_regional','admin'].includes(a.role))return router.push('/agent/login'); setAutorise(true); await charger();})();},[id]);

  async function rechercherEngins(e){\n    e?.preventDefault(); const t=enginRecherche.trim().slice(0,60); if(!t)return;\n    const [p,c,q]=await Promise.all([supabase.from('engins').select('id,plaque,numero_chassis,type_engin,marque,modele').ilike('plaque',\`%${t}%\`).limit(20),supabase.from('engins').select('id,plaque,numero_chassis,type_engin,marque,modele').ilike('numero_chassis',\`%${t}%\`).limit(20),supabase.from('engins').select('id,plaque,numero_chassis,type_engin,marque,modele').ilike('qr_code',\`%${t}%\`).limit(20)]);\n    const m=new Map(); [p.data,c.data,q.data].flat().filter(Boolean).forEach(x=>m.set(x.id,x)); setEnginsTrouves([...m.values()]);\n  }\n\n  async function associerEngin(enginId){\n    setAssociation(true); setErreur(''); const {error}=await supabase.from('conducteur_engins').insert({conducteur_id:id,engin_id:enginId,est_principal:engins.length===0});\n    setAssociation(false); if(error && error.code!=='23505'){setErreur('Impossible d’associer cet engin au conducteur.');return;} await charger(); setEnginsTrouves([]); setEnginRecherche('');\n  }\n\n  async function ajouterPermis(e){
    e.preventDefault(); setErreur('');
    if(!form.numero_permis.trim()) return setErreur('Le numéro du permis est obligatoire.');
    setSaving(true);
    const payload={conducteur_id:id,numero_permis:form.numero_permis.trim().slice(0,80),date_delivrance:form.date_delivrance||null,date_expiration:form.date_expiration||null,autorite_delivrance:form.autorite_delivrance.trim().slice(0,150)||null,categories:form.categories.split(',').map(x=>x.trim().toUpperCase()).filter(Boolean).slice(0,10),restrictions:form.restrictions.trim().slice(0,1000)||null};
    const {error}=await supabase.from('permis_conduire').insert(payload);
    setSaving(false); if(error)return setErreur('Impossible d’enregistrer le permis. Vérifiez notamment que le numéro n’est pas déjà utilisé.');
    setForm({numero_permis:'',date_delivrance:'',date_expiration:'',autorite_delivrance:'',categories:'',restrictions:''}); await charger();
  }

  if(autorise===null || chargement)return <div className="shell"><div className="content"><p>Chargement…</p></div></div>;
  if(!conducteur)return <div className="shell"><div className="content"><p>{erreur||'Dossier introuvable.'}</p></div></div>;

  return <div className="shell" style={{maxWidth:820}}>
    <div className="header">
      <button onClick={()=>router.back()} className="btn secondaire" style={{width:'auto',marginBottom:12}}>← Retour</button>
      <p className="sigle">Registre national</p><h1>{conducteur.nom} {conducteur.prenom||''}</h1>
      <p style={{color:'var(--ink-soft)'}}>Dossier conducteur • statut : {conducteur.statut||'actif'}</p>
    </div>
    <div className="content">
      {erreur&&<div className="erreur">{erreur}</div>}
      <section><h2>1. Identité</h2><dl className="fiche-info">
        <dt>CNI</dt><dd>{conducteur.numero_cni||'—'}</dd><dt>Date de naissance</dt><dd>{dateFr(conducteur.date_naissance)}</dd>
        <dt>Sexe</dt><dd>{conducteur.sexe||'—'}</dd><dt>Téléphone</dt><dd>{conducteur.telephone||'—'}</dd><dt>Adresse</dt><dd>{conducteur.adresse||'—'}</dd>
      </dl></section>
      <div className="divider"/>
      <section><h2>2. Permis de conduire</h2>
        {permis.map(p=><div key={p.id} className="liste-item">
          <strong>{p.numero_permis}</strong> <span className={`badge ${p.statut==='valide'?'actif':p.statut==='suspendu'?'suspect':'vole'}`}>{STATUT_PERMIS[p.statut]||p.statut}</span>
          <div className="meta">Catégories : {(p.categories||[]).join(', ')||'—'} • Expiration : {dateFr(p.date_expiration)}</div>
          {p.restrictions&&<div className="meta">Restrictions : {p.restrictions}</div>}
          {p.suspension_debut&&<div className="meta">Suspension : {dateFr(p.suspension_debut)} → {dateFr(p.suspension_fin)}</div>}
        </div>)}
        {permis.length===0&&<p style={{color:'var(--ink-soft)'}}>Aucun permis enregistré.</p>}
      </section>
      <div className="divider"/>
      <section><h2>3. Ajouter un permis</h2><form onSubmit={ajouterPermis}>
        <div className="field"><label>Numéro du permis *</label><input required value={form.numero_permis} onChange={e=>setForm({...form,numero_permis:e.target.value})}/></div>
        <div className="field"><label>Date de délivrance</label><input type="date" value={form.date_delivrance} onChange={e=>setForm({...form,date_delivrance:e.target.value})}/></div>
        <div className="field"><label>Date d’expiration</label><input type="date" value={form.date_expiration} onChange={e=>setForm({...form,date_expiration:e.target.value})}/></div>
        <div className="field"><label>Autorité de délivrance</label><input value={form.autorite_delivrance} onChange={e=>setForm({...form,autorite_delivrance:e.target.value})}/></div>
        <div className="field"><label>Catégories (séparées par des virgules)</label><input placeholder="A, B, C..." value={form.categories} onChange={e=>setForm({...form,categories:e.target.value})}/></div>
        <div className="field"><label>Restrictions</label><textarea rows="3" maxLength="1000" value={form.restrictions} onChange={e=>setForm({...form,restrictions:e.target.value})}/></div>
        <button className="btn" disabled={saving}>{saving?'Enregistrement…':'Enregistrer le permis'}</button>
      </form></section>
      <div className="divider"/>
      <section><h2>4. Engins associés ({engins.length})</h2><Link href={`/agent/conducteurs/${id}/historique`} className="btn secondaire">Voir l’historique complet du conducteur</Link>
        <form onSubmit={rechercherEngins}>
          <div className="field"><label>Associer un engin (plaque, châssis ou QR)</label><input value={enginRecherche} onChange={e=>setEnginRecherche(e.target.value.slice(0,60))} placeholder="Ex. NO-073-A08 ou RNCR-..." /></div>
          <button className="btn secondaire" disabled={!enginRecherche.trim()}>Rechercher un engin</button>
        </form>
        {enginsTrouves.map(e=><div key={e.id} className="liste-item"><strong>{e.plaque||'Sans plaque'}</strong><div className="meta">{e.type_engin} • {e.marque} {e.modele} • châssis {e.numero_chassis||'—'}</div><button type="button" className="btn" onClick={()=>associerEngin(e.id)} disabled={association}>Associer au conducteur</button></div>)}
        {engins.length?engins.map(e=><Link key={e.id} href={`/agent/fiche/${e.id}`} className="liste-item" style={{display:'block'}}><strong>{e.plaque||'Sans plaque'}</strong><div className="meta">{e.type_engin} • {e.marque} {e.modele} • {e.statut}</div></Link>):<p style={{color:'var(--ink-soft)'}}>Aucun engin associé.</p>}</section>
    </div>
  </div>;
}