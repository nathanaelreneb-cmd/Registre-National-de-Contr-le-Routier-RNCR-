'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

function Resultat({ titre, href, children }) {
  return (
    <Link href={href} className="liste-item" style={{ display: 'block', marginBottom: 8 }}>
      <strong>{titre}</strong>
      <div className="meta">{children}</div>
    </Link>
  );
}

export default function RechercheNationale() {
  const router = useRouter();
  const [autorise, setAutorise] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState({
    engins: [], conducteurs: [], infractions: [], accidents: [], signalements: []
  });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [effectuee, setEffectuee] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/agent/login');
        return;
      }

      const { data: agent, error } = await supabase
        .from('agents')
        .select('role, actif')
        .eq('user_id', data.session.user.id)
        .maybeSingle();

      if (error || !agent?.actif || !['agent', 'responsable', 'responsable_regional'].includes(agent.role)) {
        await supabase.auth.signOut();
        router.push('/agent/login');
        return;
      }

      setAutorise(true);
    })();
  }, [router]);

  async function lancerRecherche(e) {
    e?.preventDefault();
    const termeBrut = recherche.trim().slice(0, 80);
    if (!termeBrut) return;

    // Évite qu'un caractère de filtre transforme la recherche en joker.
    const terme = termeBrut.replace(/[%_]/g, '');

    setChargement(true);
    setErreur('');
    setEffectuee(true);

    const [
      engins,
      conducteurs,
      infractions,
      accidents,
      signalements,
    ] = await Promise.all([
      supabase
        .from('engins')
        .select('id, qr_code, type_engin, marque, modele, plaque, numero_chassis, proprietaire_nom, proprietaire_telephone, statut')
        .or(`plaque.ilike.%${terme}%,numero_chassis.ilike.%${terme}%,qr_code.ilike.%${terme}%,proprietaire_nom.ilike.%${terme}%,proprietaire_telephone.ilike.%${terme}%`)
        .limit(30),
      supabase
        .from('conducteurs')
        .select('id, nom, prenom, numero_cni, telephone, statut')
        .or(`nom.ilike.%${terme}%,prenom.ilike.%${terme}%,numero_cni.ilike.%${terme}%,telephone.ilike.%${terme}%`)
        .limit(30),
      supabase
        .from('infractions')
        .select('id, numero_pv, conducteur_id, engin_id, date_heure, lieu, type_infraction, statut')
        .or(`numero_pv.ilike.%${terme}%,lieu.ilike.%${terme}%,type_infraction.ilike.%${terme}%`)
        .limit(30),
      supabase
        .from('accidents')
        .select('id, numero_dossier, date_heure, lieu, type_accident, gravite, statut_enquete')
        .or(`numero_dossier.ilike.%${terme}%,lieu.ilike.%${terme}%,type_accident.ilike.%${terme}%`)
        .limit(30),
      supabase
        .from('signalements')
        .select('id, engin_id, type, lieu, personne_trouvee, statut, created_at')
        .or(`type.ilike.%${terme}%,lieu.ilike.%${terme}%,personne_trouvee.ilike.%${terme}%`)
        .limit(30),
    ]);

    const erreurs = [engins, conducteurs, infractions, accidents, signalements]
      .filter((r) => r.error);

    if (erreurs.length) {
      console.error('Erreur recherche nationale:', erreurs.map((r) => r.error));
      setErreur('Une partie de la recherche n’a pas pu être effectuée. Vérifiez vos droits ou réessayez.');
    }

    setResultats({
      engins: engins.data || [],
      conducteurs: conducteurs.data || [],
      infractions: infractions.data || [],
      accidents: accidents.data || [],
      signalements: signalements.data || [],
    });
    setChargement(false);
  }

  const total = Object.values(resultats).reduce((n, items) => n + items.length, 0);

  if (autorise === null) {
    return <div className="shell"><div className="content"><p>Chargement…</p></div></div>;
  }

  return (
    <div className="shell" style={{ maxWidth: 900 }}>
      <div className="header">
        <button
          onClick={() => window.history.back()}
          className="btn secondaire"
          style={{ width: 'auto', marginBottom: 12 }}
        >
          ← Retour
        </button>
        <p className="sigle">Registre national</p>
        <h1>Recherche nationale</h1>
        <p style={{ color: 'var(--ink-soft)' }}>
          Rechercher rapidement un engin, un conducteur, un PV, un accident ou un signalement.
        </p>
      </div>

      <div className="content">
        {erreur && <div className="erreur">{erreur}</div>}

        <form onSubmit={lancerRecherche}>
          <div className="field">
            <label htmlFor="recherche">Plaque, CNI, nom, téléphone, châssis, QR, PV ou lieu</label>
            <input
              id="recherche"
              value={recherche}
              maxLength={80}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Ex. RC-1234, CNI, nom, PV…"
              autoComplete="off"
            />
          </div>
          <button className="btn" disabled={chargement || !recherche.trim()}>
            {chargement ? 'Recherche nationale…' : 'Rechercher dans le registre'}
          </button>
        </form>

        {effectuee && !chargement && (
          <>
            <div className="divider" />
            <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 12 }}>
              {total} résultat{total > 1 ? 's' : ''} trouvé{total > 1 ? 's' : ''}.
            </p>

            {resultats.engins.length > 0 && (
              <section>
                <h2>🚗 Engins ({resultats.engins.length})</h2>
                {resultats.engins.map((e) => (
                  <Resultat key={e.id} titre={e.plaque || 'Engin sans plaque'} href={`/agent/fiche/${e.id}`}>
                    {e.type_engin || 'Type non renseigné'} — {e.marque || ''} {e.modele || ''}
                    {' · '}Statut : {e.statut || 'non renseigné'}
                    {' · '}Propriétaire : {e.proprietaire_nom || 'non renseigné'}
                  </Resultat>
                ))}
              </section>
            )}

            {resultats.conducteurs.length > 0 && (
              <section>
                <h2>👤 Conducteurs ({resultats.conducteurs.length})</h2>
                {resultats.conducteurs.map((c) => (
                  <Resultat key={c.id} titre={`${c.nom} ${c.prenom || ''}`} href={`/agent/conducteurs/${c.id}`}>
                    CNI : {c.numero_cni || 'non renseignée'} · Téléphone : {c.telephone || 'non renseigné'}
                    {' · '}Statut : {c.statut || 'actif'}
                  </Resultat>
                ))}
              </section>
            )}

            {resultats.infractions.length > 0 && (
              <section>
                <h2>📄 Infractions / PV ({resultats.infractions.length})</h2>
                {resultats.infractions.map((p) => (
                  <div key={p.id} className="liste-item" style={{ marginBottom: 8 }}>
                    <strong>{p.numero_pv || 'PV sans numéro'}</strong>
                    <div className="meta">
                      {p.type_infraction || 'Infraction'} · {p.lieu || 'Lieu non renseigné'} · {p.statut || 'statut non renseigné'}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {resultats.accidents.length > 0 && (
              <section>
                <h2>🚨 Accidents ({resultats.accidents.length})</h2>
                {resultats.accidents.map((a) => (
                  <Resultat key={a.id} titre={a.numero_dossier || 'Dossier accident'} href={`/agent/accidents/${a.id}`}>
                    {a.type_accident || 'Type non renseigné'} · {a.gravite || 'Gravité non renseignée'}
                    {' · '}{a.lieu || 'Lieu non renseigné'} · Enquête : {a.statut_enquete || 'non renseignée'}
                  </Resultat>
                ))}
              </section>
            )}

            {resultats.signalements.length > 0 && (
              <section>
                <h2>🔎 Signalements ({resultats.signalements.length})</h2>
                {resultats.signalements.map((s) => (
                  <div key={s.id} className="liste-item" style={{ marginBottom: 8 }}>
                    <strong>{s.type || 'Signalement'}</strong>
                    <div className="meta">
                      {s.lieu || 'Lieu non renseigné'} · {s.personne_trouvee || 'Personne non renseignée'}
                      {' · '}Statut : {s.statut || 'non renseigné'}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {total === 0 && (
              <div className="liste-item">
                Aucun dossier ne correspond à « {recherche.trim()} ».
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
