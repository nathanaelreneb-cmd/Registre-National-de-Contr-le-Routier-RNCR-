'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const STATUTS = {
  enregistre: 'Enregistrée',
  en_cours: 'Enquête en cours',
  rapport: 'Rapport à finaliser',
  cloturee: 'Clôturée',
};

const GRAVITES = { materiel: 'Dégâts matériels', blessures: 'Blessures', grave: 'Blessures graves', mortel: 'Décès' };

export default function AdminAccidents() {
  const router = useRouter();
  const [accidents, setAccidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [filtre, setFiltre] = useState('');
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { router.push('/admin/login'); return; }
      const { data: a } = await supabase.from('agents').select('role,actif').eq('user_id', s.session.user.id).maybeSingle();
      if (!a || a.role !== 'admin' || !a.actif) { router.push('/admin/login'); return; }
      await charger();
    })();
  }, [router]);

  async function charger() {
    setChargement(true);
    const [{ data: rows }, { data: all }] = await Promise.all([
      supabase.from('accidents').select('id,numero_dossier,date_heure,lieu,type_accident,gravite,nombre_deces,nombre_blesses_graves,nombre_blesses_legers,statut_enquete,enquete_responsable_id,enquete_cloturee_at').order('date_heure',{ascending:false}).limit(100),
      supabase.from('accidents').select('gravite,nombre_deces,nombre_blesses_graves,nombre_blesses_legers,statut_enquete')
    ]);
    const list = rows || [];
    setAccidents(list);
    setStats({
      total: (all||[]).length,
      deces: (all||[]).reduce((n,a)=>n+(a.nombre_deces||0),0),
      graves: (all||[]).reduce((n,a)=>n+(a.nombre_blesses_graves||0),0),
      legers: (all||[]).reduce((n,a)=>n+(a.nombre_blesses_legers||0),0),
      ouvertes: (all||[]).filter(a=>a.statut_enquete!=='cloturee').length,
    });
    setChargement(false);
  }

  const visibles = accidents.filter(a => !filtre || a.statut_enquete === filtre);

  if (chargement || !stats) return <div className="shell"><div className="content"><p>Chargement des accidents…</p></div></div>;

  return <div className="shell" style={{maxWidth:1000}}>
    <div className="header">
      <Link href="/admin/dashboard" style={{color:'var(--brand)'}}>← Administration</Link>
      <p className="sigle">Gestion des enquêtes</p>
      <h1>Accidents routiers</h1>
      <p style={{color:'var(--ink-soft)'}}>Suivi des dossiers, responsables, rapports et clôtures.</p>
    </div>
    <div className="content">
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
        <div className="liste-item"><strong>{stats.total}</strong><div className="meta">Dossiers</div></div>
        <div className="liste-item"><strong>{stats.deces}</strong><div className="meta">Décès déclarés</div></div>
        <div className="liste-item"><strong>{stats.graves}</strong><div className="meta">Blessés graves</div></div>
        <div className="liste-item"><strong>{stats.ouverts}</strong><div className="meta">Enquêtes ouvertes</div></div>
      </div>
      <div className="divider"/>
      <label>Filtrer par statut d'enquête</label>
      <select value={filtre} onChange={e=>setFiltre(e.target.value)}>
        <option value="">Tous les dossiers</option>
        {Object.entries(STATUTS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
      {visibles.length===0 ? <div className="liste-item">Aucun dossier pour ce filtre.</div> : visibles.map(a=>
        <Link key={a.id} href={'/admin/accidents/'+a.id} className="liste-item" style={{display:'block',textDecoration:'none'}}>
          <div><strong>{a.numero_dossier || 'Dossier sans numéro'}</strong> <span className={`badge ${a.gravite}`}>{GRAVITES[a.gravite]||a.gravite}</span></div>
          <div className="meta">{new Date(a.date_heure).toLocaleString('fr-FR')} — {a.lieu}</div>
          <div className="meta">Décès {a.nombre_deces} · graves {a.nombre_blesses_graves} · légers {a.nombre_blesses_legers} · {STATUTS[a.statut_enquete]||a.statut_enquete||'Non défini'}</div>
        </Link>
      )}
    </div>
  </div>;
}
