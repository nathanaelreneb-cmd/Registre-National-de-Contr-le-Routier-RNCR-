'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const roles = ['admin','responsable','responsable_regional'];
const actions = ['tous','view','create','update','delete','close','export','verify'];

function d(v){ return v ? new Date(v).toLocaleString('fr-FR') : '—'; }

export default function AuditPage(){
  const router = useRouter();
  const [loading,setLoading] = useState(true);
  const [err,setErr] = useState('');
  const [rows,setRows] = useState([]);
  const [q,setQ] = useState('');
  const [action,setAction] = useState('tous');
  const [type,setType] = useState('tous');
  const [du,setDu] = useState('');
  const [au,setAu] = useState('');

  useEffect(()=>{ (async()=>{
    const {data:{session}} = await supabase.auth.getSession();
    if(!session){ router.push('/agent/login'); return; }
    const {data:agent} = await supabase.from('agents').select('id,nom,role,actif').eq('user_id',session.user.id).maybeSingle();
    if(!agent?.actif || !roles.includes(agent.role)){ router.push('/agent/dashboard'); return; }

    const {data,error} = await supabase
      .from('audit_logs')
      .select('id,actor_user_id,agent_id,action,entity_type,entity_id,description,metadata,created_at,agents(nom,role)')
      .order('created_at',{ascending:false}).limit(500);
    if(error){ setErr('Impossible de charger le journal d’audit.'); setLoading(false); return; }
    setRows(data||[]); setLoading(false);
  })(); },[router]);

  const filtered = useMemo(()=>rows.filter(x=>{
    if(action!=='tous' && x.action!==action) return false;
    if(type!=='tous' && x.entity_type!==type) return false;
    if(q && !(x.description||'').toLowerCase().includes(q.toLowerCase()) && !(x.entity_id||'').toLowerCase().includes(q.toLowerCase()) && !(x.agents?.nom||'').toLowerCase().includes(q.toLowerCase())) return false;
    const dt=new Date(x.created_at);
    if(du && dt<new Date(du+'T00:00:00')) return false;
    if(au && dt>new Date(au+'T23:59:59')) return false;
    return true;
  }),[rows,q,action,type,du,au]);

  if(loading) return <div className="shell"><div className="content"><p>Chargement du journal…</p></div></div>;
  if(err) return <div className="shell"><div className="content"><p>{err}</p></div></div>;

  return <div className="shell" style={{maxWidth:1100}}>
    <div className="header">
      <button onClick={()=>router.back()} className="btn secondaire" style={{width:'auto',marginBottom:12}}>← Retour</button>
      <p className="sigle">Registre national</p>
      <h1>Journal d’audit RNCR</h1>
      <p style={{color:'var(--ink-soft)'}}>Traçabilité des consultations et opérations sensibles.</p>
    </div>
    <div className="content">
      <section>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',gap:8,marginBottom:12}}>
          <input className="input" placeholder="Rechercher agent, description, ID…" value={q} onChange={e=>setQ(e.target.value)}/>
          <select className="input" value={action} onChange={e=>setAction(e.target.value)}>{actions.map(x=><option key={x} value={x}>{x==='tous'?'Toutes les actions':x}</option>)}</select>
          <select className="input" value={type} onChange={e=>setType(e.target.value)}>{['tous','conducteur','engin','pv','accident','signalement','transfert','document','controle'].map(x=><option key={x} value={x}>{x==='tous'?'Toutes les entités':x}</option>)}</select>
          <input type="date" className="input" value={du} onChange={e=>setDu(e.target.value)} aria-label="Date de début"/>
          <input type="date" className="input" value={au} onChange={e=>setAu(e.target.value)} aria-label="Date de fin"/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap',marginBottom:12}}>
          <strong>{filtered.length} trace(s) affichée(s) sur {rows.length}</strong>
          <button onClick={()=>setTimeout(()=>window.print(),50)} className="btn secondaire" style={{width:'auto'}}>🖨️ Imprimer</button>
        </div>
        {filtered.length ? filtered.map(x=><div className="liste-item" key={x.id}>
          <strong>{x.action.toUpperCase()} · {x.entity_type}</strong>
          <span className="meta"> · {d(x.created_at)} · {x.agents?.nom||'Agent inconnu'} · rôle {x.agents?.role||'—'}</span>
          <div className="meta">{x.description||'Aucune description'}{x.entity_id ? ' · ID '+x.entity_id : ''}</div>
        </div>) : <p>Aucune trace pour ces filtres.</p>}
      </section>
    </div>
  </div>;
}
