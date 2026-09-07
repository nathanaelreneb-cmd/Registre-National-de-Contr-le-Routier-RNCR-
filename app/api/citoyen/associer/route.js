import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseVerif = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return Response.json({ erreur: 'Non autorisé.' }, { status: 401 });

  const { data: { user }, error: erreurToken } = await supabaseVerif.auth.getUser(token);
  if (erreurToken || !user) return Response.json({ erreur: 'Session invalide.' }, { status: 401 });

  const { data: citoyen } = await supabaseAdmin
    .from('citoyens')
    .select('id, cni')
    .eq('user_id', user.id)
    .single();

  if (!citoyen) return Response.json({ erreur: 'Profil citoyen introuvable.' }, { status: 403 });

  const { plaque } = await request.json();
  if (!plaque) return Response.json({ erreur: 'Plaque manquante.' }, { status: 400 });

  const { data: engin } = await supabaseAdmin
    .from('engins')
    .select('id, proprietaire_citoyen_id')
    .eq('plaque', plaque)
    .eq('proprietaire_cni', citoyen.cni)
    .maybeSingle();

  if (!engin) {
    return Response.json(
      { erreur: "Aucun engin trouvé avec cette plaque et ce numéro CNI. Vérifiez qu'il a bien été enregistré à votre nom par un agent." },
      { status: 404 }
    );
  }

  if (engin.proprietaire_citoyen_id) {
    return Response.json({ erreur: 'Cet engin est déjà associé à un compte.' }, { status: 409 });
  }

  const { error: erreurMaj } = await supabaseAdmin
    .from('engins')
    .update({ proprietaire_citoyen_id: citoyen.id })
    .eq('id', engin.id);

  if (erreurMaj) return Response.json({ erreur: "Erreur lors de l'association." }, { status: 500 });

  return Response.json({ succes: true });
}
