'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

function genererCodeQr() {
  const alea = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `RNCR-${alea}`;
}

export default function SignalerSuspect() {
  const router = useRouter();
  const [form, setForm] = useState({
    type_engin: 'moto',
    marque: '',
    modele: '',
    couleur: '',
    plaque: '',
    numero_chassis: '',
    personne_trouvee: '',
    lieu: '',
  });
  const [photo, setPhoto] = useState(null);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  function majChamp(champ, valeur) {
    setForm((f) => ({ ...f, [champ]: valeur }));
  }

  async function enregistrer(e) {
    e.preventDefault();
    setErreur('');

    if (!form.personne_trouvee) {
      setErreur("Le nom (ou la description) de la personne trouvée avec l'engin est obligatoire.");
      return;
    }

    setChargement(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setErreur('Votre session a expiré. Reconnectez-vous.');
      setChargement(false);
      return;
    }

    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    const qrCode = genererCodeQr();

    const { data: nouvelEngin, error: erreurEngin } = await supabase
      .from('engins')
      .insert({
        qr_code: qrCode,
        type_engin: form.type_engin,
        marque: form.marque,
        modele: form.modele,
        couleur: form.couleur,
        plaque: form.plaque,
        numero_chassis: form.numero_chassis,
        statut: 'suspect',
        agent_enregistrement_id: agent ? agent.id : null,
      })
      .select('id')
      .single();

    if (erreurEngin) {
      setErreur("Erreur lors de l'enregistrement de l'engin.");
      setChargement(false);
      return;
    }

    let photoUrl = null;

    if (photo) {
      const nomFichier = `${nouvelEngin.id}-${Date.now()}.jpg`;
      const { error: erreurUpload } = await supabase.storage
        .from('signalements')
        .upload(nomFichier, photo);

      if (!erreurUpload) {
        const { data: urlPublique } = supabase.storage
          .from('signalements')
          .getPublicUrl(nomFichier);
        photoUrl = urlPublique.publicUrl;
      }
    }

    const { error: erreurSignalement } = await supabase.from('signalements').insert({
      engin_id: nouvelEngin.id,
      agent_id: agent ? agent.id : null,
      type: 'suspect',
      lieu: form.lieu || null,
      personne_trouvee: form.personne_trouvee,
      photo_url: photoUrl,
    });

    setChargement(false);

    if (erreurSignalement) {
      setErreur("L'engin a été enregistré, mais le signalement n'a pas pu être créé.");
      return;
    }

    router.push('/agent/dashboard');
  }

  return (
    <div className="shell">
      <div className="header">
        <p className="sigle">Espace agent</p>
        <h1>Signaler une moto suspecte</h1>
      </div>
      <div className="content">
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 20 }}>
          À utiliser quand l'engin n'a pas de QR code, ou que les informations ne correspondent pas à la personne trouvée avec.
        </p>

        {erreur && <div className="erreur">{erreur}</div>}

        <form onSubmit={enregistrer}>
          <div className="field">
            <label htmlFor="type_engin">Type d'engin</label>
            <select id="type_engin" value={form.type_engin} onChange={(e) => majChamp('type_engin', e.target.value)}>
              <option value="moto">Moto</option>
              <option value="tricycle">Tricycle</option>
              <option value="voiture">Voiture</option>
              <option value="camion">Camion</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="marque">Marque</label>
            <input id="marque" value={form.marque} onChange={(e) => majChamp('marque', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="modele">Modèle</label>
            <input id="modele" value={form.modele} onChange={(e) => majChamp('modele', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="couleur">Couleur</label>
            <input id="couleur" value={form.couleur} onChange={(e) => majChamp('couleur', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="plaque">Plaque (si visible)</label>
            <input id="plaque" value={form.plaque} onChange={(e) => majChamp('plaque', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="chassis">Numéro de châssis (si visible)</label>
            <input id="chassis" value={form.numero_chassis} onChange={(e) => majChamp('numero_chassis', e.target.value)} />
          </div>

          <div className="divider" />

          <div className="field">
            <label htmlFor="personne">Personne trouvée avec l'engin</label>
            <input
              id="personne"
              placeholder="Nom, ou description si inconnu"
              required
              value={form.personne_trouvee}
              onChange={(e) => majChamp('personne_trouvee', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="lieu">Lieu</label>
            <input id="lieu" value={form.lieu} onChange={(e) => majChamp('lieu', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="photo">Photo (optionnelle)</label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)}
            />
          </div>

          <button type="submit" className="btn" disabled={chargement}>
            {chargement ? 'Enregistrement…' : 'Enregistrer le signalement'}
          </button>
        </form>
      </div>
    </div>
  );
}
