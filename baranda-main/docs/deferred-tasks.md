# Deferred tasks

Tracked separately per the security-review follow-up decisions (LiveKit +
Expo Router audits, Aug 2026) so they don't get lost after launch. Each
entry links back to the report/decision that raised it.

## Completed

Accepted as 🟠 high-priority ("بعد القصوى مباشرة") in the same review
round that produced `is_public` RLS and the anonymous-broadcast
restriction. Both now done:

- [x] ~~Server-side rate limiting for live comments/likes~~ — shipped in
  `20260826000000_live_message_rate_limit.sql` +
  `supabase/functions/livekit-send-message`. Comments/likes now go
  through a server-checked, atomic Postgres counter before being relayed
  via LiveKit's `RoomServiceClient.sendData()`; `canPublishData` is
  `false` for everyone so there's no direct path left to bypass it. See
  README §7. The one follow-up noted here previously — scheduling
  `cleanup_old_rate_buckets()` — is now also done: `pg_cron` enabled +
  hourly job registered in `20260831000000_schedule_rate_bucket_cleanup.sql`
  (job name `cleanup-rate-buckets`, runs `0 * * * *`), plus a supporting
  index on `bucket_second` so the cleanup `DELETE` never has to scan the
  whole table. This item is now **fully closed**, nothing left open.
- [x] ~~Full RLS audit of the remaining Supabase tables~~ — done,
  table-by-table across all ~28 tables in `supabase/migrations/`. One
  real finding beyond what `20260822000000_rls_audit_fixes.sql` (an
  earlier audit round) had already caught: `known_regions` had no length
  cap on its otherwise-intentionally-open `with check (true)` INSERT
  policy — fixed in `20260827000000_known_regions_length_guard.sql`.
  Everything else checked out: ownership-scoped policies match their
  actual use (self-only tables, admin-gated tables via
  `admin_has_permission()`/staff-role checks, and the intentionally-public
  ones like `properties`/`lives`/`requests` all matched their product
  intent on inspection). Full findings in the chat transcript /
  consolidated report from this review round.

## Deferred to post-launch (explicitly, by product decision)

- [ ] **`lives.viewer_peak` trusted from the client** — a host can
  currently report an inflated number when ending their own broadcast
  (`app/live/broadcast.tsx`'s `finalizeSavedLive.mutate(...)`). Low
  severity (non-critical metadata, not PII/access). Fix: compute it
  server-side in `livekit-webhook` from `participant_joined`/
  `participant_left` events instead of trusting the broadcaster's own
  client. TODO comment already left at the call site.
- [ ] **Universal Links / App Links** for `https://diarino.app/...` share
  links to actually open the app (currently just open a browser — no
  `associatedDomains`/`intentFilters` configured in `app.json`). Product
  feature, not a security fix — noted in the Expo Router audit, no
  security surface either way since there's no custom deep-link handling
  code to exploit in the meantime.

## Accepted as-is (no action planned)

- **No distinction between anonymous ("guest") and real accounts**
  anywhere except starting a live broadcast (see README §7). Deliberate
  product decision to keep "try without signing in" fully functional
  everywhere else; RLS protects data regardless of which kind of session
  is asking, so this isn't a security gap, just a product-scope note.
