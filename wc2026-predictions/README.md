# WC 2026 Predictions

Petite app de pronostics entre amis pour la Coupe du Monde 2026.

## Fonctionnalités

- Connexion / inscription via Supabase Auth
- Liste des matchs
- Pronostics par utilisateur : score + premier buteur
- Verrouillage automatique après le coup d'envoi
- Page admin pour ajouter les matchs et encoder les résultats
- Calcul des points
- Classement général

## Stack

- Next.js App Router
- TypeScript
- Supabase Auth + Postgres
- Vercel

## Installation locale

```bash
npm install
cp .env.example .env.local
npm run dev
```

Puis ouvre `http://localhost:3000`.

## Configuration Supabase

1. Crée un projet sur Supabase.
2. Va dans **SQL Editor**.
3. Copie-colle le contenu de `supabase/schema.sql`.
4. Va dans **Project Settings > API**.
5. Copie :
   - Project URL
   - anon public key
6. Mets ces valeurs dans `.env.local` :

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Créer ton compte admin

1. Lance l'app.
2. Va sur `/login`.
3. Crée ton compte.
4. Dans Supabase SQL Editor, exécute :

```sql
update public.profiles
set is_admin = true
where email = 'ton-email@example.com';
```

## Déploiement sur Vercel

1. Crée un repo GitHub.
2. Upload ce projet dans le repo.
3. Connecte le repo à Vercel.
4. Ajoute les variables d'environnement dans Vercel :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Déploie.

Vercel peut déployer automatiquement un projet GitHub à chaque push.

## Barème actuel

- Score exact : 6 points
- Bon résultat : 3 points
- Premier buteur : +3 points
- Bonus score exact + premier buteur : +2 points

Le barème est défini dans `supabase/schema.sql`, fonction `calculate_prediction_points`.

## Prochaines améliorations possibles

- Groupes privés avec code d'invitation
- Logo / thème plus Coupe du Monde
- Import CSV des matchs
- Classement par phase
- Page détail par joueur
- Mot de passe oublié / confirmation email personnalisée
