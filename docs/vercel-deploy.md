# Vercel deployment checklist

Use this after Supabase login and local sync have been verified.

## 0. Before deploying

- [ ] Supabase `public.user_records` exists (schema.sql or schema-minimal.sql).
- [ ] Supabase Authentication → Email is enabled.
- [ ] Supabase Site URL is set; redirect URLs can be updated after Vercel gives you a domain.
- [ ] You have exported a local JSON backup from `我的 → 数据备份`.
- [ ] Local sync works on two browser profiles/accounts on the same machine.
- [ ] You know which Vercel account/GitHub repository you will use.

## 1. Push to GitHub

The project is at `D:\LinguaDesk`. `dist`, `node_modules`, `.env.local` are ignored.

- [ ] Create a private GitHub repository.
- [ ] Push the project.
- [ ] Confirm `.env.local` is NOT committed (it contains API keys).
- [ ] Confirm `api/`, `server/`, `supabase/` are included.

## 2. Import into Vercel

- [ ] Vercel → Add New → Project → import the repository.
- [ ] Framework Preset: **Vite**.
- [ ] Build Command: `npm run build`.
- [ ] Output Directory: `dist`.
- [ ] Root Directory: repository root.
- [ ] Install Command: `npm install`.

`vercel.json` already adds the SPA rewrite and `api/generate.ts` max duration.

## 3. Environment variables

Add these in Vercel → Project Settings → Environment Variables
(Production + Preview as needed):

| Name | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | Project base URL; `/rest/v1/` is normalized |
| `VITE_SUPABASE_ANON_KEY` | publishable/anon key | Public; RLS protects rows |
| `SUPABASE_URL` | same project URL | Used by the server to verify JWTs |
| `SUPABASE_ANON_KEY` | same anon/publishable key | Used only for `/auth/v1/user` |
| `REQUIRE_CLOUD_AUTH` | `1` | Recommended; Vercel also auto-requires auth when Supabase server vars exist |
| `AI_PROVIDER` | `deepseek` | Or `anthropic` |
| `DEEPSEEK_API_KEY` | `sk-...` | Server-only, never `VITE_` |
| `DEEPSEEK_MODEL` | `deepseek-chat` | Optional |
| `ANTHROPIC_API_KEY` | optional | If using Claude |

Do **not** add `SUPABASE_SERVICE_ROLE_KEY` to this app. It is not needed and
would give the frontend/server far too much power.

## 4. Supabase Auth URLs

After the first deployment, copy the Vercel URL and set:

- Authentication → URL Configuration → Site URL: `https://your-app.vercel.app`
- Redirect URLs: add the same URL (and any custom domain).
- Keep `http://localhost:5173` in Redirect URLs for local testing.

## 5. Deploy and verify

- [ ] Open the Vercel URL.
- [ ] Create the account / sign in.
- [ ] Open `我的 → 云同步`, click `立即同步`.
- [ ] Check Supabase Table Editor → `user_records`: rows should appear.
- [ ] Open the site in a second browser/phone, sign in, sync, and verify records.
- [ ] Test one AI generation while logged in.
- [ ] Log out and confirm AI returns a “please sign in” error, not a result.

## 6. Phone/PWA

- [ ] Open the site over HTTPS.
- [ ] Use the browser’s “Add to Home Screen”.
- [ ] Sign in once; offline local data still works.
- [ ] On iOS, use Safari for PWA installation; on Android, Chrome/Edge.

## 7. Security checks

- [ ] Supabase RLS policy exists on `user_records`.
- [ ] `service_role` key is not present in the repository or Vercel client env.
- [ ] AI requests require a valid Supabase session (Vercel auto or `REQUIRE_CLOUD_AUTH=1`).
- [ ] DeepSeek/Anthropic usage limits are set in the provider console.
- [ ] After creating your personal account, disable public sign-ups in Supabase if you do not want others to register.
- [ ] Do not share the Supabase service-role key or the AI provider key.

## 8. China network caveat

- Vercel's `*.vercel.app` domain is often unavailable in mainland China.
- Supabase project domains (`*.supabase.co`) can also be reset.
- If both are blocked on the phone, the free Vercel + Supabase plan cannot
  satisfy “phone works without a PC”. Use a VPN, a custom domain that works
  from your network, or a Hong Kong/domestic VPS.
- Supabase Free projects may pause after long inactivity; open the dashboard or
  use the app regularly.

## 9. First-login migration

If the current data is only in `http://localhost:5173`:

1. Verify local sync uploads it to the cloud while on localhost.
2. Deploy Vercel.
3. Sign in on Vercel and sync; it should pull the cloud records.
4. Keep the local JSON backup until you have verified the phone copy.

## 10. If something fails

| Symptom | Check |
|---|---|
| AI 401 `AUTH_REQUIRED` | You are signed out, or the token is stale; sign in again |
| AI 401 with correct login | `SUPABASE_URL`/`SUPABASE_ANON_KEY` server env missing/wrong |
| AI 503 `AUTH_UNAVAILABLE` | Server cannot reach Supabase Auth; network/VPN |
| Sync `relation does not exist` | Run the schema in the correct Supabase project |
| Sync 0 rows | Check SQL grants/RLS and whether you clicked sync |
| Login email never arrives | Use password login, disable email confirmation for personal use, or configure SMTP |
| Vercel app times out in China | VPN/custom domain/HK VPS |
