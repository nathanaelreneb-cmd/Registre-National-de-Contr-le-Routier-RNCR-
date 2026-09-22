'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

const STATUTS={enregistre:'Enregistrée',en_cours:'Enquête en cours',rapport:'Rapport à finaliser',cloturee:'Clôturée'};

export default function AdminAccidentDetail(){
  const {id}=useParams(); const router=useRouter();
  const [accident,setAccident]=useState(null),[agents,setAgents]=useState([]),[responsable,setResponsable]=useState(''),[statut,setStatut]=useState('enregistre'),[notes,setNotes]=useState(''),[rapport,setRapport]=useState(''),[chargement,setChargement]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[erreur,setErreur]=useState('');

  useEffect(()=>{(async()=>{
    const {data:s}=await supabase.auth.getSession(); if(!s.session){router.push('/admin/login');return;}
    const {data:a}=await supabase.from('agents').select('role,actif').eq('user_id',s.session.user.id).maybeSingle();
    if(!a||a.role!=='admin'||!a.actif){router.push('/admin/login');return;}
    const [ac,ag]=await Promise.all([
      supabase.from('accidents').select('*').eq('id',id).maybeSingle(),
      supabase.from('agents').select('id,nom,role,badge_id').eq('actif',true).order('nom')
    ]);
    if(!ac.data){setErreur('Dossier introuvable.');setChargement(false);return;}
    setAccident(ac.data); setAgents(ag.data||[]); setResponsable(ac.data.enquete_responsable_id||''); setStatut(ac.data.statut_enquete||'enregistre'); setNotes(ac.data.enquete_notes||''); setRapport(ac.data.rapport_police||''); setChargement(false);
  })()},[id,router]);

  async function enregistrer(){
    setSaving(true);setErreur('');setMessage('');
    const cloturee=statut==='cloturee' ? (accident.enquete_cloturee_at||new Date().toISOString()) : null;
    const {data,error}=await supabase.from('accidents').update({
      enquete_responsable_id: responsable||null,
      statut_enquete: statut,
      enquete_notes: notes.trim().slice(0,5000)||null,
      rapport_police: rapport.trim().slice(0,10000)||null,
      enquete_cloturee_at: cloturee,
      updated_at:new Date().toISOString()
    }).eq('id',id).select('*').single();
    if(error){setErreur(error.message);setSaving(false);return;}
    setAccident(data);setMessage('Suivi de l’enquête enregistré.');setSaving(false);
  }

  if(chargement)return <div className="shell"><div className="content"><p>Chargement…</p></div></div>;
  if(!accident)return <div className="shell"><div className="content"><div className="erreur">{erreur}</div></div></div>;

  return <div className="shell" style={{maxWidth:900}}>
    <div className="header"><Link href="/admin/accidents" style={{color:'var(--brand)'}}>← Accidents</Link><p className="sigle">Dossier d'enquête</p><h1>{accident.numero_dossier||'Dossier accident'}</h1><p style={{color:'var(--ink-soft)'}}>{new Date(accident.date_heure).toLocaleString('fr-FR')} — {accident.lieu}</p></div>
    <div className="content">
      {erreur&&<div className="erreur">{erreur}</div>}{message&&<div className="resultat-statut actif"><p className="grand-label">{message}</p></div>}
      <div className="liste-item"><strong>Résumé de l’accident</strong><div className="meta">{accident.type_accident} · gravité {accident.gravite}</div><div className="meta">Décès {accident.nombre_deces} · blessés graves {accident.nombre_blesses_graves} · blessés légers {accident.nombre_blesses_legers}</div><div className="meta">{accident.lieu}</div></div>
      <div className="divider"/><h2>Suivi de l’enquête</h2>
      <label>Responsable de l’enquête</label>
      <select value={responsable} onChange={e=>setResponsable(e.target.value)}>
        <option value="">— Non attribué —</option>
        {agents.map(a=><option key={a.id} value={a.id}>{a.nom||'Agent'} · {a.role}{a.badge_id?' · '+a.badge_id:''}</option>)}
      </select>
      <label>Statut</label>
      <select value={statut} onChange={e=>setStatut(e.target.value)}>{Object.entries(STATUTS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
      <label>Notes d’enquête</label>
      <textarea rows={7} maxLength={5000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Constats, vérifications, éléments à approfondir…"/>
      <label>Rapport / référence police</label>
      <textarea rows={8} maxLength={10000} value={rapport} onChange={e=>setRapport(e.target.value)} placeholder="Rapport, référence ou synthèse de clôture…"/>
      {accident.enquete_cloturee_at&&<p className="meta">Clôturée le {new Date(accident.enquete_cloturee_at).toLocaleString('fr-FR')}</p>}
      <button className="btn" disabled={saving} onClick={enregistrer}>{saving?'Enregistrement…':'Enregistrer le suivi'}</button>
      <div className="divider"/><Link href={'/agent/accidents/'+id} className="btn secondaire">Voir le dossier opérationnel</Link>
    </div>
  </div>;
}
