# OOO Puzzle

## Puzzle logic
Ciphertext on the page = `FLAG{VACATION_MODE_ACTIVATED}` XOR'd byte-by-byte with the
key `n3tl1fy`, base64-encoded. The key is not on the page — it's only in the
`X-Puzzle-Key` HTTP response header (set in `netlify.toml`), so solving requires
either `curl -I` on the page or checking the Network tab in devtools.

Solve path a technical person needs to find:
1. View source / console → hint tells them to check response headers.
2. `curl -I https://yoursite.netlify.app/` → finds `X-Puzzle-Key: n3tl1fy`.
3. Base64-decode the ciphertext, XOR with the key → recovers the flag.
4. Submit `FLAG{VACATION_MODE_ACTIVATED}`.

To change the flag/key, regenerate the ciphertext:

```python
import base64
flag = "FLAG{YOUR_NEW_FLAG}"
key = "your-new-key"
xored = bytes([ord(c) ^ ord(key[i % len(key)]) for i, c in enumerate(flag)])
print(base64.b64encode(xored).decode())
```
Then update:
- `.cipher` div content in `index.html`
- `X-Puzzle-Key` value in `netlify.toml`
- `PUZZLE_FLAG` env var in Netlify (see below)

## Deploy

1. Push this folder to a GitHub repo, connect it in Netlify (New site from Git),
   or run `netlify deploy --prod` from inside this folder with the Netlify CLI.
2. In Netlify site settings → Environment variables, set:
   - `PUZZLE_FLAG` = `FLAG{VACATION_MODE_ACTIVATED}`
   - `NTFY_TOPIC` = `231e4ce7-6d95-08c1-cf37-a7946f0e59b5`
3. Enable Netlify Blobs — it's automatic on Netlify's platform, no extra setup needed
   as long as `@netlify/blobs` is installed (already in `package.json`).
4. On your phone, install the ntfy app and subscribe to topic
   `231e4ce7-6d95-08c1-cf37-a7946f0e59b5`. Anyone who knows that exact topic string
   could technically subscribe too — treat it as a shared secret, don't publish it
   anywhere public. If you want it locked down further, ntfy supports auth, but the
   public topic is fine for this use case.
5. Put the deployed URL in your out-of-office autoresponder.

## Notes
- Only the first correct solve per UTC day triggers a push notification.
  Subsequent correct/incorrect submissions the same day just get checked silently.
- State resets naturally each day since the blob key is `solved:YYYY-MM-DD`.
- No database, no server to maintain — Netlify Functions + Blobs handle everything.
