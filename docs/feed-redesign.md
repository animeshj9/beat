# Immersive local feed

Beat now opens into a dark, mobile-first social reading experience: viewport-sized stories, vertical paging, a useful/save/details rail, location context, and a finite feed counter. Previous/next buttons provide a keyboard-accessible alternative to swiping. Desktop retains a focused 620px reading column. Filters and place management live in dismissible sheets; evidence, follows, feedback, map navigation, and device-only preferences remain available. No backend, authentication, reporting submission, analytics or automatic location request was added.

The sample remains explicitly fictional. This is an image-led reading feed, not a video player or a user-generated social network. It has no invented creators, engagement counts, comments or live badges. Live stories and Lynnwood fixtures use category artwork rather than suggesting a Hyderabad archive photo depicts their location. Hyderabad fixtures reuse one licensed illustrative archive; individual story photography is a future content requirement, not evidence manufactured for these fixtures.

## Photograph

`assets/stories/junction.webp`: [View of service road junction towards Nanakramguda, November 2025](https://commons.wikimedia.org/wiki/File:View_of_service_road_junction_towards_Nanakramguda,_November_2025.jpg), by [Tushar0034](https://commons.wikimedia.org/wiki/User:Tushar0034), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Archive dated 25 November 2025. Reused from the licensed asset in animeshj9-web/footpath-optional. Resized WebP; cropped to fit the UI, no scene edits. It does not substantiate any fictional change. Visible labels and story detail attribution make this distinction.

## Validation

- `npm run check`: TypeScript and 13 domain/API tests.
- `npm run build:cloudflare`: checks, sample web export, manifest/offline-cache validation.
- `EXPO_OFFLINE=1 npx expo export --platform all --output-dir native-dist`: web, Android and iOS bundles. This does not replace native-device QA or signed builds.
- `npm run check:ui`: browser regression suite against an already served build on port 8080. Run `npx playwright install chromium`, then `python3 -m http.server 8080 --directory dist` separately. Override `BEAT_TEST_URL`, `CHROMIUM_PATH`, or `SCREENSHOT_DIR` as needed. The suite uses an isolated browser profile, no live reporting API, and mocked denied geolocation.

Browser checks exercise onboarding, repeated save/unsave and useful actions, story paging, detail/follow/dismissal, Saved empty state, category filters, places dismissal, explicit location denial, installation-help Escape, map scrolling, viewport resizing, and preference restoration. Screenshots cover 390×844, 320×568, and 1440×1000. GitHub CI retains screenshots as `beat-ui-review` for seven days.

Installation help now opens from the header download button instead of covering the first story automatically. Service-worker registration and offline asset caching remain in place.
