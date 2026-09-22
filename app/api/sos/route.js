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
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\\s+/i, '').trim();
  if (!token) return Response.json({ erreur: 'Non autorisé.' }, { status: 401 });

  const { data: { user }, error: erreurToken } = await supabaseVerif.auth.getUser(token);
  if (erreurToken || !user) return Response.json({ erreur: 'Session invalide.' }, { status: 401 });

  const { data: citoyen } = await supabaseAdmin
    .from('citoyens')
    .select('id, nom, telephone')
    .eq('user_id', user.id)
    .single();

  if (!citoyen) return Response.json({ erreur: 'Profil citoyen introuvable.' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ erreur: 'Requête JSON invalide.' }, { status: 400 });
  }

  const lieu = typeof body?.lieu === 'string' ? body.lieu.trim().slice(0, 500) : null;

  const { error } = await supabaseAdmin.from('alertes_sos').insert({
    citoyen_id: citoyen.id,
    nom: citoyen.nom,
    telephone: citoyen.telephone,
    lieu: lieu || null,
  });

  if (error) return Response.json({ erreur: "Erreur lors de l'envoi de l'alerte." }, { status: 500 });

  return Response.json({ succes: true });
}
