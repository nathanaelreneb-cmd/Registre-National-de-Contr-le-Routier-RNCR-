import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseVerif = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ACTIONS = new Set(['view','create','update','delete','close','export','verify']);
const ENTITY_TYPES = new Set(['conducteur','engin','pv','accident','signalement','transfert','document','controle']);

export async function POST(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return Response.json({ erreur: 'Non autorisé.' }, { status: 401 });

  const { data: { user }, error: tokenError } = await supabaseVerif.auth.getUser(token);
  if (tokenError || !user) return Response.json({ erreur: 'Session invalide.' }, { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ erreur: 'Requête JSON invalide.' }, { status: 400 }); }

  const action = typeof body?.action === 'string' ? body.action : '';
  const entityType = typeof body?.entity_type === 'string' ? body.entity_type : '';
  const entityId = typeof body?.entity_id === 'string' ? body.entity_id : null;
  const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 500) : null;
  const metadata = body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
    ? body.metadata : {};

  if (!ACTIONS.has(action) || !ENTITY_TYPES.has(entityType)) {
    return Response.json({ erreur: 'Action ou type d’entité non autorisé.' }, { status: 400 });
  }
  if (entityId && !/^[0-9a-f-]{36}$/i.test(entityId)) {
    return Response.json({ erreur: 'Identifiant d’entité invalide.' }, { status: 400 });
  }

  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('id,role,actif')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!agent?.actif || !['agent','responsable','responsable_regional','admin'].includes(agent.role)) {
    return Response.json({ erreur: 'Accès agent refusé.' }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from('audit_logs').insert({
    actor_user_id: user.id,
    agent_id: agent.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    description,
    metadata,
  });

  if (error) return Response.json({ erreur: 'Impossible d’enregistrer la trace.' }, { status: 500 });
  return Response.json({ succes: true });
}
