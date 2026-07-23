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
