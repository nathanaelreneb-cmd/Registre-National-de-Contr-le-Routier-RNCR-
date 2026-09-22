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
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!citoyen) return Response.json({ erreur: 'Profil citoyen introuvable.' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ erreur: 'Requête JSON invalide.' }, { status: 400 });
  }

  const enginId = typeof body?.enginId === 'string' ? body.enginId.trim() : '';
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

  const { error: erreurMaj } = await supabaseAdmin
    .from('engins')
    .update({ statut: 'vole' })
    .eq('id', enginId)
    .eq('proprietaire_citoyen_id', citoyen.id)
    .neq('statut', 'vole');

  if (erreurMaj) return Response.json({ erreur: 'Impossible de mettre à jour le statut.' }, { status: 500 });

  const { error: erreurSignalement } = await supabaseAdmin.from('signalements').insert({
    engin_id: enginId,
    type: 'declaration_vol',
    lieu: 'Déclaré par le propriétaire depuis son espace personnel',
  });

  if (erreurSignalement) {
    return Response.json(
      { erreur: 'Le véhicule a été marqué comme volé, mais le signalement n’a pas pu être enregistré.' },
      { status: 500 }
    );
  }

  return Response.json({ succes: true });
}
