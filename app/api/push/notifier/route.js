import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:contact@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const TITRES = {
  signalement: 'RNCR — Nouveau signalement',
  sos: 'RNCR — Alerte SOS',
};

const CORPS = {
  signalement: "Un nouveau signalement vient d'être créé.",
  sos: "Une alerte SOS vient d'être envoyée par un citoyen.",
};

export async function POST(request) {
  const secret = request.headers.get('x-webhook-secret');
  if (secret !== process.env.WEBHOOK_SECRET) {
    return Response.json({ erreur: 'Non autorisé.' }, { status: 401 });
  }

  const { type } = await request.json();

  const { data: abonnements } = await supabaseAdmin.from('push_subscriptions').select('*');

  const payload = JSON.stringify({
    title: TITRES[type] || 'RNCR — Nouvelle alerte',
    body: CORPS[type] || 'Une nouvelle alerte est arrivée.',
    url: '/admin/vols',
  });

  await Promise.all(
    (abonnements || []).map((a) =>
      webpush
        .sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, payload)
        .catch(async (err) => {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('id', a.id);
          }
        })
    )
  );

  return Response.json({ succes: true });
}
