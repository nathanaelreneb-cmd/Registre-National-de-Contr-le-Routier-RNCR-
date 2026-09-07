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
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!citoyen) return Response.json({ erreur: 'Profil citoyen introuvable.' }, { status: 403 });

  const { enginId } = await request.json();
  if (!enginId) return Response.json({ erreur: 'Engin manquant.' }, { status: 400 });

  const { data: engin } = await supabaseAdmin
    .from('engins')
    .select('id, proprietaire_citoyen_id, statut')
    .eq('id', enginId)
    .single();

  if (!engin || engin.proprietaire_citoyen_id !== citoyen.id) {
    return Response.json({ erreur: "Cet engin ne vous appartient pas." }, { status: 403 });
  }

  if (engin.statut === 'vole') {
    return Response.json({ erreur: 'Cet engin est déjà déclaré volé.' }, { status: 409 });
  }

  await supabaseAdmin.from('engins').update({ statut: 'vole' }).eq('id', enginId);

  await supabaseAdmin.from('signalements').insert({
    engin_id: enginId,
    type: 'declaration_vol',
    lieu: 'Déclaré par le propriétaire depuis son espace personnel',
  });

  return Response.json({ succes: true });
}
