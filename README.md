# Beat

**What changed around the places you care about?**

An India-first neighbourhood change feed for Android and iPhone, built with React Native, Expo and TypeScript. Start in Financial District, Hyderabad or Lynnwood, Washington. Add other places using address, neighbourhood or PIN-code search when connected to the API.

## Run the app

Use Node.js 24 or later.

```sh
npm ci
npm start
```

Scan the QR code with an Expo Go version compatible with SDK 57. A physical Android or iOS device and the development computer need a reachable network connection. `npm run android` / `npm run ios` can launch an installed emulator; iOS simulator builds require macOS. `npm run web` opens the same React Native app for browser review.

Without `EXPO_PUBLIC_API_URL`, Beat runs in **clearly labelled sample mode**. The 12 fictional cards per dogfood location demonstrate the interaction, not real reporting. No login, secrets or backend are needed for that mode. It never silently falls back to fictional news when the live API fails.

## What works

- Location onboarding, 2/5/10 km radius and optional foreground GPS.
- For You, Nearby, Map and Saved views; multiple saved places and category filters.
- Distance / significance / recency / confidence ranking, and new-since-last-visit filtering.
- State-change cards, evidence detail, source links and external maps.
- Native map pins; browser map plus an event list.
- Saved stories, entity follows, useful / not useful feedback and preferences on-device.
- Cached feed for offline viewing; clear loading, empty, denied-location and network-error states.
- Node API, durable SQLite storage and an optional PostgreSQL/PostGIS adapter.
- Search-backed discovery with structured extraction, citation allowlisting, freshness and geographic validation, state tracking and repeat suppression.
- CI checks and Expo export; EAS profiles for an Android preview APK and store builds.

## Connect live discovery

```sh
cp .env.example .env
```

Configure these values in `.env`:

```dotenv
OPENAI_API_KEY=your-server-side-key
OPENAI_MODEL=gpt-5.4
INGEST_TOKEN=your-long-random-admin-token
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:8787
HOST=0.0.0.0
```

The model is configurable; use a model available to your project that supports Responses, web search and structured outputs. Never put API keys or the ingest token in an `EXPO_PUBLIC_` variable. `.env` is ignored by Git. `HOST=0.0.0.0` is for trusted local-device testing; use HTTPS and a reverse proxy for a hosted service.

In separate terminals:

```sh
npm run api
npm run crawl
npm start -- --clear
```

`crawl` researches both dogfood locations and persists new evidence-backed changes. It makes two model calls per location and incurs provider usage charges. No paid requests happen when the app starts or refreshes. Schedule the CLI on your backend when ready; scheduling is not enabled by this repository. For another location, an operator can call the protected `POST /api/discover` endpoint. The public client refreshes stored discoveries only.

A first live run can yield fewer than 10 cards, including zero. Weak or absent evidence is not padded with invented changes. Existing states are retained between runs. The first observation says “Previously untracked”; it does not pretend the entity previously did not exist.

## API

| Route | Purpose |
| --- | --- |
| `GET /health` | Health and discovery configuration status |
| `GET /api/feed?lat=17.4215&lon=78.3405&radius=5` | Stored events within radius |
| `GET /api/places?q=500032` | Rate-limited, cached OpenStreetMap search |
| `POST /api/discover?lat=17.4215&lon=78.3405&radius=5&name=Financial%20District` | Run discovery; requires `Authorization: Bearer <INGEST_TOKEN>` |

Place search uses Nominatim with explicit user submission, server-side caching, attribution and at most one request per second. Do not use the public geocoder for large-scale production traffic; use a paid or self-hosted geocoder before scaling. The device never sends GPS in the background.

## PostgreSQL / PostGIS

The default SQLite store lets the prototype run without provisioning a database. For spatial indexing in a hosted deployment:

```sh
POSTGRES_PASSWORD=choose-a-local-password docker compose up -d
```

Set `DATABASE_URL=postgresql://beat:YOUR_PASSWORD@localhost:5432/beat`. The Compose database initializes `server/schema.sql`; run that migration explicitly for an existing database. PostGIS uses geography points, metre-based `ST_DWithin` queries, a GiST index and transactional per-entity writes. SQLite is a separate prototype store: existing SQLite rows are not automatically migrated.

## Android APK and iOS

```sh
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

Set a package-restricted `GOOGLE_MAPS_API_KEY` in the EAS build environment for native Android maps. Preview creates an installable APK. EAS will link the project to your Expo account on first use. iOS device/store distribution needs Apple signing credentials and an appropriate developer account. No signed APK/IPA or store release is included in this commit.

## Checks

```sh
npm run check
EXPO_OFFLINE=1 npx expo export --platform all
```

Tests cover geographic filtering, feed ranking, source validation, stale evidence, state transitions, repeat suppression and API access/validation. Bundling is distinct from a device or signed-binary test.

## Prototype boundaries

Live discovery must be configured and its factual quality assessed before launch. Source URL validation establishes provenance, not independent fact verification. Confidence is a model estimate. Entity resolution is model-assisted and exact normalised-state matching, not comprehensive semantic deduplication. The app has no account sync, background notifications, UGC or automatic nationwide discovery. Feedback and follows stay on the device; follows highlight matching entities, not push alerts. A public service will need abuse controls, budgets, observability, geocoder capacity and a retention policy. The PostgreSQL adapter needs integration testing against the deployment database.

See [the product spec](docs/product-spec.md), [architecture](docs/architecture.md) and [privacy notes](docs/privacy.md).

## Installable sample website

The sample app can be installed from a browser on Android and iPhone. `npm run build:pwa` builds it, and `npm run check:pwa` validates the installation and offline assets. GitHub Actions checks pull requests and deploys the tested `main` artifact to GitHub Pages, following the existing lab website pipeline. See [deployment and phone installation](docs/installable-alpha.md) for the one-time Pages/DNS setup for `beat.animeshj9.com`.
