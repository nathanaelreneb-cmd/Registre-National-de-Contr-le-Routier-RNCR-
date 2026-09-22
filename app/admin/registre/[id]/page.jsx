'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';

const STATUTS = {
  actif: 'Actif',
  vole: 'Volé',
  suspect: 'Suspect',
  bloque: 'Bloqué',
  archive: 'Archivé',
};

function formaterDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formaterDateCourte(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR');
}

function libelleStatut(statut) {
  return STATUTS[statut] || statut || 'Inconnu';
}

export default function DetailEnginAdmin({ params }) {
  const { id } = params;
  const router = useRouter();
  const [autorise, setAutorise] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [engin, setEngin] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [signalements, setSignalements] = useState([]);
  const [transferts, setTransferts] = useState([]);

  useEffect(() => {
    let actif = true;

    async function initialiser() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        router.push('/admin/login');
        return;
      }

      const { data: agent } = await supabase
        .from('agents')
        .select('role, actif')
        .eq('user_id', sessionData.session.user.id)
        .maybeSingle();

      if (!agent?.actif || agent.role !== 'admin') {
        router.push('/admin/login');
        return;
      }

      if (actif) setAutorise(true);
      await charger();
    }

    initialiser();

    return () => {
      actif = false;
    };
  }, [id, router]);

  async function charger() {
    setChargement(true);
    setErreur('');

    const [enginResult, verifResult, signalementResult, transfertResult] = await Promise.all([
      supabase
        .from('engins')
        .select('id, qr_code, type_engin, marque, modele, couleur, plaque, numero_chassis, proprietaire_nom, proprietaire_telephone, proprietaire_cni, proprietaire_citoyen_id, a_un_compte, statut, poste_enregistrement_id, agent_enregistrement_id, created_at, statut_fiscal, assurance_expiration')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('verifications')
        .select('id, resultat, via_public, lieu, lieu_latitude, lieu_longitude, created_at')
        .eq('engin_id', id)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('signalements')
        .select('id, type, statut, lieu, personne_trouvee, photo_url, created_at, resolu_at')
        .eq('engin_id', id)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('transferts_propriete')
        .select('id, ancien_proprietaire_nom, nouveau_proprietaire_nom, nouveau_proprietaire_telephone, created_at')
        .eq('engin_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (enginResult.error || !enginResult.data) {
      setErreur(enginResult.error?.message || 'Engin introuvable.');
      setEngin(null);
    } else {
      setEngin(enginResult.data);
    }

    setVerifications(verifResult.data || []);
    setSignalements(signalementResult.data || []);
    setTransferts(transfertResult.data || []);

    const erreurs = [
      enginResult.error,
      verifResult.error,
      signalementResult.error,
      transfertResult.error,
    ].filter(Boolean);

    if (erreurs.length && !enginResult.error) {
      setErreur('Certaines parties de l’historique n’ont pas pu être chargées.');
    }

    setChargement(false);
  }

  if (autorise === null || chargement) {
    return (
      <div className="shell">
        <div className="content"><p>Chargement de la fiche…</p></div>
      </div>
    );
  }

  if (!engin) {
    return (
      <div className="shell" style={{ maxWidth: 820 }}>
        <div className="header">
          <button onClick={() => router.back()} className="btn secondaire">← Retour</button>
          <p className="sigle">Portail Administration</p>
          <h1>Engin introuvable</h1>
        </div>
        <div className="content">
          <p>{erreur || 'Aucune fiche ne correspond à cet identifiant.'}</p>
          <Link href="/admin/registre" className="btn">Retour au registre</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell" style={{ maxWidth: 820 }}>
      <div className="header">
        <button
          onClick={() => router.back()}
          className="btn secondaire"
          style={{ width: 'auto', marginBottom: 12 }}
        >
          ← Retour
        </button>
        <p className="sigle">Portail Administration</p>
        <h1>Fiche complète de l’engin</h1>
        <p style={{ color: 'var(--ink-soft)', marginTop: 6 }}>
          Registre national • dossier {engin.plaque || engin.qr_code || engin.id.slice(0, 8)}
        </p>
      </div>

      <div className="content">
        {erreur && (
          <div className="resultat-statut suspect" style={{ marginBottom: 16 }}>
            {erreur}
          </div>
        )}

        <div className={`resultat-statut ${engin.statut || 'actif'}`} style={{ padding: 18 }}>
          <p className="grand-label" style={{ fontSize: 22, marginBottom: 5 }}>
            {engin.plaque || 'Sans plaque'}
          </p>
          <strong>{libelleStatut(engin.statut)}</strong>
          {engin.qr_code && (
            <div className="meta" style={{ marginTop: 7 }}>
              QR : {engin.qr_code}
            </div>
          )}
        </div>

        <section>
          <h2>1. Identité de l’engin</h2>
          <dl className="fiche-info">
            <dt>Type</dt><dd>{engin.type_engin || '—'}</dd>
            <dt>Marque</dt><dd>{engin.marque || '—'}</dd>
            <dt>Modèle</dt><dd>{engin.modele || '—'}</dd>
            <dt>Couleur</dt><dd>{engin.couleur || '—'}</dd>
            <dt>Plaque</dt><dd>{engin.plaque || '—'}</dd>
            <dt>Numéro de châssis</dt><dd>{engin.numero_chassis || '—'}</dd>
            <dt>Code QR</dt><dd>{engin.qr_code || '—'}</dd>
          </dl>
        </section>

        <div className="divider" />

        <section>
          <h2>2. Propriétaire</h2>
          <dl className="fiche-info">
            <dt>Nom</dt><dd>{engin.proprietaire_nom || '—'}</dd>
            <dt>Téléphone</dt><dd>{engin.proprietaire_telephone || '—'}</dd>
            <dt>CNI</dt><dd>{engin.proprietaire_cni || '—'}</dd>
            <dt>Compte citoyen associé</dt><dd>{engin.proprietaire_citoyen_id ? 'Oui' : 'Non'}</dd>
          </dl>
        </section>

        <div className="divider" />

        <section>
          <h2>3. Situation administrative</h2>
          <dl className="fiche-info">
            <dt>Situation fiscale</dt>
            <dd>
              {engin.statut_fiscal === 'a_jour'
                ? 'À jour'
                : engin.statut_fiscal === 'en_retard'
                  ? 'En retard'
                  : 'Inconnue'}
            </dd>
            <dt>Assurance jusqu’au</dt><dd>{formaterDateCourte(engin.assurance_expiration)}</dd>
            <dt>Enregistré le</dt><dd>{formaterDate(engin.created_at)}</dd>
            <dt>Compte propriétaire</dt><dd>{engin.a_un_compte ? 'Oui' : 'Non'}</dd>
          </dl>
        </section>

        <div className="divider" />

        <section>
          <h2>4. Signalements et incidents ({signalements.length})</h2>
          {signalements.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>Aucun signalement enregistré.</p>
          ) : (
            signalements.map((s) => (
              <div key={s.id} className="liste-item">
                <div>
                  <span className="plaque" style={{ fontSize: 14 }}>
                    {s.type === 'interception' ? 'Interception' : 'Signalement suspect'}
                  </span>{' '}
                  <span className={`badge ${s.statut === 'resolu' ? 'actif' : s.statut === 'en_cours' ? 'suspect' : 'vole'}`}>
                    {s.statut || 'ouvert'}
                  </span>
                </div>
                <div className="meta">
                  {formaterDate(s.created_at)} • {s.lieu || 'lieu non précisé'}
                </div>
                {s.personne_trouvee && (
                  <div className="meta">Personne trouvée : {s.personne_trouvee}</div>
                )}
                {s.resolu_at && <div className="meta">Résolu le : {formaterDate(s.resolu_at)}</div>}
              </div>
            ))
          )}
        </section>

        <div className="divider" />

        <section>
          <h2>5. Historique des contrôles ({verifications.length})</h2>
          {verifications.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>Aucun contrôle enregistré.</p>
          ) : (
            verifications.map((v) => (
              <div key={v.id} className="liste-item">
                <div>
                  <strong>{v.via_public ? 'Vérification publique' : 'Contrôle agent'}</strong>{' '}
                  <span className={`badge ${v.resultat === 'conforme' ? 'actif' : 'suspect'}`}>
                    {v.resultat || 'non précisé'}
                  </span>
                </div>
                <div className="meta">
                  {formaterDate(v.created_at)} • {v.lieu || 'lieu non précisé'}
                </div>
                {(v.lieu_latitude != null && v.lieu_longitude != null) && (
                  <div className="meta">Position GPS enregistrée</div>
                )}
              </div>
            ))
          )}
        </section>

        <div className="divider" />

        <section>
          <h2>6. Historique des propriétaires ({transferts.length})</h2>
          {transferts.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>Aucun transfert enregistré.</p>
          ) : (
            transferts.map((t) => (
              <div key={t.id} className="liste-item">
                <strong>{t.ancien_proprietaire_nom || 'Ancien propriétaire non renseigné'} → {t.nouveau_proprietaire_nom || 'Nouveau propriétaire non renseigné'}</strong>
                <div className="meta">
                  {formaterDate(t.created_at)}
                  {t.nouveau_proprietaire_telephone ? ` • ${t.nouveau_proprietaire_telephone}` : ''}
                </div>
              </div>
            ))
          )}
        </section>

        <div className="divider" />

        <div style={{ display: 'grid', gap: 10 }}>
          <Link href={`/admin/trajet/${engin.id}`} className="btn secondaire">
            Voir le trajet reconstitué
          </Link>
          <Link href="/admin/registre" className="btn secondaire">
            Retour au registre central
          </Link>
        </div>
      </div>
    </div>
  );
}
