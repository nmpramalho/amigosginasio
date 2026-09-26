# Google authentication and access control

## Files replaced
- `package.json`
- `app/page.tsx`
- `app/(management)/layout.tsx`
- `app/(management)/administracao/page.tsx`
- `components/layout/app-shell.tsx`
- `components/layout/header.tsx`
- `components/layout/sidebar.tsx`

## Files created
- `auth.ts`, `lib/db.ts`, `lib/access-lookup.ts`, `lib/access.ts`
- `app/api/auth/[...nextauth]/route.ts`
- `app/acesso-negado/page.tsx`
- `app/(management)/administracao/actions.ts`
- `database/auth.sql`, `.env.example`, `.gitignore`

## Steps
1. Copy the ZIP files to the existing project. Do not delete any existing file. Run `npm install` to update `package-lock.json`.
2. In the Neon SQL Editor, execute `database/auth.sql`. Replace the sample address in the commented INSERT with your actual Google account email and execute that INSERT. This creates the first administrator; nobody can log in before this step.
3. Create a Google Cloud OAuth **Web application** client. Register redirect URIs `http://localhost:3000/api/auth/callback/google` and `https://YOUR-VERCEL-DOMAIN/api/auth/callback/google`. Configure the OAuth consent screen and its test users if still in testing mode.
4. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET` (generate with `openssl rand -base64 32`). Never commit `.env.local`.
5. Add the same four variables in Vercel Project Settings > Environment Variables for Production (and Preview, with a separate Neon branch if used).
6. Run `npm run dev`, test allowed and unknown Google accounts, then run `npm run build` and `npm run lint`.
7. `git add . && git commit -m "add-google-auth-and-access-control" && git push`.

Notes: Access is checked in server layouts and admin actions on each request, including after deactivation. The sidebar hiding Administration is only visual; the server page/action guards enforce admin access. Database access uses the Neon HTTP driver. Existing Prisma packages remain untouched; no sports schema is introduced.
