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
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return Response.json({ erreur: 'Non autorisé.' }, { status: 401 });
  }

  const { data: { user }, error: erreurToken } = await supabaseVerif.auth.getUser(token);

  if (erreurToken || !user) {
    return Response.json({ erreur: 'Session invalide. Reconnectez-vous.' }, { status: 401 });
  }

  // Seul un responsable de poste, un responsable régional ou un admin peut ajouter un agent
  const { data: agentDemandeur, error: erreurAgentDemandeur } = await supabaseAdmin
    .from('agents')
    .select('role, poste_id')
    .eq('user_id', user.id)
    .single();

  const rolesAutorises = ['responsable', 'responsable_regional', 'admin'];

  if (erreurAgentDemandeur || !agentDemandeur || !rolesAutorises.includes(agentDemandeur.role)) {
    return Response.json(
      { erreur: "Vous n'avez pas les droits pour ajouter un agent." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { nom, telephone, email, motDePasse, role } = body;

  if (!nom || !email || !motDePasse) {
    return Response.json({ erreur: 'Nom, email et mot de passe sont obligatoires.' }, { status: 400 });
  }

  const roleFinal = role === 'responsable' ? 'responsable' : 'agent';

  // Le nouvel agent hérite automatiquement du poste de celui qui le crée
  const posteFinal = agentDemandeur.role === 'responsable' ? agentDemandeur.poste_id : null;

  const { data: nouvelUtilisateur, error: erreurCreation } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true,
  });

  if (erreurCreation) {
    return Response.json({ erreur: erreurCreation.message }, { status: 400 });
  }

  const { error: erreurAgent } = await supabaseAdmin.from('agents').insert({
    user_id: nouvelUtilisateur.user.id,
    nom,
    telephone: telephone || null,
    role: roleFinal,
    poste_id: posteFinal,
  });

  if (erreurAgent) {
    return Response.json(
      { erreur: "Le compte de connexion a été créé, mais l'ajout dans la table agents a échoué." },
      { status: 500 }
    );
  }

  return Response.json({ succes: true });
}
