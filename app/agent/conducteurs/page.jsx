'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

export default function Conducteurs() {
  const router = useRouter();
  const [autorise, setAutorise] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [form, setForm] = useState({ nom: '', prenom: '', numero_cni: '', telephone: '' });
  const [enregistrement, setEnregistrement] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.push('/agent/login');
      const { data: agent } = await supabase.from('agents').select('role, actif').eq('user_id', data.session.user.id).maybeSingle();
      if (!agent?.actif || !['agent','responsable','responsable_regional','admin'].includes(agent.role)) return router.push('/agent/login');
      setAutorise(true);
    })();
  }, [router]);

  async function rechercher(e) {
    e?.preventDefault();
    const terme = recherche.trim().slice(0, 80);
    if (!terme) return;
    setChargement(true); setErreur('');
    const [nom, cni, tel] = await Promise.all([
      supabase.from('conducteurs').select('id, nom, prenom, numero_cni, telephone, statut').ilike('nom', `%${terme}%`).limit(30),
      supabase.from('conducteurs').select('id, nom, prenom, numero_cni, telephone, statut').ilike('numero_cni', `%${terme}%`).limit(30),
      supabase.from('conducteurs').select('id, nom, prenom, numero_cni, telephone, statut').ilike('telephone', `%${terme}%`).limit(30),
    ]);
    if ([nom,cni,tel].some(r => r.error)) { setErreur('La recherche n’a pas pu être effectuée.'); setResultats([]); }
    else {
      const m = new Map();
      [nom.data,cni.data,tel.data].flat().forEach(x => m.set(x.id,x));
      setResultats([...m.values()]);
    }
    setChargement(false);
  }

  async function creer(e) {
    e.preventDefault(); setErreur('');
    const nom = form.nom.trim().slice(0,100), prenom=form.prenom.trim().slice(0,100);
    if (!nom) return setErreur('Le nom du conducteur est obligatoire.');
    setEnregistrement(true);
    const { data, error } = await supabase.from('conducteurs').insert({
      nom, prenom: prenom || null,
      numero_cni: form.numero_cni.trim().slice(0,80) || null,
      telephone: form.telephone.trim().slice(0,30) || null,
    }).select('id').single();
    setEnregistrement(false);
    if (error) return setErreur('Impossible de créer le dossier conducteur.');
    router.push(`/agent/conducteurs/${data.id}`);
  }

  if (autorise === null) return <div className="shell"><div className="content"><p>Chargement…</p></div></div>;

  return <div className="shell" style={{maxWidth:760}}>
    <div className="header">
      <button onClick={() => window.history.back()} className="btn secondaire" style={{width:'auto',marginBottom:12}}>← Retour</button>
      <p className="sigle">Registre national</p>
      <h1>Dossier conducteur</h1>
      <p style={{color:'var(--ink-soft)'}}>Identité, permis, véhicules associés et situation du conducteur.</p>
    </div>
    <div className="content">
      {erreur && <div className="erreur">{erreur}</div>}
      <form onSubmit={rechercher}>
        <div className="field"><label htmlFor="recherche">Rechercher un conducteur</label><input id="recherche" value={recherche} onChange={e=>setRecherche(e.target.value.slice(0,80))} placeholder="Nom, CNI ou téléphone" /></div>
        <button className="btn" disabled={chargement || !recherche.trim()}>{chargement ? 'Recherche…':'Rechercher'}</button>
      </form>
      <div className="divider" />
      {resultats.map(c => <Link key={c.id} href={`/agent/conducteurs/${c.id}`} className="liste-item" style={{display:'block'}}>
        <strong>{c.nom} {c.prenom || ''}</strong> <span className={`badge ${c.statut || 'actif'}`}>{c.statut || 'actif'}</span>
        <div className="meta">{c.numero_cni || 'CNI non renseignée'} • {c.telephone || 'Téléphone non renseigné'}</div>
      </Link>)}
      <div className="divider" />
      <h2>Nouveau dossier</h2>
      <form onSubmit={creer}>
        <div className="field"><label htmlFor="nom">Nom *</label><input id="nom" required value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})}/></div>
        <div className="field"><label htmlFor="prenom">Prénom</label><input id="prenom" value={form.prenom} onChange={e=>setForm({...form,prenom:e.target.value})}/></div>
        <div className="field"><label htmlFor="cni">Numéro CNI</label><input id="cni" value={form.numero_cni} onChange={e=>setForm({...form,numero_cni:e.target.value})}/></div>
        <div className="field"><label htmlFor="telephone">Téléphone</label><input id="telephone" value={form.telephone} onChange={e=>setForm({...form,telephone:e.target.value})}/></div>
        <button className="btn" disabled={enregistrement}>{enregistrement ? 'Création…':'Créer le dossier conducteur'}</button>
      </form>
    </div>
  </div>;
}