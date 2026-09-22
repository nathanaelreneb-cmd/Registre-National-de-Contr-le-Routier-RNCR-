'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const TYPES=['vitesse','absence_permis','permis_expire','assurance','defaut_equipement','plaque','telephone_au_volant','alcool','autre'];
const MAX_FILE=5*1024*1024;
const MIME=['image/jpeg','image/png','image/webp','application/pdf'];

export default function Infractions(){
 const router=useRouter();
 const [ok,setOk]=useState(null); const [saving,setSaving]=useState(false); const [erreur,setErreur]=useState('');
 const [conducteurs,setConducteurs]=useState([]); const [engins,setEngins]=useState([]); const [agentId,setAgentId]=useState(null);
 const [historique,setHistorique]=useState([]); const [recherche,setRecherche]=useState(''); const [loadingHistory,setLoadingHistory]=useState(false);
 const [form,setForm]=useState({numero_pv:'',conducteur_id:'',engin_id:'',type_infraction:'vitesse',lieu:'',description:'',montant:'',points_retires:'0'});
 const [preuve,setPreuve]=useState(null);

 useEffect(()=>{(async()=>{const {data}=await supabase.auth.getSession();if(!data.session)return router.push('/agent/login');const {data:a}=await supabase.from('agents').select('id,role,actif').eq('user_id',data.session.user.id).maybeSingle();if(!a?.actif||!['agent','responsable','responsable_regional','admin'].includes(a.role))return router.push('/agent/login');setAgentId(a.id);setOk(true);const [c,e]=await Promise.all([supabase.from('conducteurs').select('id,nom,prenom,numero_cni').order('nom').limit(200),supabase.from('engins').select('id,plaque,marque,modele').order('created_at',{ascending:false}).limit(200)]);setConducteurs(c.data||[]);setEngins(e.data||[]);chargerHistorique();})();},[router]);

 async function chargerHistorique(term=recherche){setLoadingHistory(true);let q=supabase.from('infractions').select('id,numero_pv,date_heure,lieu,type_infraction,montant,statut,points_retires,preuve_urls,conducteur_id,engin_id').order('date_heure',{ascending:false}).limit(100);if(term.trim())q=q.or('numero_pv.ilike.%'+term.trim().replace(/[%_,]/g,'')+'%,lieu.ilike.%'+term.trim().replace(/[%_,]/g,'')+'%,type_infraction.ilike.%'+term.trim().replace(/[%_,]/g,'')+'%');const {data}=await q;setHistorique(data||[]);setLoadingHistory(false);}
 async function ajouterPreuve(infractionId,file){if(!file)return;if(file.size>MAX_FILE||!MIME.includes(file.type)){setErreur('Preuve refusée : JPEG, PNG, WebP ou PDF, 5 Mo maximum.');return false;}const ext=file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'');const path=`infractions/${infractionId}/${crypto.randomUUID()}.${ext}`;const {error:u}=await supabase.storage.from('infractions').upload(path,file,{contentType:file.type,upsert:false});if(u){setErreur('Téléversement de la preuve impossible.');return false;}const {data:row}=await supabase.from('infractions').select('preuve_urls').eq('id',infractionId).single();const urls=Array.isArray(row?.preuve_urls)?row.preuve_urls:[];const {error:db}=await supabase.from('infractions').update({preuve_urls:[...urls,path],updated_at:new Date().toISOString()}).eq('id',infractionId);if(db){await supabase.storage.from('infractions').remove([path]);setErreur('La preuve n’a pas pu être associée au PV.');return false;}return true;}
 async function ouvrirPreuve(path){const {data,error}=await supabase.storage.from('infractions').createSignedUrl(path,300);if(error)return setErreur('Impossible d’ouvrir la preuve.');window.open(data.signedUrl,'_blank','noopener,noreferrer');}
 async function enregistrer(e){e.preventDefault();setErreur('');if(!form.numero_pv.trim()||!form.type_infraction)return setErreur('Le numéro de PV et le type d’infraction sont obligatoires.');if(preuve&&(preuve.size>MAX_FILE||!MIME.includes(preuve.type)))return setErreur('Preuve refusée : JPEG, PNG, WebP ou PDF, 5 Mo maximum.');setSaving(true);const {data:created,error}=await supabase.from('infractions').insert({numero_pv:form.numero_pv.trim().slice(0,60),conducteur_id:form.conducteur_id||null,engin_id:form.engin_id||null,agent_id:agentId,date_heure:new Date().toISOString(),type_infraction:form.type_infraction,lieu:form.lieu.trim().slice(0,200)||null,description:form.description.trim().slice(0,2000)||null,montant:form.montant?Number(form.montant):null,points_retires:Math.max(0,Math.min(100,Number(form.points_retires)||0)),statut:'constatee'}).select('id').single();if(error){setSaving(false);return setErreur(error.code==='23505'?'Ce numéro de PV existe déjà.':'Impossible d’enregistrer le PV.');}if(preuve){const good=await ajouterPreuve(created.id,preuve);if(!good){setSaving(false);return;}}setSaving(false);setPreuve(null);setForm({numero_pv:'',conducteur_id:'',engin_id:'',type_infraction:'vitesse',lieu:'',description:'',montant:'',points_retires:'0'});await chargerHistorique();alert('PV enregistré avec succès.');}
 function nomConducteur(id){const c=conducteurs.find(x=>x.id===id);return c?c.nom+' '+(c.prenom||''):''}
 function nomEngin(id){const e=engins.find(x=>x.id===id);return e?(e.plaque||'Sans plaque')+' — '+(e.marque||'')+' '+(e.modele||''):''}
 if(ok===null)return <div className="shell"><div className="content"><p>Chargement…</p></div></div>;
 return <div className="shell" style={{maxWidth:920}}><div className="header"><button onClick={()=>router.back()} className="btn secondaire" style={{width:'auto',marginBottom:12}}>← Retour</button><p className="sigle">Contrôle routier</p><h1>Infractions & procès-verbaux</h1><p style={{color:'var(--ink-soft)'}}>Associer chaque PV au conducteur, à l’engin et aux preuves utiles.</p></div><div className="content">{erreur&&<div className="erreur">{erreur}</div>}<form onSubmit={enregistrer}>
 <div className="field"><label>Numéro du PV *</label><input required value={form.numero_pv} maxLength="60" onChange={e=>setForm({...form,numero_pv:e.target.value})}/></div>
 <div className="field"><label>Conducteur</label><select value={form.conducteur_id} onChange={e=>setForm({...form,conducteur_id:e.target.value})}><option value="">Non renseigné</option>{conducteurs.map(c=><option key={c.id} value={c.id}>{c.nom} {c.prenom||''} — {c.numero_cni||'CNI —'}</option>)}</select></div>
 <div className="field"><label>Engin</label><select value={form.engin_id} onChange={e=>setForm({...form,engin_id:e.target.value})}><option value="">Non renseigné</option>{engins.map(e=><option key={e.id} value={e.id}>{e.plaque||'Sans plaque'} — {e.marque||''} {e.modele||''}</option>)}</select></div>
 <div className="field"><label>Type d’infraction *</label><select value={form.type_infraction} onChange={e=>setForm({...form,type_infraction:e.target.value})}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
 <div className="field"><label>Lieu</label><input maxLength="200" value={form.lieu} onChange={e=>setForm({...form,lieu:e.target.value})}/></div>
 <div className="field"><label>Description</label><textarea maxLength="2000" rows="4" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
 <div className="field"><label>Montant de l’amende</label><input type="number" min="0" step="0.01" value={form.montant} onChange={e=>setForm({...form,montant:e.target.value})}/></div>
 <div className="field"><label>Points retirés</label><input type="number" min="0" max="100" value={form.points_retires} onChange={e=>setForm({...form,points_retires:e.target.value})}/></div>
 <div className="field"><label>Preuve (photo ou PDF, 5 Mo max.)</label><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>setPreuve(e.target.files?.[0]||null)}/></div>
 <button className="btn" disabled={saving}>{saving?'Enregistrement…':'Enregistrer le procès-verbal'}</button>
 </form>
 <hr style={{margin:'32px 0'}}/><h2>Historique des procès-verbaux</h2>
 <div style={{display:'flex',gap:8,marginBottom:16}}><input placeholder="Rechercher PV, lieu ou type…" value={recherche} onChange={e=>setRecherche(e.target.value.slice(0,100))}/><button type="button" className="btn secondaire" onClick={()=>chargerHistorique()}>Rechercher</button></div>
 {loadingHistory?<p>Chargement de l’historique…</p>:historique.length===0?<p>Aucun procès-verbal trouvé.</p>:<div style={{display:'grid',gap:12}}>{historique.map(i=><div key={i.id} style={{padding:14,border:'1px solid var(--border)',borderRadius:12}}>
 <strong>{i.numero_pv}</strong> — {i.type_infraction}<div style={{color:'var(--ink-soft)',fontSize:14}}>{i.lieu||'Lieu non renseigné'} · {new Date(i.date_heure).toLocaleString('fr-FR')}</div>
 <div style={{fontSize:14,marginTop:5}}>Conducteur : {nomConducteur(i.conducteur_id)||'—'} · Engin : {nomEngin(i.engin_id)||'—'}</div>
 <div style={{marginTop:8}}>Statut : {i.statut} · Points : {i.points_retires||0} · Preuves : {Array.isArray(i.preuve_urls)?i.preuve_urls.length:0}</div>
 {Array.isArray(i.preuve_urls)&&i.preuve_urls.map((p,n)=><button type="button" key={p} className="btn secondaire" style={{width:'auto',margin:'8px 8px 0 0'}} onClick={()=>ouvrirPreuve(p)}>Ouvrir preuve {n+1}</button>)}
 </div>)}</div>}
 </div></div>;
}