# OOO Puzzle

A tiny Netlify site: an out-of-office autoresponder points people at this URL,
which looks like a broken 404 page but hides a CTF-style puzzle. Solving it
notifies the owner (once/day) via ntfy.

## Architecture
- `index.html` — static page, styled like a fake 404. Fetches the cipher and
  daily-solved status from functions at load time; posts submitted answers to
  `verify`.
- `netlify/functions/cipher.js` — computes the puzzle ciphertext at request
  time: `PUZZLE_FLAG` (env var) XOR'd byte-by-byte with a hardcoded key,
  base64-encoded. **Never hardcode the flag or its ciphertext in `index.html`**
  — that was the original bug (ciphertext manually pasted in, decoupled from
  `PUZZLE_FLAG`, so they drifted out of sync). The page always fetches this
  live.
- `netlify/functions/verify.js` — checks a submitted answer against
  `PUZZLE_FLAG` (exact string match, no `FLAG{}` wrapper assumed — whatever
  `PUZZLE_FLAG` literally is, that's the expected answer). On first correct
  solve of the UTC day, records it in Netlify Blobs and fires an ntfy
  notification (topic from `NTFY_TOPIC` env var) including the solver's
  optional name from the request body.
- `netlify/functions/status.js` — reports whether today's puzzle has already
  been solved, for the status badge on the page.
- `netlify.toml` — `X-Puzzle-Key` response header carries the XOR key (same
  value hardcoded in `cipher.js` — **the two must be kept in sync manually**,
  there's no single source of truth for the key). This is the "hidden" clue:
  solvers are expected to inspect response headers (`curl -I` or DevTools
  Network tab), not view-source, to find it.

## Conventions / gotchas
- Functions are ESM (`import`/`export default`) — `package.json` needs
  `"type": "module"` or bundling fails.
- Function files must live under `netlify/functions/` (per `netlify.toml`
  `functions` setting) — files at repo root are silently not deployed (404).
- The XOR key lives in two places that must match: `netlify.toml`
  (`X-Puzzle-Key` header) and `netlify/functions/cipher.js` (`key` constant).
  When rotating the key, update both.
- `PUZZLE_FLAG` and `NTFY_TOPIC` are Netlify env vars (site settings, not
  committed anywhere) — check `netlify env:list` if the puzzle seems
  unconfigured (500s from `verify`/`cipher`).
- Solver name (optional input on the page) is passed through to the ntfy
  notification body only, never a header, to avoid header-injection from
  arbitrary user input.

## Ideas for future clue-hiding mechanisms
Not implemented — notes to pick from later when reworking the clues. Each is
independent; mix and match.

- **UA-gated header** (discussed, deferred): only send `X-Puzzle-Key` when
  `User-Agent` matches `curl/...`, via a Netlify Edge Function wrapping `/`
  and `/index.html` (`context.next()` then set/strip the header based on
  UA). Static `netlify.toml` `[[headers]]` can't do this — it's unconditional.
  Weak against UA spoofing, but hides the key from casual DevTools snooping.
- **HTTP trailer / rarely-checked header**: instead of a common header name,
  use something a solver wouldn't think to look at by default, e.g. `Server-Timing`
  (visible in DevTools but easy to overlook) or a custom low-traffic header
  combined with a hint that says "check *all* the headers," not just one.
- **Cookie-based clue**: set a `Set-Cookie` on first visit containing an
  encoded hint; requires solver to inspect Application/Storage tab or
  `document.cookie` instead of Network tab. Good for diversifying which dev
  tool panel they need to open.
- **robots.txt / well-known paths**: drop a hint or partial key fragment in
  `/robots.txt`, `/.well-known/security.txt`, or a 404 page for a specific
  bogus path — rewards solvers who probe common conventions.
- **DNS TXT record**: put a clue or key fragment in a TXT record on a
  subdomain (e.g. `clue.<site>.netlify.app` or on the real domain if one
  exists). Requires `dig`/`nslookup`, a different tool than curl/browser.
- **Timing/order-dependent clue**: e.g. the key only appears in the response
  on the *second* request in a session (via a Blobs-backed per-IP or
  per-cookie counter), forcing solvers to notice something changes on
  reload — teaches "don't trust the first response."
- **Split the key across two channels**: half in a header, half in a
  `console.log` hint (already have a console breadcrumb pattern in
  `index.html`) or in a response header on a *different* route (e.g.
  `/.netlify/functions/status`). Forces combining two discovery methods
  instead of one lucky guess.
- **Post-solve unlock**: once solved, `verify.js` could return an extra field
  (e.g. a second, harder cipher or a follow-up hint) only on the *first*
  correct solve of the day — rewards being first, gives repeat solvers a new
  puzzle instead of just "already solved."
- **Steganography-lite**: hide a fragment in `index.html` via CSS (e.g.
  content in a `::before`/`::after` pseudo-element only visible via
  "inspect element", not view-source) or in an SVG favicon's metadata.
- **Time-boxed key**: rotate the key automatically based on UTC day/hour
  (e.g. `key + today's date`) so `curl -I` from a stale cached page/screenshot
  doesn't work — pairs well with the existing once-per-day solve limit.

When picking one, keep the asymmetry in mind: the *hint text* on the page
should always give a fair, findable trail to whichever mechanism is live —
don't stack multiple obscure mechanisms without updating the hints, or it
becomes unsolvable rather than hard.
