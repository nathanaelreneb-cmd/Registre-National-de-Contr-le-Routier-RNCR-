'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

export default function SignalerInterception({ params }) {
  const { id } = params;
  const router = useRouter();
  const [engin, setEngin] = useState(null);
  const [lieu, setLieu] = useState('');
  const [personneTrouvee, setPersonneTrouvee] = useState('');
  const [photo, setPhoto] = useState(null);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    supabase
      .from('engins')
      .select('id, plaque, marque, modele, statut')
      .eq('id', id)
      .single()
      .then(({ data }) => setEngin(data));
  }, [id]);

  async function envoyer(e) {
    e.preventDefault();
    setErreur('');
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

    let photoUrl = null;

    if (photo) {
      const nomFichier = `${id}-${Date.now()}.jpg`;
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
      engin_id: id,
      agent_id: agent ? agent.id : null,
      type: 'interception',
      lieu: lieu || null,
      personne_trouvee: personneTrouvee || null,
      photo_url: photoUrl,
    });

    setChargement(false);

    if (erreurSignalement) {
      setErreur("Erreur lors de l'enregistrement du signalement.");
      return;
    }

    router.push('/agent/dashboard');
  }

  if (!engin) {
    return (
      <div className="shell">
        <div className="content"><p>Chargement…</p></div>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="header">
        <p className="sigle">Espace agent</p>
        <h1>Signaler l'interception</h1>
      </div>
      <div className="content">
        <div className={`resultat-statut ${engin.statut}`} style={{ padding: 16, marginBottom: 20 }}>
          <p className="grand-label" style={{ fontSize: 16 }}>
            {engin.marque} {engin.modele} — {engin.plaque || 'sans plaque'}
          </p>
        </div>

        {erreur && <div className="erreur">{erreur}</div>}

        <form onSubmit={envoyer}>
          <div className="field">
            <label htmlFor="lieu">Lieu de l'interception</label>
            <input id="lieu" value={lieu} onChange={(e) => setLieu(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="personne">Personne trouvée avec l'engin (optionnel)</label>
            <input id="personne" value={personneTrouvee} onChange={(e) => setPersonneTrouvee(e.target.value)} />
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
            {chargement ? 'Envoi…' : 'Envoyer le signalement'}
          </button>
        </form>

        <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 16 }}>
          Le statut de l'engin reste "{engin.statut}" tant que le responsable de poste n'a pas confirmé la restitution au propriétaire.
        </p>
      </div>
    </div>
  );
}
