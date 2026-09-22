import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ erreur: 'Requête JSON invalide.' }, { status: 400 });
  }

  const nom = typeof body?.nom === 'string' ? body.nom.trim().slice(0, 120) : '';
  const telephone = typeof body?.telephone === 'string' ? body.telephone.trim().slice(0, 30) : '';
  const cni = typeof body?.cni === 'string' ? body.cni.trim().slice(0, 80) : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
  const motDePasse = typeof body?.motDePasse === 'string' ? body.motDePasse : '';

  if (!nom || !telephone || !cni || !email || !motDePasse) {
    return Response.json({ erreur: 'Tous les champs sont obligatoires.' }, { status: 400 });
  }

  if (motDePasse.length < 8) {
    return Response.json({ erreur: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 });
  }

  const { data: nouvelUtilisateur, error: erreurCreation } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true,
  });

  if (erreurCreation) {
    return Response.json({ erreur: 'Impossible de créer le compte.' }, { status: 400 });
  }

  const { error: erreurProfil } = await supabaseAdmin.from('citoyens').insert({
    user_id: nouvelUtilisateur.user.id,
    nom,
    telephone,
    cni,
  });

  if (erreurProfil) {
    await supabaseAdmin.auth.admin.deleteUser(nouvelUtilisateur.user.id);
    return Response.json(
      { erreur: "Impossible d'enregistrer le profil citoyen." },
      { status: 500 }
    );
  }

  return Response.json({ succes: true });
}
