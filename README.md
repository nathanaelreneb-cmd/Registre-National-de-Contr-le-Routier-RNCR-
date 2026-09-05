# RNCR — Registre National de Contrôle Routier

## Phase 1 (pilote)
- Connexion agent (email + mot de passe)
- Enregistrement d'un engin + génération de fiche QR imprimable
- Scanner QR côté agent
- Portail public de vérification (sans compte)

## Déploiement

1. Créer un dépôt GitHub et y déposer tous ces fichiers.
2. Sur Vercel : "Add New Project" → importer le dépôt.
3. Dans les paramètres Vercel → Environment Variables, ajouter :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (valeurs dans `.env.example`)
4. Déployer.

## Créer le premier compte agent

Dans Supabase → Authentication → Users → "Add user", créer un compte
avec l'email et le mot de passe de l'agent. Ensuite, dans la table
`agents`, ajouter une ligne reliant `user_id` (l'UUID de ce compte)
au nom de l'agent et à son poste.

## À venir (déjà prévu dans le cahier des charges)
- Hiérarchie complète (national / régional / poste / agent)
- Dashboards statistiques
- Module amendes (nécessite avis juridique avant construction)
