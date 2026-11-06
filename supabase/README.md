# Supabase setup

1. Create a free Supabase project (Singapore/Tokyo works best for China).
2. Dashboard → Authentication → Providers → Email: enable Email.
3. Dashboard → SQL Editor: paste and run `schema.sql`.
4. Dashboard → Project Settings → API: copy the Project URL and anon/publishable key.
5. Put them in `D:\LinguaDesk\.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
```

`VITE_SUPABASE_URL` should be the project base URL, not the `/rest/v1/` endpoint.
Never put a `service_role` key in this file.

## Auth choice

Use Email + Password first. Supabase's built-in email delivery is limited; for a
personal app you can create your account first and then disable public sign-ups
in Authentication → Settings.

## Sync shape

The app stores one row per local record in `user_records`, keyed by
`(user_id, table_name, record_id)`. The client merges with last-write-wins
(`updated_at`) and uses tombstones for deletions. Listening audio blobs are not
uploaded; transcripts and metadata are.

## If the project URL cannot be reached

A `supabase.co` project domain may be blocked on some mainland China networks.
Test on the phone with the exact project URL. If it is blocked, use a Hong Kong
VPS or another reachable backend instead of Supabase.
