'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const TYPES=['vitesse','absence_permis','permis_expire','assurance','defaut_equipement','plaque','telephone_au_volant','alcool','autre'];

export default function Infractions(){
 const router=useRouter(); const [ok,setOk]=useState(null); const [saving,setSaving]=useState(false); const [erreur,setErreur]=useState('');
 const [conducteurs,setConducteurs]=useState([]); const [engins,setEngins]=useState([]); const [form,setForm]=useState({numero_pv:'',conducteur_id:'',engin_id:'',type_infraction:'vitesse',lieu:'',description:'',montant:'',points_retires:'0'});
 useEffect(()=>{(async()=>{const {data}=await supabase.auth.getSession();if(!data.session)return router.push('/agent/login');const {data:a}=await supabase.from('agents').select('id,role,actif').eq('user_id',data.session.user.id).maybeSingle();if(!a?.actif||!['agent','responsable','responsable_regional','admin'].includes(a.role))return router.push('/agent/login');setOk(true);const [c,e]=await Promise.all([supabase.from('conducteurs').select('id,nom,prenom,numero_cni').order('nom').limit(200),supabase.from('engins').select('id,plaque,marque,modele').order('created_at',{ascending:false}).limit(200)]);setConducteurs(c.data||[]);setEngins(e.data||[]);})();},[router]);
 async function enregistrer(e){e.preventDefault();setErreur('');if(!form.numero_pv.trim()||!form.type_infraction)return setErreur('Le numéro de PV et le type d’infraction sont obligatoires.');setSaving(true);const {error}=await supabase.from('infractions').insert({numero_pv:form.numero_pv.trim().slice(0,60),conducteur_id:form.conducteur_id||null,engin_id:form.engin_id||null,type_infraction:form.type_infraction,lieu:form.lieu.trim().slice(0,200)||null,description:form.description.trim().slice(0,2000)||null,montant:form.montant?Number(form.montant):null,points_retires:Math.max(0,Math.min(100,Number(form.points_retires)||0)),statut:'constatee'});setSaving(false);if(error)return setErreur(error.code==='23505'?'Ce numéro de PV existe déjà.':'Impossible d’enregistrer le PV.');setForm({numero_pv:'',conducteur_id:'',engin_id:'',type_infraction:'vitesse',lieu:'',description:'',montant:'',points_retires:'0'});alert('PV enregistré avec succès.');}
 if(ok===null)return <div className="shell"><div className="content"><p>Chargement…</p></div></div>;
 return <div className="shell" style={{maxWidth:820}}><div className="header"><button onClick={()=>router.back()} className="btn secondaire" style={{width:'auto',marginBottom:12}}>← Retour</button><p className="sigle">Contrôle routier</p><h1>Infractions & procès-verbaux</h1><p style={{color:'var(--ink-soft)'}}>Associer l’infraction au conducteur, au permis et à l’engin concernés.</p></div><div className="content">{erreur&&<div className="erreur">{erreur}</div>}<form onSubmit={enregistrer}>
 <div className="field"><label>Numéro du PV *</label><input required value={form.numero_pv} maxLength="60" onChange={e=>setForm({...form,numero_pv:e.target.value})}/></div>
 <div className="field"><label>Conducteur</label><select value={form.conducteur_id} onChange={e=>setForm({...form,conducteur_id:e.target.value})}><option value="">Non renseigné</option>{conducteurs.map(c=><option key={c.id} value={c.id}>{c.nom} {c.prenom||''} — {c.numero_cni||'CNI —'}</option>)}</select></div>
 <div className="field"><label>Engin</label><select value={form.engin_id} onChange={e=>setForm({...form,engin_id:e.target.value})}><option value="">Non renseigné</option>{engins.map(e=><option key={e.id} value={e.id}>{e.plaque||'Sans plaque'} — {e.marque||''} {e.modele||''}</option>)}</select></div>
 <div className="field"><label>Type d’infraction *</label><select value={form.type_infraction} onChange={e=>setForm({...form,type_infraction:e.target.value})}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
 <div className="field"><label>Lieu</label><input maxLength="200" value={form.lieu} onChange={e=>setForm({...form,lieu:e.target.value})}/></div>
 <div className="field"><label>Description</label><textarea maxLength="2000" rows="4" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
 <div className="field"><label>Montant de l’amende</label><input type="number" min="0" step="0.01" value={form.montant} onChange={e=>setForm({...form,montant:e.target.value})}/></div>
 <div className="field"><label>Points retirés</label><input type="number" min="0" max="100" value={form.points_retires} onChange={e=>setForm({...form,points_retires:e.target.value})}/></div>
 <button className="btn" disabled={saving}>{saving?'Enregistrement…':'Enregistrer le procès-verbal'}</button>
 </form></div></div>;
}