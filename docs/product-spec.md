# Hyperlocal Change Feed — Product Spec

## Working idea

A mobile-first, India-first app that answers one question:

> **What changed around the places I care about?**

Users add a location — current location, address, PIN code, neighborhood, or city — and get a personalized feed of meaningful local changes.

Think:

**Inshorts × Google Maps × Git diff for the real world**

The product is not primarily a local-news app or social network. Its core unit is a **state change**:

- a road opens or closes
- construction progresses
- a new business appears
- a civic project is announced
- a school/hospital/store opens
- a project gets delayed
- litigation changes
- a transit route changes
- a neighborhood issue emerges
- a major office/employer opens nearby

The app should answer:

> **What is different here since the last time I checked?**

---

## Target audience

Initial focus: urban India.

Users who care about what is changing around:

- their home
- office
- parents' home
- child's school
- investment property
- hometown
- future home / booked apartment

India is especially suited to this because local information is fragmented across:

- news sites
- government notices
- municipal pages
- social media
- real-estate sites
- maps/listings
- local YouTube
- court records
- developer updates
- neighborhood groups

The app turns this fragmented information into a single local change feed.

---

## Product principles

### 1. Changes, not content

Do not show something merely because it mentions the location.

A hundred articles saying "Hyderabad real estate is booming" should create zero cards.

A newly notified 100-foot road 800 m from the user's house should create one card.

### 2. Distance is first-class

Every event should be translated into the user's geography.

Examples:

- 450 m from home
- 6 min walk
- 1.8 km from office
- near your child's school
- on your commute

### 3. AI creates the initial feed

Do not depend on user-generated content for MVP.

The system discovers, clusters, verifies, summarizes, and ranks local changes.

Human posts can later become another signal/source.

### 4. Trust matters

Every card should expose:

- source(s)
- confidence
- date detected
- event location
- what changed

Avoid unsupported AI-generated claims.

### 5. Mobile behavior should feel familiar

Open app → scan cards → swipe/scroll → inspect map/source → save/follow → leave.

No need to teach users a new interaction model.

---

# MVP

## Platforms

Mobile-first.

Preferred initial stack:

- React Native
- Expo
- Android first
- iOS from the same codebase

A web version can come later for sharing, SEO, and desktop exploration.

---

## First-run experience

1. Open app.
2. Ask: **"What's happening around you?"**
3. User can:
   - use current location
   - search an address
   - enter PIN code
   - search neighborhood/city
4. Pick radius:
   - 2 km
   - 5 km
   - 10 km
5. Generate initial feed immediately.
6. Ask user to save the location after they see value.

Login should not block first use.

Later login options:

- Google
- Apple
- phone number

---

# Core screens

## 1. For You

Merged feed across all saved locations and interests.

Example saved locations:

- Home
- Office
- Parents
- Hometown
- Investment property

Header:

> **7 meaningful changes since your last visit**

---

## 2. Nearby

Uses current physical location.

Shows changes around where the user is right now.

---

## 3. Map

Map view of recent changes.

Pins should correspond to feed events.

Filter by:

- distance
- time
- category
- significance

---

# Feed card

Each card should contain:

- headline
- short summary
- distance
- time detected
- category
- "What changed"
- confidence
- source count
- map action
- source action

Example:

## New road connection proposed near Financial District

A new municipal proposal references a road link between the High Fields side and the Myscape corridor.

**1.2 km from Home**

### What changed

```diff
- No active proposal found in previous crawl
+ New municipal proposal surfaced
```

**Confidence:** High
**Sources:** 3

Actions:

- View on map
- View sources
- Follow this
- More like this
- Not useful

---

# Initial categories

India-first taxonomy:

- Roads & Traffic
- Metro & Transit
- New Businesses
- Construction & Real Estate
- Government & Civic Works
- Utilities
- Schools
- Hospitals & Healthcare
- Parks & Public Spaces
- Neighborhood Issues
- Major Offices / Employers
- Local Events

Avoid trying to support everything at launch.

---

# Feed generation

The core pipeline:

```text
Location
  ↓
Generate local search queries
  ↓
Search / ingest sources
  ↓
Extract candidate events
  ↓
Geocode entities/events
  ↓
Compare with known local state
  ↓
Detect actual changes
  ↓
Cluster duplicate reporting
  ↓
Estimate confidence
  ↓
Rank for user
  ↓
Generate feed cards
```

---

# Core concept: local world state

For each tracked location, maintain a lightweight evolving model of the nearby world.

Example:

```text
Place: Financial District, Hyderabad
Radius: 5 km

Entities:
- roads
- buildings
- developments
- businesses
- schools
- parks
- government projects
- transit
- major employers

Known state:
- project status
- road status
- business open/closed
- construction milestone
- proposal status
- litigation status
- opening date
- closure date
```

Every new crawl asks:

> What evidence exists now that changes our understanding of this local state?

---

# Event schema

Possible event object:

```json
{
  "id": "event_123",
  "location_id": "place_456",
  "title": "New road connection proposed",
  "summary": "...",
  "category": "roads",
  "latitude": 17.42,
  "longitude": 78.34,
  "detected_at": "2026-09-30T10:00:00Z",
  "effective_date": null,
  "old_state": "No known proposal",
  "new_state": "Municipal proposal identified",
  "confidence": 0.91,
  "significance": 0.82,
  "source_ids": ["src_1", "src_2"],
  "entity_ids": ["road_1"]
}
```

---

# Ranking

Do not rank purely chronologically.

Initial scoring concept:

```text
Feed score =
  proximity
  × significance
  × novelty
  × confidence
  × user-interest score
```

Examples:

A restaurant opening 8 km away:
low score.

A road project 1 km from home:
high score.

A major office campus 4 km away:
possibly high score.

Over time, learn user interests from:

- opens
- saves
- follows
- hides
- category preferences
- location preferences

---

# Sources

MVP can use search as the crawler.

Potential source classes:

- web search
- local news
- municipal/government websites
- state government notices
- tenders
- court records
- real-estate developer pages
- property portals
- Google/Maps-style business listings
- Reddit
- public social posts
- YouTube
- local blogs
- traffic/road closure sources

Later:

- satellite imagery
- street imagery
- direct municipal APIs
- crowdsourced reports

---

# Search strategy

For each location, generate multiple targeted searches rather than one generic query.

Examples:

```text
"Financial District Hyderabad road"
"Nanakramguda road widening"
"Financial District new restaurant"
"Nanakramguda GHMC"
"Financial District HMDA"
"Financial District construction"
"Financial District school opening"
"Financial District office opening"
```

Also generate searches for known entities already being tracked.

The system should persist previous search findings so it can detect changes rather than rediscover the same news.

---

# Notifications

Not needed for the earliest prototype, but likely important.

Notifications should be sparse and event-driven.

Examples:

> Road closure 900 m from Home

> New grocery store appears to be opening 6 minutes' walk away

> Construction progress detected near your saved property

Users control categories and locations.

Avoid generic engagement notifications.

---

# Social / UGC

Do NOT build initially:

- comments
- followers
- public profiles
- DMs
- posting feed
- neighborhood chat

Longer-term, users may submit:

- photos
- observations
- corrections
- local tips

These should feed the change-detection system rather than turning the product into another neighborhood message board.

---

# Tech direction

Suggested MVP stack:

## Client
- React Native
- Expo
- TypeScript

## Backend
- Node.js / TypeScript or Python
- REST or lightweight GraphQL API

## Data
- PostgreSQL
- PostGIS

PostGIS is important because geography is fundamental.

## AI
Use LLMs for:

- query generation
- event extraction
- duplicate clustering
- state comparison
- summarization
- relevance classification

Do not use LLMs as the system of record.

Store evidence and structured state separately.

---

# Suggested core tables

- users
- saved_locations
- location_preferences
- entities
- entity_states
- events
- event_sources
- sources
- feed_impressions
- user_feedback
- crawl_runs

---

# Dogfood locations

Build the first version around two real locations.

## 1. Financial District / Nanakramguda, Hyderabad

Track:

- roads
- new commercial projects
- civic projects
- walkability changes
- new businesses
- real-estate construction
- major office campuses
- traffic/infrastructure
- Myscape / SOTS / surrounding development

## 2. Lynnwood, Washington

Track the neighborhood around the user's former home.

Track:

- nearby development
- demolitions
- townhouse/apartment construction
- road projects
- businesses
- zoning / planning changes

These two locations give very different source environments and make a good initial test.

---

# Evaluation

The product is working if the user starts opening it instead of repeatedly asking:

- "Anything new around Financial District?"
- "What happened with that road?"
- "Anything being built near my house?"
- "Any local development news?"
- "What's changed since last week?"

Initial evaluation should focus on:

### Precision
Are feed cards actually meaningful changes?

### Novelty
Does the feed avoid repeating old information?

### Locality
Is the event genuinely relevant to the chosen geography?

### Trust
Can the claim be traced back to evidence?

### Usefulness
Would the user have wanted to know this?

---

# Non-goals for MVP

Do not build yet:

- full social network
- user posting
- comments
- messaging
- desktop-first web app
- advertising
- complex recommendation ML
- large-scale crawling infrastructure
- nationwide coverage
- native Kotlin + Swift apps
- broad breaking-news feed

---

# First build milestone

A usable prototype should let a user:

1. Open the Android app.
2. Add Financial District, Hyderabad.
3. Select a radius.
4. Generate a feed.
5. See 10–20 meaningful local change cards.
6. Open a card.
7. See the event on a map.
8. Inspect sources.
9. Mark it useful/not useful.
10. Refresh later and see only newly detected changes.

Then repeat for Lynnwood.

If this is genuinely useful for these two locations, expand outward.

---

# Core product sentence

> **A personalized feed of what changed around the places you care about.**

Alternative framing:

> **Git diff for the real world.**

Consumer framing:

> **Inshorts for your neighborhood — but only when something actually changes.**

---

# Immediate next step for Work

Start by building a thin end-to-end prototype rather than polishing the full architecture.

Recommended order:

1. Scaffold React Native / Expo app.
2. Build location onboarding.
3. Create feed UI.
4. Add Postgres/PostGIS backend.
5. Define event + source schemas.
6. Build one AI-assisted discovery pipeline.
7. Populate Financial District.
8. Add Lynnwood.
9. Add refresh/change detection.
10. Add feedback signals.
11. Test whether the feed is useful enough to open daily.
