'use client';

import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function TransfertPropriete() {
  const [recherche, setRecherche] = useState('');
  const [engin, setEngin] = useState(undefined);
  const [nouveauNom, setNouveauNom] = useState('');
  const [nouveauTelephone, setNouveauTelephone] = useState('');
  const [nouveauCni, setNouveauCni] = useState('');
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
      .select('id, plaque, marque, modele, proprietaire_nom, proprietaire_telephone, proprietaire_cni, proprietaire_citoyen_id')
      .or(`plaque.ilike.%${terme}%,qr_code.ilike.%${terme}%`)
      .limit(1)
      .maybeSingle();

    setEngin(data || null);
    setChargement(false);
  }

  async function confirmerTransfert() {
    setErreur('');
    if (!nouveauNom.trim() || !nouveauTelephone.trim() || !nouveauCni.trim()) {
      setErreur('Le nom, le téléphone et le numéro CNI du nouveau propriétaire sont obligatoires.');
      return;
    }

    setChargement(true);

    const { data: { session } } = await supabase.auth.getSession();
    let agentId = null;
    if (session) {
      const { data: agent } = await supabase.from('agents').select('id').eq('user_id', session.user.id).single();
      agentId = agent ? agent.id : null;
    }

    await supabase.from('transferts_propriete').insert({
      engin_id: engin.id,
      agent_id: agentId,
      ancien_proprietaire_nom: engin.proprietaire_nom,
      ancien_proprietaire_telephone: engin.proprietaire_telephone,
      ancien_proprietaire_cni: engin.proprietaire_cni,
      nouveau_proprietaire_nom: nouveauNom.trim(),
      nouveau_proprietaire_telephone: nouveauTelephone.trim(),
      nouveau_proprietaire_cni: nouveauCni.trim(),
    });

    const { error: erreurMaj } = await supabase
      .from('engins')
      .update({
        proprietaire_nom: nouveauNom.trim(),
        proprietaire_telephone: nouveauTelephone.trim(),
        proprietaire_cni: nouveauCni.trim(),
        proprietaire_citoyen_id: null,
      })
      .eq('id', engin.id);

    setChargement(false);

    if (erreurMaj) {
      setErreur('Erreur lors du transfert.');
      return;
    }

    setSucces(true);
    setEngin(null);
    setNouveauNom('');
    setNouveauTelephone('');
    setNouveauCni('');
    setRecherche('');
  }

  return (
    <div className="shell">
      <div className="header">
        <p className="sigle">Espace agent</p>
        <h1>Transfert de propriété</h1>
      </div>
      <div className="content">
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 20 }}>
          L'ancien et le nouveau propriétaire doivent être présents tous les deux.
        </p>

        {erreur && <div className="erreur">{erreur}</div>}
        {succes && (
          <div style={{ background: '#EAF6EF', border: '1px solid var(--statut-actif)', color: 'var(--statut-actif)', padding: '10px 12px', borderRadius: 4, fontSize: 14, marginBottom: 16 }}>
            Transfert enregistré. L'historique des propriétaires est conservé.
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
          <p style={{ color: 'var(--ink-soft)', marginTop: 16 }}>Aucun engin trouvé.</p>
        )}

        {engin && (
          <div style={{ marginTop: 20 }}>
            <div className="liste-item">
              <span className="plaque">{engin.plaque}</span>
              <div className="meta">
                Propriétaire actuel : {engin.proprietaire_nom} — {engin.proprietaire_telephone}
              </div>
            </div>

            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="nouveauNom">Nom du nouveau propriétaire</label>
              <input id="nouveauNom" value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="nouveauTelephone">Téléphone du nouveau propriétaire</label>
              <input id="nouveauTelephone" value={nouveauTelephone} onChange={(e) => setNouveauTelephone(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="nouveauCni">CNI du nouveau propriétaire</label>
              <input id="nouveauCni" value={nouveauCni} onChange={(e) => setNouveauCni(e.target.value)} />
            </div>

            <button className="btn" onClick={confirmerTransfert} disabled={chargement}>
              {chargement ? 'Transfert en cours…' : 'Confirmer le transfert'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
