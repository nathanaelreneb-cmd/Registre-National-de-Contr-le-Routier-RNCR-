'use client';

import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function DeclarerVol() {
  const [recherche, setRecherche] = useState('');
  const [engin, setEngin] = useState(undefined); // undefined = pas cherché, null = introuvable
  const [circonstances, setCirconstances] = useState('');
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);
  const [chargement, setChargement] = useState(false);

  async function rechercher(e) {
    e.preventDefault();
    setErreur('');
    setSucces(false);
    const terme = recherche.trim();
    if (!terme) return;

    setChargement(true);
    const { data } = await supabase
      .from('engins')
      .select('id, plaque, marque, modele, statut, proprietaire_nom, qr_code')
      .or(`plaque.ilike.%${terme}%,qr_code.ilike.%${terme}%`)
      .limit(1)
      .maybeSingle();

    setEngin(data || null);
    setChargement(false);
  }

  async function declarer() {
    setErreur('');
    setChargement(true);

    const { data: { session } } = await supabase.auth.getSession();
    let agentId = null;
    if (session) {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', session.user.id)
        .single();
      agentId = agent ? agent.id : null;
    }

    const { error: erreurMaj } = await supabase
      .from('engins')
      .update({ statut: 'vole' })
      .eq('id', engin.id);

    if (erreurMaj) {
      setChargement(false);
      setErreur("Erreur lors de la mise à jour du statut.");
      return;
    }

    await supabase.from('signalements').insert({
      engin_id: engin.id,
      agent_id: agentId,
      type: 'declaration_vol',
      lieu: circonstances || null,
    });

    setChargement(false);
    setSucces(true);
    setEngin({ ...engin, statut: 'vole' });
  }

  return (
    <div className="shell">
      <div className="header">
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 14, padding: 0, marginBottom: 10, cursor: 'pointer' }}>← Retour</button>
        <p className="sigle">Espace agent</p>
        <h1>Déclarer un vol</h1>
      </div>
      <div className="content">
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 20 }}>
          À utiliser quand un propriétaire vient signaler le vol de son engin déjà enregistré.
        </p>

        {erreur && <div className="erreur">{erreur}</div>}
        {succes && (
          <div style={{ background: '#EAF6EF', border: '1px solid var(--statut-actif)', color: 'var(--statut-actif)', padding: '10px 12px', borderRadius: 4, fontSize: 14, marginBottom: 16 }}>
            Engin déclaré volé. Le portail public affichera désormais cette alerte à chaque vérification.
          </div>
        )}

        <form onSubmit={rechercher}>
          <div className="field">
            <label htmlFor="recherche">Plaque ou code QR de l'engin</label>
            <input id="recherche" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Ex : NO-073-A08" />
          </div>
          <button type="submit" className="btn secondaire" disabled={chargement}>Rechercher</button>
        </form>

        {engin === null && (
          <p style={{ color: 'var(--ink-soft)', marginTop: 16 }}>Aucun engin trouvé avec cette plaque ou ce code.</p>
        )}

        {engin && (
          <div style={{ marginTop: 20 }}>
            <div className="liste-item">
              <span className="plaque">{engin.plaque || 'Sans plaque'}</span>
              {' '}
              <span className={`badge ${engin.statut}`}>{engin.statut}</span>
              <div className="meta">{engin.marque} {engin.modele} — {engin.proprietaire_nom}</div>
            </div>

            {engin.statut === 'vole' ? (
              <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 12 }}>Cet engin est déjà déclaré volé.</p>
            ) : (
              <>
                <div className="field" style={{ marginTop: 16 }}>
                  <label htmlFor="circonstances">Circonstances / lieu (optionnel)</label>
                  <input id="circonstances" value={circonstances} onChange={(e) => setCirconstances(e.target.value)} />
                </div>
                <button className="btn" onClick={declarer} disabled={chargement}>
                  {chargement ? 'Déclaration en cours…' : 'Confirmer la déclaration de vol'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
