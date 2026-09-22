'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
    supabase.from('engins').select('id, plaque, marque, modele, statut').eq('id', id).single()
      .then(({ data }) => setEngin(data));
  }, [id]);

  function choisirPhoto(file) {
    if (!file) return setPhoto(null);
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) return setErreur('Format photo non autorisé. Utilisez JPG, PNG ou WebP.');
    if (file.size > MAX_PHOTO_SIZE) return setErreur('La photo doit faire au maximum 5 Mo.');
    setErreur('');
    setPhoto(file);
  }

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

    const { data: agent } = await supabase.from('agents').select('id').eq('user_id', session.user.id).single();
    let photoPath = null;

    if (photo) {
      const extension = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
      const nomFichier = `signalements/${id}/${crypto.randomUUID()}.${extension}`;
      const { error: erreurUpload } = await supabase.storage.from('signalements')
        .upload(nomFichier, photo, { contentType: photo.type, upsert: false });
      if (!erreurUpload) photoPath = nomFichier;
    }

    const { error: erreurSignalement } = await supabase.from('signalements').insert({
      engin_id: id, agent_id: agent ? agent.id : null, type: 'interception',
      lieu: lieu || null, personne_trouvee: personneTrouvee || null, photo_url: photoPath,
    });

    setChargement(false);
    if (erreurSignalement) {
      setErreur("Erreur lors de l'enregistrement du signalement.");
      return;
    }
    router.push('/agent/dashboard');
  }

  if (!engin) return <div className="shell"><div className="content"><p>Chargement…</p></div></div>;

  return (
    <div className="shell">
      <div className="header">
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 14, padding: 0, marginBottom: 10, cursor: 'pointer' }}>← Retour</button>
        <p className="sigle">Espace agent</p><h1>Signaler l'interception</h1>
      </div>
      <div className="content">
        <div className={`resultat-statut ${engin.statut}`} style={{ padding: 16, marginBottom: 20 }}><p className="grand-label" style={{ fontSize: 16 }}>{engin.marque} {engin.modele} — {engin.plaque || 'sans plaque'}</p></div>
        {erreur && <div className="erreur">{erreur}</div>}
        <form onSubmit={envoyer}>
          <div className="field"><label htmlFor="lieu">Lieu de l'interception</label><input id="lieu" value={lieu} onChange={(e) => setLieu(e.target.value)} /></div>
          <div className="field"><label htmlFor="personne">Personne trouvée avec l'engin (optionnel)</label><input id="personne" value={personneTrouvee} onChange={(e) => setPersonneTrouvee(e.target.value)} /></div>
          <div className="field"><label htmlFor="photo">Photo (optionnelle, 5 Mo max)</label><input id="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => choisirPhoto(e.target.files?.[0])} /></div>
          <button type="submit" className="btn" disabled={chargement}>{chargement ? 'Envoi…' : 'Envoyer le signalement'}</button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 16 }}>Le statut de l'engin reste "{engin.statut}" tant que le responsable de poste n'a pas confirmé la restitution au propriétaire.</p>
      </div>
    </div>
  );
}
