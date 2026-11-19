# Assistant Étudiant

Application mobile Expo pour interroger des informations administratives universitaires, avec un backend FastAPI et une base Supabase/PostgreSQL préparée pour la recherche documentaire.

## Fonctionnalités

- Client React Native/Expo (SDK 58).
- Authentification e-mail/mot de passe Supabase, session persistée dans SecureStore sur mobile.
- Chat avec recherche textuelle PostgreSQL dans les documents publiés, réponses sourcées et refus clair lorsqu’aucun contenu ne correspond.
- Historique privé, reprise de conversation et feedback sur les réponses.
- Espace admin pour ajouter/indexer, publier/archiver les documents et consulter les statistiques.
- Schéma Supabase avec profils, RLS et création automatique des profils étudiant.

Le dépôt conserve son client mobile Expo et son backend Python plutôt que de remplacer les écrans par une seconde application web. Aucun corpus institutionnel n’est inclus : l’administrateur doit fournir et valider les documents de l’université avant publication. La recherche et les correspondances d’intention utilisent des règles déterministes; aucun modèle génératif ou modèle d’embeddings n’est utilisé.

## Prérequis

- Node.js 20.19.x ou plus récent.
- Python 3.12 recommandé.
- Un projet Supabase configuré avant les parcours d’authentification et de données.

## Démarrage local

Dans un terminal, installer et lancer l’API :

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
set -a
. ../.env
set +a
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Dans un second terminal, à la racine :

```bash
npm ci
npm run start
```

L’API sans `DATABASE_URL` répond avec un message de refus explicite, sans inventer de procédure.

## Configuration Supabase

1. Créer un projet Supabase et ouvrir le SQL Editor.
2. Exécuter les migrations SQL dans l’ordre (`001_initial_schema.sql`, puis les migrations `002` à `008`) dans le SQL Editor Supabase. Pour le projet configuré dans cet environnement, les migrations 002–008 ont déjà été appliquées. Ne réexécutez pas ces migrations sur une autre base sans sauvegarde.
3. Dans Authentication, activer l’inscription e-mail et choisir la stratégie de confirmation adaptée au projet.
4. Récupérer les paramètres suivants. `SUPABASE_SERVICE_ROLE_KEY` et `DATABASE_URL` sont réservés au backend et ne doivent jamais commencer par `EXPO_PUBLIC_`. La clé `SUPABASE_SERVICE_ROLE_KEY` est uniquement nécessaire pour la suppression définitive des comptes depuis l’administration.

```bash
export SUPABASE_URL='https://<project>.supabase.co'
export SUPABASE_ANON_KEY='<clé anon/public>'
export DATABASE_URL='postgresql://...'
# Facultatif : noms séparés par des virgules pour la reconnaissance de filières.
export KNOWN_FILIERES='Informatique,Mathématiques'
```

5. Créer au moins un compte via l’application. Promouvoir son profil depuis le SQL Editor uniquement après avoir vérifié son adresse :

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@universite.edu');
```

Un super-administrateur peut être créé de la même façon avec `role = 'super_admin'`. La récupération de mot de passe dépend du service e-mail et de l’URL de redirection configurés dans Supabase Auth.

6. Configurer le client Expo avec un fichier `.env` ignoré par Git :

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<clé anon/public>
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
```

7. Démarrer le backend avec les trois variables backend (et `CORS_ORIGINS` si l’origine diffère), puis redémarrer Expo après modification des variables.
8. Créer des sources documentaires, annonces, informations et dates du calendrier depuis Gestion. Elles ne deviennent visibles aux étudiants qu’après publication; fournir uniquement des contenus vérifiés et des sources institutionnelles.
9. Pour ajouter une réponse sans modèle, créez une intention, ajoutez des exemples de formulation et saisissez une réponse approuvée par l’administration. Les exemples servent de règles de mots-clés; ils ne sont pas utilisés pour entraîner un modèle.

La connexion utilise Supabase Auth par adresse e-mail. Le matricule peut être renseigné à l’inscription, mais n’est pas utilisé comme identifiant de connexion ni vérifié auprès d’un registre universitaire. Les notifications push distantes ne sont pas incluses : Expo Go sous Android ne les prend pas en charge; elles nécessitent un build de développement et la configuration des credentials Expo/APNs/FCM.

Les réponses sans source publiée proviennent uniquement des textes prédéfinis par l’administration. Si aucune règle et réponse correspondantes n’existent, le chatbot indique qu’il n’a pas trouvé de réponse et enregistre la question pour examen. Il ne génère pas de réponse libre.

## Mode démonstration fictif

Quelques réponses d’exemple sont disponibles pour tester l’interface; elles concernent uniquement « Université Exemple », un établissement fictif, et ne décrivent pas l’UDI. Elles sont désactivées par défaut. Pour les activer localement, définissez simultanément `APP_ENV=development` et `ENABLE_DEMO_KNOWLEDGE=true` dans l’environnement du backend. Le chatbot affiche alors un avertissement explicite et identifie chaque réponse comme fictive. Ne mettez jamais `APP_ENV=development` ni `ENABLE_DEMO_KNOWLEDGE=true` sur le serveur de production.

## Démarrage avec Docker Compose

Docker Compose peut démarrer uniquement le backend. La base reste Supabase/PostgreSQL externe.

```bash
docker compose up --build
curl http://127.0.0.1:8000/health
```

Docker Compose n’est pas testé dans cet environnement car Docker n’y est pas installé. Vérifiez `.env` avant le démarrage : ne publiez jamais `DATABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY` dans une image ou un fichier servi par Expo.

La clé anon/public peut être intégrée au client uniquement parce que les règles RLS et les contrôles de rôle protègent les données. Ne jamais y placer une clé `service_role` ni `DATABASE_URL`.

Pour un appareil physique, l’URL d’API doit être l’adresse LAN actuelle de l’ordinateur, et le téléphone doit être sur le même Wi-Fi. Cette adresse peut changer lorsque le réseau change; dans ce cas, mettre à jour `EXPO_PUBLIC_API_URL` dans `.env`, puis redémarrer Expo. Après cette configuration, démarrer Expo en mode LAN :

```bash
npm run start -- --lan
```

Remplacer l’adresse par l’IP locale. L’émulateur Android utilise par défaut `10.0.2.2`; web et simulateur iOS utilisent `127.0.0.1`.

## Vérifications

```bash
npx tsc --noEmit
cd backend && .venv/bin/python -m pytest -q
```

## Limites de mise en production

La mise en service réelle nécessite un projet Supabase, des secrets configurés côté serveur, le SQL exécuté, un compte administrateur vérifié et un corpus officiel autorisé. Tester les politiques RLS et l’isolation des comptes sur ce projet avant toute diffusion publique. Pour un téléphone physique, `EXPO_PUBLIC_API_URL` doit utiliser l’adresse réseau accessible du serveur API; ne pas exposer le port de développement directement à Internet.
