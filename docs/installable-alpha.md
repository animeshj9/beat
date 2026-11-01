# Installable sample alpha

Beat uses the live lab hosting pattern: GitHub → Cloudflare Workers Builds → a Worker on a custom domain. GitHub Actions independently checks changes. Beat has its own `beat` Worker; the existing `animeshj9-lab-subdomains` Worker is not changed.

The app is an installable website with fictional sample stories, not an APK. It needs no Expo account, backend or provider API keys. The GitHub repository can be private; Cloudflare's GitHub app must have access to it. The deployed sample website is publicly accessible unless separate access control is added.

## One-time Cloudflare setup

In Cloudflare, choose **Workers & Pages → Create application → connect/import a Git repository** (labels may vary). Use the Worker flow, not a Pages project. Select `animeshj9/beat`, granting the Cloudflare GitHub app access if necessary.

Configure:

| Setting | Value |
| --- | --- |
| Worker/project name | `beat` (must match `wrangler.jsonc`) |
| Production branch | `main` |
| Root directory | Repository root (`/`) |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npm run deploy:worker` |
| Dependency install | `npm ci` if customizable; otherwise Cloudflare's npm lockfile-based install |
| Build variable | `NODE_VERSION=24` (`.node-version` also records Node 24) |

Disable non-production branch builds/preview deployments for this alpha. No custom preview deployment command is required. Production deployments come from `main`. The build command runs typechecking, tests, a fresh sample web export and PWA validation before the deploy command can run. Builds use the pinned Wrangler in `package-lock.json`. Cloudflare manages its GitHub build/deployment credentials; do not add a Cloudflare token to the app or its `EXPO_PUBLIC_` variables.

`wrangler.jsonc` binds only `beat.animeshj9.com`; Cloudflare manages its DNS and HTTPS certificate. If a `beat` CNAME pointing to `animeshj9.github.io` was added for the previous GitHub Pages setup, remove only that obsolete record before the first deployment. Do not modify the root or any other app's Worker records. If the hostname is owned by a different service, inspect it before removing it. After a successful deployment, verify the custom domain in **Worker → Settings/Domains & Routes**.

In GitHub **Settings → Pages**, unpublish/disable the previous Pages site if one was published, so it does not compete for this domain. The Actions workflow no longer deploys to Pages. This code change does not itself disable an already-published Pages site or create the Cloudflare GitHub connection.

## Pipeline

`.github/workflows/check.yml` runs on pull requests and pushes to `main`, and supports manual dispatch. It installs locked dependencies on Node 24, runs typechecking and tests, exports native bundles, builds the sample PWA, validates its install/offline assets, and performs a Wrangler dry run. A short-lived checked web artifact is retained for inspection. It has read-only repository permissions and no hosting deployment secrets.

Cloudflare Workers Builds independently executes `build:cloudflare`, then `deploy:worker`, for `main`. A green GitHub Actions result alone does not prove deployment succeeded. Cloudflare's checked build blocks deployment on failing tests without relying on the timing of the separate Actions workflow.

The deployed asset directory is `dist/`; server code, environment files and source history are not uploaded. Workers.dev and preview URLs are disabled. `_headers` gives the service worker and HTML explicit cache revalidation.

## Local verification

On Node 24 or later:

```sh
npm ci
npm run build:cloudflare
npm run check:worker
```

Manual deployment from an authenticated Cloudflare session, when needed:

```sh
npx wrangler login
npm run deploy:worker
```

`build:pwa` clears `EXPO_PUBLIC_API_URL` so this release uses sample stories. The web manifest, 192/512-pixel icons, phone-specific installation guidance and versioned service worker are generated into `dist/`. The app shell and bundled assets cache after the first successful online visit. External maps and links need connectivity. Updates activate once existing app windows close.

## Install on your phone

After Cloudflare reports a successful deployment and the custom domain serves HTTPS:

- Android: open https://beat.animeshj9.com in Chrome. Tap **Install Beat**, or use the browser menu → **Add to home screen** → **Install**.
- iPhone: open the address in Safari. Tap **Share** → **Add to Home Screen** → **Add**.

Launch Beat from its home-screen icon. Select Financial District or Lynnwood to explore fictional sample stories. Saved items and preferences stay in that browser/app's local storage. Browser and installed-app storage behavior can differ, especially on iOS. No account synchronization is provided.

## Verification before handoff

Confirm the exact Git commit in Cloudflare's deployment history, HTTPS custom domain, manifest and service-worker responses, phone installation, saved-story persistence and offline relaunch after one completed online load. Automated checks cover manifest/icons, precache paths, offline navigation and external-request isolation; a Wrangler dry run validates the deployment configuration. Actual Cloudflare publication and physical-device installation require separate verification.
