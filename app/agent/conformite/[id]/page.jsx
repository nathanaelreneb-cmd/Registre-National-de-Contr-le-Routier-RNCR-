'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';

const DOCUMENTS = [
  'carte_grise',
  'assurance',
  'visite_technique',
  'autorisation',
  'autre',
];

const labelDoc = {
  carte_grise: 'Carte grise / document d’immatriculation',
  assurance: 'Assurance',
  visite_technique: 'Visite / contrôle technique',
  autorisation: 'Autorisation',
  autre: 'Autre document',
};

function dateFR(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR');
}

function etatExpiration(date) {
  if (!date) return 'Sans échéance';
  const today = new Date();
  const d = new Date(date);
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const jours = Math.ceil((d - today) / 86400000);
  if (jours < 0) return 'Expiré';
  if (jours <= 30) return `Expire dans ${jours} jour(s)`;
  return 'Valide';
}

export default function ConformiteEngin({ params }) {
  const { id } = params;
  const [engin, setEngin] = useState(null);
  const [agent, setAgent] = useState(null);
  const [controles, setControles] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [chargement, setChargement] = useState(true);
  const [televersement, setTeleversement] = useState(false);

  const [controle, setControle] = useState({
    date_controle: new Date().toISOString().slice(0, 10),
    date_expiration: '',
    centre_controle: '',
    reference_controle: '',
    resultat: 'conforme',
    observations: '',
  });

  const [document, setDocument] = useState({
    type_document: 'carte_grise',
    numero_document: '',
    date_delivrance: '',
    date_expiration: '',
    autorite: '',
    statut: 'valide',
    observations: '',
  });

  useEffect(() => {
    async function charger() {
      setChargement(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        window.location.href = '/agent/login';
        return;
      }

      const { data: agentData } = await supabase
        .from('agents')
        .select('id, role, actif')
        .eq('user_id', sessionData.session.user.id)
        .maybeSingle();

      if (!agentData?.actif || !['agent', 'responsable', 'responsable_regional', 'admin'].includes(agentData.role)) {
        window.location.href = '/agent/login';
        return;
      }

      const [enginResult, controlesResult, documentsResult] = await Promise.all([
        supabase.from('engins').select('id, qr_code, plaque, type_engin, marque, modele, assurance_expiration, statut_fiscal').eq('id', id).maybeSingle(),
        supabase.from('controles_techniques').select('id, date_controle, date_expiration, centre_controle, reference_controle, resultat, observations, preuve_url, agent_id, created_at').eq('engin_id', id).order('date_controle', { ascending: false }).limit(50),
        supabase.from('engins_documents').select('id, type_document, numero_document, date_delivrance, date_expiration, autorite, statut, preuve_url, observations, verifie_par, verifie_at, created_at').eq('engin_id', id).order('created_at', { ascending: false }).limit(50),
      ]);

      if (enginResult.error || !enginResult.data) setErreur(enginResult.error?.message || 'Engin introuvable.');
      setEngin(enginResult.data || null);
      setAgent(agentData);
      setControles(controlesResult.data || []);
      setDocuments(documentsResult.data || []);
      setChargement(false);
    }

    charger();
  }, [id]);

  async function ajouterControle(e) {
    e.preventDefault();
    setErreur('');
    setMessage('');

    if (!controle.date_controle) {
      setErreur('La date du contrôle est obligatoire.');
      return;
    }

    const { error } = await supabase.from('controles_techniques').insert({
      engin_id: id,
      date_controle: controle.date_controle,
      date_expiration: controle.date_expiration || null,
      centre_controle: controle.centre_controle.trim().slice(0, 160) || null,
      reference_controle: controle.reference_controle.trim().slice(0, 100) || null,
      resultat: controle.resultat,
      observations: controle.observations.trim().slice(0, 2000) || null,
      agent_id: agent.id,
    });

    if (error) {
      setErreur(error.message);
      return;
    }

    setMessage('Contrôle technique enregistré.');
    setControle({
      date_controle: new Date().toISOString().slice(0, 10),
      date_expiration: '',
      centre_controle: '',
      reference_controle: '',
      resultat: 'conforme',
      observations: '',
    });

    const { data } = await supabase.from('controles_techniques').select('id, date_controle, date_expiration, centre_controle, reference_controle, resultat, observations, preuve_url, agent_id, created_at').eq('engin_id', id).order('date_controle', { ascending: false }).limit(50);
    setControles(data || []);
  }

  async function ajouterPreuve(documentId, file) {
    if (!file) return;
    setErreur('');
    setMessage('');
    const types = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!types.includes(file.type)) { setErreur('Format refusé. Utilisez JPG, PNG, WebP ou PDF.'); return; }
    if (file.size > 5 * 1024 * 1024) { setErreur('Le fichier ne doit pas dépasser 5 Mo.'); return; }
    setTeleversement(true);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const path = `${id}/${documentId}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('engins-conformite').upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) { setErreur(uploadError.message); setTeleversement(false); return; }
    const { error: dbError } = await supabase.from('engins_documents').update({ preuve_url: path, updated_at: new Date().toISOString() }).eq('id', documentId);
    if (dbError) { await supabase.storage.from('engins-conformite').remove([path]); setErreur(dbError.message); setTeleversement(false); return; }
    setDocuments((prev) => prev.map((d) => d.id === documentId ? { ...d, preuve_url: path } : d));
    setMessage('Preuve enregistrée de façon sécurisée.');
    setTeleversement(false);
  }

  async function ouvrirPreuve(path) {
    const { data, error } = await supabase.storage.from('engins-conformite').createSignedUrl(path, 300);
    if (error) { setErreur(error.message); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function ajouterPreuveControle(controleId, file) {
    if (!file) return;
    setErreur('');
    setMessage('');
    const types = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!types.includes(file.type)) { setErreur('Format refusé. Utilisez JPG, PNG, WebP ou PDF.'); return; }
    if (file.size > 5 * 1024 * 1024) { setErreur('Le fichier ne doit pas dépasser 5 Mo.'); return; }
    setTeleversement(true);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const path = `${id}/controle-${controleId}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('engins-conformite').upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) { setErreur(uploadError.message); setTeleversement(false); return; }
    const { error: dbError } = await supabase.from('controles_techniques').update({ preuve_url: path }).eq('id', controleId);
    if (dbError) { await supabase.storage.from('engins-conformite').remove([path]); setErreur(dbError.message); setTeleversement(false); return; }
    setControles(prev => prev.map(c => c.id === controleId ? { ...c, preuve_url: path } : c));
    setMessage('Preuve du contrôle technique enregistrée.');
    setTeleversement(false);
  }

  async function ouvrirPreuveControle(path) {
    const { data, error } = await supabase.storage.from('engins-conformite').createSignedUrl(path, 300);
    if (error) { setErreur(error.message); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function ajouterDocument(e) {
    e.preventDefault();
    setErreur('');
    setMessage('');

    if (!document.type_document) {
      setErreur('Le type de document est obligatoire.');
      return;
    }

    const { error } = await supabase.from('engins_documents').insert({
      engin_id: id,
      type_document: document.type_document,
      numero_document: document.numero_document.trim().slice(0, 120) || null,
      date_delivrance: document.date_delivrance || null,
      date_expiration: document.date_expiration || null,
      autorite: document.autorite.trim().slice(0, 160) || null,
      statut: document.statut,
      observations: document.observations.trim().slice(0, 2000) || null,
      verifie_par: agent.id,
      verifie_at: new Date().toISOString(),
    });

    if (error) {
      setErreur(error.message);
      return;
    }

    setMessage('Document de conformité enregistré.');
    setDocument({
      type_document: 'carte_grise',
      numero_document: '',
      date_delivrance: '',
      date_expiration: '',
      autorite: '',
      statut: 'valide',
      observations: '',
    });

    const { data } = await supabase.from('engins_documents').select('id, type_document, numero_document, date_delivrance, date_expiration, autorite, statut, preuve_url, observations, verifie_par, verifie_at, created_at').eq('engin_id', id).order('created_at', { ascending: false }).limit(50);
    setDocuments(data || []);
  }

  if (chargement) return <div className="shell"><div className="content"><p>Chargement…</p></div></div>;
  if (!engin) return <div className="shell"><div className="content"><p>{erreur || 'Engin introuvable.'}</p><Link href="/agent/dashboard" className="btn">Retour</Link></div></div>;

  return (
    <div className="shell" style={{ maxWidth: 900 }}>
      <div className="header">
        <Link href={`/agent/fiche/${engin.id}`} className="btn secondaire" style={{ width: 'auto', marginBottom: 12 }}>← Fiche engin</Link>
        <p className="sigle">Espace agent</p>
        <h1>Conformité de l’engin</h1>
        <p style={{ color: 'var(--ink-soft)' }}>{engin.plaque || engin.qr_code || engin.id.slice(0, 8)} • {engin.type_engin} • {engin.marque || ''} {engin.modele || ''}</p>
      </div>

      <div className="content">
        {erreur && <div className="resultat-statut suspect" style={{ marginBottom: 14 }}>{erreur}</div>}
        {message && <div className="resultat-statut actif" style={{ marginBottom: 14 }}>{message}</div>}

        <section>
          <h2>Contrôles techniques</h2>
          <form onSubmit={ajouterControle} style={{ display: 'grid', gap: 10 }}>
            <label>Date du contrôle<input type="date" value={controle.date_controle} onChange={e => setControle({ ...controle, date_controle: e.target.value })} required /></label>
            <label>Date d’expiration<input type="date" value={controle.date_expiration} onChange={e => setControle({ ...controle, date_expiration: e.target.value })} /></label>
            <label>Centre de contrôle<input maxLength={160} value={controle.centre_controle} onChange={e => setControle({ ...controle, centre_controle: e.target.value })} /></label>
            <label>Référence du contrôle<input maxLength={100} value={controle.reference_controle} onChange={e => setControle({ ...controle, reference_controle: e.target.value })} /></label>
            <label>Résultat<select value={controle.resultat} onChange={e => setControle({ ...controle, resultat: e.target.value })}><option value="conforme">Conforme</option><option value="non_conforme">Non conforme</option><option value="a_revoir">À revoir</option></select></label>
            <label>Observations<textarea maxLength={2000} value={controle.observations} onChange={e => setControle({ ...controle, observations: e.target.value })} /></label>
            <button className="btn" type="submit">Enregistrer le contrôle</button>
          </form>
        </section>

        <div className="divider" />

        <section>
          <h2>Historique des contrôles ({controles.length})</h2>
          {controles.length === 0 ? <p style={{ color: 'var(--ink-soft)' }}>Aucun contrôle enregistré.</p> : controles.map(c => (
            <div key={c.id} className="liste-item">
              <strong>{dateFR(c.date_controle)} — <span className={`badge ${c.resultat === 'conforme' ? 'actif' : 'suspect'}`}>{c.resultat}</span></strong>
              <div className="meta">{c.date_expiration ? `Expiration : ${dateFR(c.date_expiration)} • ${etatExpiration(c.date_expiration)}` : 'Aucune date d’expiration renseignée'}</div>
              {c.centre_controle && <div className="meta">Centre : {c.centre_controle}</div>}
              {c.reference_controle && <div className="meta">Référence : {c.reference_controle}</div>}
              {c.observations && <div className="meta">{c.observations}</div>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {c.preuve_url ? <button type="button" className="btn secondaire" onClick={() => ouvrirPreuveControle(c.preuve_url)}>Voir la preuve (lien 5 min)</button> : null}
                <label className="btn secondaire" style={{ cursor: televersement ? 'wait' : 'pointer' }}>Ajouter une preuve<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={televersement} onChange={e => { const file=e.target.files?.[0]; e.target.value=''; ajouterPreuveControle(c.id,file); }} style={{ display: 'none' }} /></label>
              </div>
            </div>
          ))}
        </section>

        <div className="divider" />

        <section>
          <h2>Documents de conformité</h2>
          <form onSubmit={ajouterDocument} style={{ display: 'grid', gap: 10 }}>
            <label>Type<select value={document.type_document} onChange={e => setDocument({ ...document, type_document: e.target.value })}>{DOCUMENTS.map(x => <option key={x} value={x}>{labelDoc[x]}</option>)}</select></label>
            <label>Numéro / référence<input maxLength={120} value={document.numero_document} onChange={e => setDocument({ ...document, numero_document: e.target.value })} /></label>
            <label>Date de délivrance<input type="date" value={document.date_delivrance} onChange={e => setDocument({ ...document, date_delivrance: e.target.value })} /></label>
            <label>Date d’expiration<input type="date" value={document.date_expiration} onChange={e => setDocument({ ...document, date_expiration: e.target.value })} /></label>
            <label>Autorité émettrice<input maxLength={160} value={document.autorite} onChange={e => setDocument({ ...document, autorite: e.target.value })} /></label>
            <label>Statut<select value={document.statut} onChange={e => setDocument({ ...document, statut: e.target.value })}><option value="valide">Valide</option><option value="expire">Expiré</option><option value="suspendu">Suspendu</option><option value="perdu">Perdu</option><option value="a_verifier">À vérifier</option></select></label>
            <label>Observations<textarea maxLength={2000} value={document.observations} onChange={e => setDocument({ ...document, observations: e.target.value })} /></label>
            <button className="btn" type="submit">Enregistrer le document</button>
          </form>
        </section>

        <div className="divider" />

        <section>
          <h2>Documents enregistrés ({documents.length})</h2>
          {documents.length === 0 ? <p style={{ color: 'var(--ink-soft)' }}>Aucun document enregistré.</p> : documents.map(d => (
            <div key={d.id} className="liste-item">
              <strong>{labelDoc[d.type_document] || d.type_document}</strong>{' '}
              <span className={`badge ${d.statut === 'valide' ? 'actif' : 'suspect'}`}>{d.statut}</span>
              <div className="meta">{d.numero_document || 'Sans numéro'} • expiration : {dateFR(d.date_expiration)} • {etatExpiration(d.date_expiration)}</div>
              {d.autorite && <div className="meta">Autorité : {d.autorite}</div>}
              {d.observations && <div className="meta">{d.observations}</div>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {d.preuve_url ? <button type="button" className="btn secondaire" onClick={() => ouvrirPreuve(d.preuve_url)}>Voir la preuve (lien 5 min)</button> : null}
                <label className="btn secondaire" style={{ cursor: televersement ? 'wait' : 'pointer' }}>Ajouter une preuve<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={televersement} onChange={e => { const file=e.target.files?.[0]; e.target.value=''; ajouterPreuve(d.id,file); }} style={{ display: 'none' }} /></label>
              </div>
            </div>
          ))}
        </section>

        <div className="divider" />
        <Link href={`/agent/controle?engin=${engin.id}`} className="btn secondaire">Retour au contrôle routier</Link>
      </div>
    </div>
  );
}
