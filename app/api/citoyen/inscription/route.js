import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const { nom, telephone, cni, email, motDePasse } = await request.json();

  if (!nom || !telephone || !cni || !email || !motDePasse) {
    return Response.json({ erreur: 'Tous les champs sont obligatoires.' }, { status: 400 });
  }

  const { data: nouvelUtilisateur, error: erreurCreation } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true, // pas d'étape de confirmation email, connexion immédiate possible
  });

  if (erreurCreation) {
    return Response.json({ erreur: erreurCreation.message }, { status: 400 });
  }

  const { error: erreurProfil } = await supabaseAdmin.from('citoyens').insert({
    user_id: nouvelUtilisateur.user.id,
    nom,
    telephone,
    cni,
  });

  if (erreurProfil) {
    return Response.json(
      { erreur: "Compte créé mais erreur lors de l'enregistrement du profil." },
      { status: 500 }
    );
  }

  return Response.json({ succes: true });
}
