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
    .select('id, nom, telephone')
    .eq('user_id', user.id)
    .single();

  if (!citoyen) return Response.json({ erreur: 'Profil citoyen introuvable.' }, { status: 403 });

  const { lieu } = await request.json();

  const { error } = await supabaseAdmin.from('alertes_sos').insert({
    citoyen_id: citoyen.id,
    nom: citoyen.nom,
    telephone: citoyen.telephone,
    lieu: lieu || null,
  });

  if (error) return Response.json({ erreur: "Erreur lors de l'envoi de l'alerte." }, { status: 500 });

  return Response.json({ succes: true });
}
