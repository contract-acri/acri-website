# ACRI website: www.acriindia.org

Static site on **Cloudflare Pages** (free), controlled from **one Google Sheet** through **Apps Script**.

```
public/            ← the website (upload this folder)
functions/         ← Cloudflare functions: maintenance mode, live Sheet content, /api bridge
apps-script/Code.gs← paste into the Google Sheet's Apps Script
src/               ← sources; edit here, then run  python3 src/build.py  to rebuild public/
```

## 1. Google Sheet + Apps Script (5 minutes)
1. Open the Google Sheet behind your web app → **Extensions → Apps Script**.
2. Replace `Code.gs` with `apps-script/Code.gs` → **Save**.
3. Choose **setup** in the function dropdown → **Run** → authorise.
   It creates the tabs **Settings, News, Schools, Applications, Log** and prints an admin password in the
   **Execution log**. To set your own: ⚙ Project Settings → Script Properties → `ADMIN_PASSWORD`.
4. **Deploy → Manage deployments → ✏ edit** your existing deployment → Version: **New version** →
   Execute as **Me**, access **Anyone** → **Deploy**. Your URL stays the same:
   `https://script.google.com/macros/s/AKfycbztkvrz…/exec` (already wired into `functions/_shared.js`).

Reload the Sheet and an **ACRI Website** menu appears (maintenance ON/OFF).

## 2. Cloudflare Pages (free)
Easiest: put this folder in a GitHub repo, then Cloudflare dashboard → **Workers & Pages → Create → Pages →
Connect to Git** → pick the repo →
- Build command: *(leave empty)*
- Build output directory: `public`
- Root directory: `/` (so the `functions/` folder is picked up)

Without GitHub: `npx wrangler pages deploy public` from this folder. (Dashboard drag-and-drop upload
does **not** include `functions/`, so the Sheet features would not run that way.)

Optional: **Settings → Variables** → `APPS_SCRIPT_URL` = your /exec URL (overrides the built-in one).

## 3. Point www.acriindia.org at Cloudflare Pages
Pages project → **Custom domains → Set up a domain** → `www.acriindia.org`, then follow the DNS record it
shows (a CNAME to `<project>.pages.dev`). The edu./res./other subdomains stay where they are.
Also add `acriindia.org` → redirect to `https://www.acriindia.org` (Cloudflare: Rules → Redirect Rules).

## 4. Google Search Console
search.google.com/search-console → add `https://www.acriindia.org` → verify (DNS TXT) →
**Sitemaps** → submit `https://www.acriindia.org/sitemap.xml`.

## Day-to-day control
| Want to… | Do this |
|---|---|
| Review school applications | `/admin` → Applications → click a row → set status → Save |
| Approve a school | Status **Approved** + School Code → it appears on `/school-network` and the school is emailed |
| Post news | `/admin` → News → Add (or add a row in the **News** tab) |
| Show a banner on every page | Settings → `ANNOUNCEMENT_TEXT` (+ `ANNOUNCEMENT_LINK`) |
| Take the site down | `/admin` → Site Settings → Maintenance ON, **or** Sheet menu **ACRI Website → Maintenance ON**, **or** Settings tab `MAINTENANCE_MODE` = TRUE |
| Close applications | `/admin` → Site Settings → School applications OFF |

Changes reach the live site within about a minute. During maintenance the public site returns HTTP 503
with `Retry-After`, which tells Google it is temporary, so rankings are kept. `/admin` keeps working.

**Emails** are sent by Google (MailApp) from the Google account that owns the script, with Reply-To set to
`REPLY_TO` (default office.secretariats@acriindia.org). Free Gmail accounts can send ~100 emails/day.

**Security:** the admin password lives only in Script Properties. Sessions last 6 hours; 10 wrong
passwords lock sign-in for 15 minutes. For an extra layer, put `/admin` behind
**Cloudflare Zero Trust → Access** (free up to 50 users) so only @acriindia.org emails can open it.
