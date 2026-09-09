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

  const { data: { user }, error } = await supabaseVerif.auth.getUser(token);
  if (error || !user) return Response.json({ erreur: 'Session invalide.' }, { status: 401 });

  const { subscription } = await request.json();
  if (!subscription || !subscription.endpoint) {
    return Response.json({ erreur: 'Abonnement invalide.' }, { status: 400 });
  }

  const { error: erreurInsert } = await supabaseAdmin.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: 'endpoint' }
  );

  if (erreurInsert) {
    return Response.json({ erreur: "Erreur lors de l'enregistrement." }, { status: 500 });
  }

  return Response.json({ succes: true });
}
