'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';

const GRAVITES={materiel:'Dégâts matériels',blessures:'Blessures',grave:'Blessures graves',mortel:'Décès'};

export default function AccidentDetail(){
  const {id}=useParams(); const router=useRouter();
  const [accident,setAccident]=useState(null),[engins,setEngins]=useState([]),[personnes,setPersonnes]=useState([]);
  const [chargement,setChargement]=useState(true),[erreur,setErreur]=useState(''),[message,setMessage]=useState('');
  const [recherche,setRecherche]=useState(''),[resultats,setResultats]=useState([]),[personne,setPersonne]=useState({type_personne:'conducteur',nom:'',telephone:'',blessure:'',evacuee:false,hopital:''});
  const [agentId,setAgentId]=useState(null),[photos,setPhotos]=useState([]),[uploading,setUploading]=useState(false);

  useEffect(()=>{ (async()=>{ const {data:s}=await supabase.auth.getSession(); if(!s.session){router.push('/agent/login');return;}
    const {data:a}=await supabase.from('agents').select('id,actif').eq('user_id',s.session.user.id).maybeSingle();
    if(!a?.actif){await supabase.auth.signOut();router.push('/agent/login');return;} setAgentId(a.id);
    const [ac,eg,pe]=await Promise.all([
      supabase.from('accidents').select('*').eq('id',id).maybeSingle(),
      supabase.from('accident_engins').select('id,engin_id,plaque,role_dans_accident,created_at').eq('accident_id',id).order('created_at'),
      supabase.from('accident_personnes').select('*').eq('accident_id',id).order('created_at')
    ]);
    if(ac.error||!ac.data){setErreur('Dossier introuvable ou inaccessible.');setChargement(false);return;}
    setAccident(ac.data);setEngins(eg.data||[]);setPersonnes(pe.data||[]);\n    const paths=Array.isArray(ac.data.photo_urls)?ac.data.photo_urls:[];\n    if(paths.length){ const signed=await Promise.all(paths.map(async path=>{const {data}=await supabase.storage.from('accidents').createSignedUrl(path,300);return data?.signedUrl?{path,url:data.signedUrl}:null;})); setPhotos(signed.filter(Boolean)); }\n    setChargement(false);
  })();},[id,router]);

  async function chercher(e){e.preventDefault();setErreur('');const q=recherche.trim();if(!q){setResultats([]);return;}
    const [p,c]=await Promise.all([
      supabase.from('engins').select('id,qr_code,plaque,numero_chassis,type_engin,marque,modele').ilike('plaque','%'+q+'%').limit(10),
      supabase.from('engins').select('id,qr_code,plaque,numero_chassis,type_engin,marque,modele').ilike('numero_chassis','%'+q+'%').limit(10)
    ]);
    const map=new Map();[...(p.data||[]),...(c.data||[])].forEach(x=>map.set(x.id,x));setResultats([...map.values()]);
  }
  async function ajouterEngin(e){setErreur('');const {data,error}=await supabase.from('accident_engins').insert({accident_id:id,engin_id:e.id,plaque:e.plaque||null,role_dans_accident:'impliqué'}).select('*').single();if(error){setErreur(error.message);return;}setEngins(v=>[...v,data]);setResultats(v=>v.filter(x=>x.id!==e.id));setMessage('Engin ajouté au dossier.');}
  async function ajouterPersonne(e){setErreur('');if(!personne.nom.trim()&&!personne.telephone.trim()){setErreur('Indiquez au moins le nom ou le téléphone.');return;}const payload={accident_id:id,type_personne:personne.type_personne,nom:personne.nom.trim().slice(0,200)||null,telephone:personne.telephone.trim().slice(0,30)||null,blessure:personne.blessure.trim().slice(0,300)||null,evacuee:personne.evacuee,hopital:personne.hopital.trim().slice(0,200)||null};const {data,error}=await supabase.from('accident_personnes').insert(payload).select('*').single();if(error){setErreur(error.message);return;}setPersonnes(v=>[...v,data]);setPersonne({type_personne:'conducteur',nom:'',telephone:'',blessure:'',evacuee:false,hopital:''});setMessage('Personne ajoutée au dossier.');}
  async function ajouterPhoto(file){\n    if(!file)return; setErreur('');\n    if(file.size>5*1024*1024){setErreur('La photo ne doit pas dépasser 5 Mo.');return;}\n    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setErreur('Format accepté : JPG, PNG ou WebP.');return;}\n    setUploading(true);\n    const path=id+'/'+crypto.randomUUID()+'.'+(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg');\n    const {error:up}=await supabase.storage.from('accidents').upload(path,file,{contentType:file.type,upsert:false});\n    if(up){setUploading(false);setErreur(up.message||'Échec du téléversement.');return;}\n    const current=Array.isArray(accident.photo_urls)?accident.photo_urls:[];\n    const next=[...current,path];\n    const {error:db}=await supabase.from('accidents').update({photo_urls:next}).eq('id',id);\n    if(db){await supabase.storage.from('accidents').remove([path]);setUploading(false);setErreur(db.message||'Impossible d’enregistrer la photo.');return;}\n    const {data:signed}=await supabase.storage.from('accidents').createSignedUrl(path,300);\n    setAccident(v=>({...v,photo_urls:next})); if(signed?.signedUrl)setPhotos(v=>[...v,{path,url:signed.signedUrl}]);\n    setUploading(false);setMessage('Photo ajoutée au dossier.');\n  }\n\n  if(chargement)return <div className="shell"><div className="content"><p>Chargement…</p></div></div>;
  if(!accident)return <div className="shell"><div className="content"><div className="erreur">{erreur}</div></div></div>;
  return <div className="shell"><div className="header"><Link href="/agent/historique-accidents" style={{color:'var(--brand)'}}>← Historique</Link><p className="sigle">Dossier accident</p><h1>{accident.numero_dossier}</h1><p style={{color:'var(--ink-soft)'}}>{new Date(accident.date_heure).toLocaleString('fr-FR')} — {accident.lieu}</p></div>
  <div className="content">{erreur&&<div className="erreur">{erreur}</div>}{message&&<div className="resultat-statut actif"><p className="grand-label">{message}</p></div>}
    <div className="liste-item"><strong>{GRAVITES[accident.gravite]||accident.gravite}</strong><div className="meta">{accident.type_accident} · décès {accident.nombre_deces} · blessés graves {accident.nombre_blesses_graves} · blessés légers {accident.nombre_blesses_legers}</div><div className="meta">{accident.description||'Aucune description.'}</div></div>
    <div className="divider"/><h2>Engins impliqués</h2>
    {engins.map(e=><div className="liste-item" key={e.id}><strong>{e.plaque||'Plaque inconnue'}</strong><div className="meta">{e.role_dans_accident||'Impliqué'}</div></div>)}
    <form onSubmit={chercher}><label>Rechercher un engin par plaque ou châssis</label><input value={recherche} onChange={e=>setRecherche(e.target.value.slice(0,80))} placeholder="Plaque ou numéro de châssis"/><button className="btn secondaire" type="submit">Rechercher</button></form>
    {resultats.map(e=><div className="liste-item" key={e.id}><strong>{e.plaque||e.numero_chassis||e.qr_code}</strong><div className="meta">{e.type_engin} · {e.marque||''} {e.modele||''}</div><button className="btn" type="button" onClick={()=>ajouterEngin(e)}>Ajouter au dossier</button></div>)}
    <div className="divider"/><h2>Photos et preuves visuelles</h2>
    <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e=>{ajouterPhoto(e.target.files?.[0]);e.target.value='';}}/>
    <p className="meta">Images privées, 5 Mo maximum. Les liens d’accès expirent après quelques minutes.</p>
    {photos.length>0 && <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>{photos.map(p=><a key={p.path} href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt="Preuve accident" style={{width:'100%',height:140,objectFit:'cover',borderRadius:8}}/></a>)}</div>}
    <div className="divider"/><h2>Personnes impliquées</h2>
    {personnes.map(p=><div className="liste-item" key={p.id}><strong>{p.type_personne}</strong><div className="meta">{p.nom||'Identité non renseignée'} · {p.telephone||'Téléphone non renseigné'}</div><div className="meta">{p.blessure||'Blessure non renseignée'}{p.evacuee?' · évacuée':''}{p.hopital?' · '+p.hopital:''}</div></div>)}
    <form onSubmit={ajouterPersonne}><label>Type</label><select value={personne.type_personne} onChange={e=>setPersonne({...personne,type_personne:e.target.value})}>{['conducteur','passager','piéton','victime','témoin','autre'].map(x=><option key={x}>{x}</option>)}</select><label>Nom</label><input value={personne.nom} maxLength={200} onChange={e=>setPersonne({...personne,nom:e.target.value})}/><label>Téléphone</label><input value={personne.telephone} maxLength={30} onChange={e=>setPersonne({...personne,telephone:e.target.value})}/><label>Blessure</label><input value={personne.blessure} maxLength={300} onChange={e=>setPersonne({...personne,blessure:e.target.value})}/><label>Hôpital</label><input value={personne.hopital} maxLength={200} onChange={e=>setPersonne({...personne,hopital:e.target.value})}/><label style={{display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" checked={personne.evacuee} onChange={e=>setPersonne({...personne,evacuee:e.target.checked})}/> Évacuée</label><button className="btn" type="submit">Ajouter la personne</button></form>
  </div></div>;
}
