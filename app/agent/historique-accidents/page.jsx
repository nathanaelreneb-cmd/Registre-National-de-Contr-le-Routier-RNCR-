'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

const GRAVITES = { materiel:'Dégâts matériels', blessures:'Blessures', grave:'Blessures graves', mortel:'Décès' };

export default function HistoriqueAccidents() {
  const router=useRouter();
  const [accidents,setAccidents]=useState([]);
  const [chargement,setChargement]=useState(true);

  useEffect(()=>{
    supabase.auth.getSession().then(async ({data})=>{
      if(!data.session){router.push('/agent/login');return;}
      const {data:a}=await supabase.from('agents').select('id, actif').eq('user_id',data.session.user.id).maybeSingle();
      if(!a?.actif){await supabase.auth.signOut();router.push('/agent/login');return;}
      const {data:rows}=await supabase.from('accidents')
        .select('id,numero_dossier,date_heure,lieu,type_accident,gravite,nombre_deces,nombre_blesses_graves,nombre_blesses_legers,created_at')
        .eq('created_by_agent_id',a.id).order('date_heure',{ascending:false}).limit(50);
      setAccidents(rows||[]); setChargement(false);
    });
  },[router]);

  function date(v){return new Date(v).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}
  return <div className="shell"><div className="header">
    <button onClick={()=>window.history.back()} style={{background:'none',border:'none',color:'var(--brand)',fontSize:14,padding:0,marginBottom:10,cursor:'pointer'}}>← Retour</button>
    <p className="sigle">Espace agent</p><h1>Mes accidents enregistrés</h1>
  </div><div className="content">
    <Link href="/agent/accidents" className="btn">+ Enregistrer un accident</Link>
    {chargement && <p style={{color:'var(--ink-soft)'}}>Chargement…</p>}
    {!chargement && accidents.length===0 && <p style={{color:'var(--ink-soft)'}}>Aucun accident enregistré.</p>}
    {accidents.map(a=><div key={a.id} className="liste-item">
      <span className="plaque">{a.numero_dossier}</span> <span className={`badge ${a.gravite}`}>{GRAVITES[a.gravite]||a.gravite}</span>
      <div className="meta">{date(a.date_heure)} — {a.lieu}</div>
      <div className="meta">Décès: {a.nombre_deces} · Blessés graves: {a.nombre_blesses_graves} · Blessés légers: {a.nombre_blesses_legers}</div>
      <Link href={"/agent/accidents/"+a.id} className="btn secondaire" style={{marginTop:8}}>Ouvrir le dossier</Link>
    </div>)}
  </div></div>;
}
