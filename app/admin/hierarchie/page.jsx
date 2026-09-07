'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const LIBELLES_ROLE = {
  agent: 'Agent de terrain',
  responsable: 'Responsable de poste',
  responsable_regional: 'Responsable régional',
  admin: 'Administrateur national',
};

export default function Hierarchie() {
  const router = useRouter();
  const [autorise, setAutorise] = useState(null);
  const [corps, setCorps] = useState([]);
  const [regions, setRegions] = useState([]);
  const [postes, setPostes] = useState([]);
  const [agents, setAgents] = useState([]);

  const [nomCorps, setNomCorps] = useState('');
  const [nomRegion, setNomRegion] = useState('');
  const [corpsRegion, setCorpsRegion] = useState('');
  const [nomPoste, setNomPoste] = useState('');
  const [regionPoste, setRegionPoste] = useState('');
  const [villePoste, setVillePoste] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.push('/admin/login');
        return;
      }
      const { data: agent } = await supabase
        .from('agents')
        .select('role')
        .eq('user_id', data.session.user.id)
        .single();

      if (!agent || agent.role !== 'admin') {
        router.push('/admin/login');
        return;
      }
      setAutorise(true);
      chargerTout();
    });
  }, []);

  async function chargerTout() {
    const { data: c } = await supabase.from('corps').select('*').order('nom');
    const { data: r } = await supabase.from('regions').select('*').order('nom');
    const { data: p } = await supabase.from('postes').select('*').order('nom');
    const { data: a } = await supabase.from('agents').select('id, nom, role, poste_id, region_id').order('nom');
    setCorps(c || []);
    setRegions(r || []);
    setPostes(p || []);
    setAgents(a || []);
  }

  async function ajouterCorps(e) {
    e.preventDefault();
    if (!nomCorps.trim()) return;
    await supabase.from('corps').insert({ nom: nomCorps.trim() });
    setNomCorps('');
    chargerTout();
  }

  async function ajouterRegion(e) {
    e.preventDefault();
    if (!nomRegion.trim() || !corpsRegion) return;
    await supabase.from('regions').insert({ nom: nomRegion.trim(), corps_id: corpsRegion });
    setNomRegion('');
    chargerTout();
  }

  async function ajouterPoste(e) {
    e.preventDefault();
    if (!nomPoste.trim() || !regionPoste) return;
    await supabase.from('postes').insert({ nom: nomPoste.trim(), region_id: regionPoste, ville: villePoste || null });
    setNomPoste('');
    setVillePoste('');
    chargerTout();
  }

  async function assignerAgent(agentId, champ, valeur) {
    await supabase.from('agents').update({ [champ]: valeur || null }).eq('id', agentId);
    chargerTout();
  }

  if (autorise === null) {
    return (
      <div className="shell">
        <div className="content"><p>Chargement…</p></div>
      </div>
    );
  }

  return (
    <div className="shell" style={{ maxWidth: 720 }}>
      <div className="header">
        <p className="sigle">Portail Administration</p>
        <h1>Hiérarchie & comptes</h1>
      </div>
      <div className="content">
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>Corps</p>
        <form onSubmit={ajouterCorps} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input value={nomCorps} onChange={(e) => setNomCorps(e.target.value)} placeholder="Ex : Police nationale" style={{ flex: 1, padding: 10, border: '1px solid var(--line)', borderRadius: 4 }} />
          <button type="submit" className="btn" style={{ width: 'auto', padding: '10px 16px' }}>Ajouter</button>
        </form>
        {corps.map((c) => (
          <div key={c.id} className="liste-item">{c.nom}</div>
        ))}

        <div className="divider" />

        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>Régions</p>
        <form onSubmit={ajouterRegion} style={{ marginBottom: 16 }}>
          <div className="field">
            <select value={corpsRegion} onChange={(e) => setCorpsRegion(e.target.value)}>
              <option value="">Choisir un corps</option>
              {corps.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={nomRegion} onChange={(e) => setNomRegion(e.target.value)} placeholder="Ex : Région de Conakry" style={{ flex: 1, padding: 10, border: '1px solid var(--line)', borderRadius: 4 }} />
            <button type="submit" className="btn" style={{ width: 'auto', padding: '10px 16px' }}>Ajouter</button>
          </div>
        </form>
        {regions.map((r) => (
          <div key={r.id} className="liste-item">
            {r.nom}
            <div className="meta">{corps.find((c) => c.id === r.corps_id)?.nom || '—'}</div>
          </div>
        ))}

        <div className="divider" />

        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>Postes</p>
        <form onSubmit={ajouterPoste} style={{ marginBottom: 16 }}>
          <div className="field">
            <select value={regionPoste} onChange={(e) => setRegionPoste(e.target.value)}>
              <option value="">Choisir une région</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
            </select>
          </div>
          <div className="field">
            <input value={nomPoste} onChange={(e) => setNomPoste(e.target.value)} placeholder="Ex : Poste de Kaloum" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={villePoste} onChange={(e) => setVillePoste(e.target.value)} placeholder="Ville (optionnel)" style={{ flex: 1, padding: 10, border: '1px solid var(--line)', borderRadius: 4 }} />
            <button type="submit" className="btn" style={{ width: 'auto', padding: '10px 16px' }}>Ajouter</button>
          </div>
        </form>
        {postes.map((p) => (
          <div key={p.id} className="liste-item">
            {p.nom}
            <div className="meta">{regions.find((r) => r.id === p.region_id)?.nom || 'Sans région'}</div>
          </div>
        ))}

        <div className="divider" />

        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>Agents — rattachement et rôle</p>
        {agents.map((a) => (
          <div key={a.id} className="liste-item">
            <span className="plaque" style={{ fontSize: 14 }}>{a.nom}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <select value={a.role} onChange={(e) => assignerAgent(a.id, 'role', e.target.value)}>
                {Object.entries(LIBELLES_ROLE).map(([valeur, libelle]) => (
                  <option key={valeur} value={valeur}>{libelle}</option>
                ))}
              </select>

              {a.role === 'responsable_regional' ? (
                <select value={a.region_id || ''} onChange={(e) => assignerAgent(a.id, 'region_id', e.target.value)}>
                  <option value="">Aucune région assignée</option>
                  {regions.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </select>
              ) : a.role !== 'admin' ? (
                <select value={a.poste_id || ''} onChange={(e) => assignerAgent(a.id, 'poste_id', e.target.value)}>
                  <option value="">Aucun poste assigné</option>
                  {postes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </select>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
