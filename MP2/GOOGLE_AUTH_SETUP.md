# Google Auth Setup for AffinityFlow

AffinityFlow uses **Supabase Auth** as the app-facing OAuth layer. Google OAuth credentials are created in your Google Cloud account, then pasted into Supabase. Do not commit any secret values.

## 1. Supabase

1. Create/open a Supabase project.
2. In **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Put both in `MP2/.env.local`.

## 2. Google Cloud OAuth

1. Go to Google Cloud Console.
2. Create/select a project.
3. Configure **OAuth consent screen**.
4. Create **OAuth client ID**:
   - Application type: Web application
   - Authorized JavaScript origins:
     - `http://localhost:3000`
   - Authorized redirect URIs:
     - `https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback`
5. Copy the Google Client ID and Client Secret.

## 3. Supabase Google Provider

1. In Supabase, go to **Authentication → Providers → Google**.
2. Enable Google.
3. Paste the Google Client ID and Client Secret.
4. Save.

## 4. App callback

The app uses:

```text
http://localhost:3000/callback
```

as the post-login app redirect. Supabase receives Google's callback first, then redirects back to AffinityFlow.

## Notes

- Restart `npm run dev` after editing `.env.local`.
- Never put the Google Client Secret in code or `.env.example`.
- For deployment, add the deployed app URL as a Supabase Site URL / redirect URL and add the deployed origin to Google authorized origins.
