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

export async function POST(request) {
  const secret = request.headers.get('x-webhook-secret');
  if (secret !== process.env.WEBHOOK_SECRET) {
    return Response.json({ erreur: 'Non autorisé.' }, { status: 401 });
  }

  const dansSeptJours = new Date();
  dansSeptJours.setDate(dansSeptJours.getDate() + 7);
  const dateLimite = dansSeptJours.toISOString().slice(0, 10);
  const aujourdHui = new Date().toISOString().slice(0, 10);

  const { data: engins } = await supabaseAdmin
    .from('engins')
    .select('id, plaque, marque, modele, assurance_expiration, proprietaire_citoyen_id')
    .not('proprietaire_citoyen_id', 'is', null)
    .not('assurance_expiration', 'is', null)
    .gte('assurance_expiration', aujourdHui)
    .lte('assurance_expiration', dateLimite);

  if (!engins || engins.length === 0) {
    return Response.json({ succes: true, notifies: 0 });
  }

  let notifies = 0;

  for (const engin of engins) {
    const { data: citoyen } = await supabaseAdmin
      .from('citoyens')
      .select('user_id')
      .eq('id', engin.proprietaire_citoyen_id)
      .single();

    if (!citoyen) continue;

    const { data: abonnements } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', citoyen.user_id);

    const payload = JSON.stringify({
      title: 'RNCR — Assurance bientôt expirée',
      body: `${engin.marque || ''} ${engin.modele || ''} (${engin.plaque || 'sans plaque'}) : assurance valable jusqu'au ${engin.assurance_expiration}.`,
      url: '/citoyen/espace',
    });

    for (const a of abonnements || []) {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, payload);
        notifies++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', a.id);
        }
      }
    }
  }

  return Response.json({ succes: true, notifies });
}
