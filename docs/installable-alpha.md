# Installable sample alpha

Beat follows the GitHub Actions → tested artifact → GitHub Pages pipeline used by `animeshj9-web` and `animeshja.in`. It is an installable website with fictional stories, not an APK. It needs no Expo account, backend, API keys or Cloudflare deployment token.

## Pipeline

`.github/workflows/check.yml` runs on pull requests and pushes to `main`, and supports manual dispatch. It installs locked dependencies on Node 24, runs typechecking and tests, verifies Android/iOS bundles, builds the sample PWA, validates its installation/offline assets, and uploads `dist/` as a Pages artifact. Only `main` can deploy, and deployment depends on successful checks. The deploy job uses GitHub's built-in token with `pages:write` and `id-token:write`; pull-request checks have read-only repository permissions. Production deployments are serialized.

The deploy job publishes the exact checked artifact, without rebuilding or uploading the server code. The `github-pages` environment shows its deployment URL and can carry owner-configured protection rules.

## One-time setup

1. In `animeshj9/beat` → Settings → Pages, select **GitHub Actions** as the build/deployment source. GitHub Pages for a private repository requires an eligible GitHub plan. The repository may remain private; the sample website will be publicly accessible unless separate access control is configured.
2. Set **Custom domain** to `beat.animeshj9.com` in Pages settings. The build includes a matching `CNAME`, but Actions deployments still require the Pages custom-domain setting.
3. At the DNS provider for `animeshj9.com`, create the `beat` CNAME pointing to `animeshj9.github.io`. Inspect any existing `beat` record before replacing it; do not change the root domain or other app records. For Cloudflare DNS, start with DNS-only while GitHub validates the domain and provisions its certificate.
4. After GitHub verifies DNS and provisions the certificate, enable **Enforce HTTPS**.
5. Merge the pipeline changes to `main` or dispatch the workflow from `main`. Confirm the Pages deployment succeeds before sharing the URL.

Do not reuse the lab's `project_id` or deploy Beat through its owner-dashboard Worker. Its Cloudflare migration is distinct from its checked-in GitHub Pages production pipeline. Adya and Isha Yoga Teachers use Azure Static Web Apps instead; their Azure deployment tokens are not needed here.

## Local build

On Node 24 or later:

```sh
npm ci
npm run check
npm run build:pwa
npm run check:pwa
```

`build:pwa` clears `EXPO_PUBLIC_API_URL` so this release uses sample stories. The generated `dist/` includes a web manifest, 192/512-pixel icons, phone-specific installation guidance, a versioned service worker and custom-domain metadata. The app shell and bundled assets cache after the first successful online visit. External maps and links need connectivity. Updates activate once existing app windows close.

## Install on your phone

After deployment and HTTPS verification:

- Android: open https://beat.animeshj9.com in Chrome. Tap **Install Beat**, or use the browser menu → **Add to home screen** → **Install**.
- iPhone: open the address in Safari. Tap **Share** → **Add to Home Screen** → **Add**.

Launch Beat from its home-screen icon. Select Financial District or Lynnwood to explore fictional sample stories. Saved items and preferences stay in that browser/app's local storage. Browser and installed-app storage behavior can differ, especially on iOS. No account synchronization is provided.

## Verification before handoff

Check the HTTPS custom domain, manifest and service-worker responses, installation on both phones, saved-story persistence and offline relaunch after one completed online load. Automated checks cover manifest/domain configuration, precache paths, offline navigation fallback and external-request isolation. They do not substitute for physical-device installation testing.
