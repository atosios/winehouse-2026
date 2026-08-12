# Deploying The Winehouse to your host (cPanel-style shared hosting)

Two things get deployed:

| Part | What it is | Where it goes |
|---|---|---|
| `winehouse-site` | The website + admin dashboard (static files) | `public_html/` of `www.your-domain.gr` |
| `winehouse-be` | The API (Laravel) + MySQL database | subdomain `api.your-domain.gr` |

The frontend automatically talks to `https://api.<your-domain>/api`, so the
subdomain **must be named exactly `api`** — no code changes needed.

---

## 1. Create the database (cPanel → MySQL® Databases)

1. **Create database**: e.g. `youruser_winehouse`.
2. **Create DB user**: e.g. `youruser_wh` with a strong generated password.
3. **Add user to database** → tick **ALL PRIVILEGES**.
4. Write these three values down — they go into `.env` below.

## 2. Create the API subdomain (cPanel → Domains / Subdomains)

1. Create subdomain `api.your-domain.gr`.
2. Set its **document root** to the Laravel `public` folder, e.g.
   `/home/youruser/winehouse-be/public`
   (keep the Laravel app itself **outside** `public_html` so its code and
   `.env` are never web-accessible).
3. Run **AutoSSL / Let's Encrypt** so `https://api.your-domain.gr` has a certificate.

## 3. Upload the backend

**Option A — Git (recommended, host has SSH):**

```bash
# on the host, via SSH
cd ~
git clone <your-repo-url> winehouse-2026
ln -s ~/winehouse-2026/winehouse-be ~/winehouse-be   # or clone the BE separately
cd ~/winehouse-be
composer install --no-dev --optimize-autoloader
```

If the host has no `composer`, run `composer install --no-dev` locally (or in
Docker: `docker compose exec -T app composer install --no-dev`) and upload the
`vendor/` folder along with the code.

**Option B — zip upload:** zip `winehouse-be` **including `vendor/`**, upload
via File Manager, extract to `/home/youruser/winehouse-be`.

> Check cPanel → **MultiPHP Manager**: the domain must use **PHP 8.2+**.

## 4. Configure `.env` on the host

Copy `.env.example` to `.env` in `~/winehouse-be` and set:

```ini
APP_NAME="The Winehouse"
APP_ENV=production
APP_DEBUG=false                     # IMPORTANT: never true in production
APP_URL=https://api.your-domain.gr

ADMIN_EMAIL=admin@your-domain.gr    # used once by db:seed
ADMIN_PASSWORD=<temporary-strong-password>

DB_CONNECTION=mysql
DB_HOST=localhost                   # on shared hosting it is usually localhost
DB_PORT=3306
DB_DATABASE=youruser_winehouse
DB_USERNAME=youruser_wh
DB_PASSWORD=<the password from step 1>

SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database
FILESYSTEM_DISK=local
```

## 5. Initialise the app (SSH, inside `~/winehouse-be`)

```bash
php artisan key:generate          # writes APP_KEY into .env
php artisan migrate --force      # creates all tables
php artisan db:seed --force      # creates the admin account (once)
php artisan storage:link         # public/storage -> storage/app/public (uploads)
php artisan config:cache && php artisan route:cache
```

Sanity checks:
- `https://api.your-domain.gr/up` → shows an "OK" page.
- `https://api.your-domain.gr/api/posts` → `[]` (empty JSON list).

## 6. Upload the frontend

```bash
# locally, in winehouse-site/
npm run build
```

Upload **the contents of** `dist/winehouse-site/browser/` into `public_html/`
(the provided `.htaccess` handles HTTPS redirect + page routing).

## 7. First login & lock-down

1. Go to `https://your-domain.gr/admin/login`, sign in with `ADMIN_EMAIL` /
   `ADMIN_PASSWORD`.
2. Immediately go to **Settings → Change password** and set a real password.
3. Remove `ADMIN_PASSWORD` from the `.env` on the host (it is only used by the
   seeder).

## 8. Updating later

- **Frontend change:** `npm run build`, re-upload `dist/winehouse-site/browser/`.
- **Backend change:** `git pull` (or re-upload), then
  `php artisan migrate --force && php artisan config:cache && php artisan route:cache`.
- **Content (posts/pages/images):** no deploy needed — done in the dashboard.

## Troubleshooting

| Symptom | Fix |
|---|---|
| 500 on every API call | `.env` missing/wrong, or `storage/` not writable → `chmod -R 775 storage bootstrap/cache` |
| Uploads fail > 2 MB | cPanel → MultiPHP INI Editor → `upload_max_filesize=12M`, `post_max_size=12M` |
| Images upload but don't display | re-run `php artisan storage:link`; verify the subdomain document root points at `winehouse-be/public` |
| Dashboard says "Could not reach the server" | the `api.` subdomain isn't set up / has no SSL, or `/api/posts` errors — test it directly in the browser |
| Changed `.env` but nothing happens | `php artisan config:cache` again (config is cached in production) |
