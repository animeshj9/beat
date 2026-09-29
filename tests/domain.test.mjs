import test from "node:test";
import assert from "node:assert/strict";
import { distanceKm, rankFeed, safeSourceUrl } from "../src/domain.mjs";
import { coordinates, validateCandidate } from "../server/validation.mjs";
import { sqliteStore } from "../server/store.mjs";
import { citedUrls } from "../server/discovery.mjs";
const home = { latitude: 17.42, longitude: 78.34, radius: 5 };
const source = {
  title: "Road notice",
  url: "https://example.org/notices/123",
  publishedAt: new Date().toISOString(),
  excerpt: "A new road connection has been formally approved.",
};
const event = {
  id: "one",
  entityId: "Hyderabad Road One",
  title: "A road gets approval",
  summary: "The connecting road has been approved.",
  category: "roads",
  ...home,
  newState: "Approved",
  confidence: 0.9,
  significance: 0.8,
  detectedAt: new Date().toISOString(),
  sources: [source],
};
test("distance uses actual geography", () => {
  assert.equal(distanceKm(home, home), 0);
  assert.ok(distanceKm(home, { latitude: 17.43, longitude: 78.34 }) > 1);
});
test("ranks within radius, deduplicates matching places and excludes hidden changes", () => {
  const far = { ...event, id: "far", latitude: 18 };
  assert.equal(rankFeed([event, far], [home, home]).length, 1);
  assert.equal(rankFeed([event], [home], { hidden: ["one"] }).length, 0);
});
test("category and last-visit filtering work together", () => {
  assert.equal(rankFeed([event], [home], { category: "parks" }).length, 0);
  assert.equal(rankFeed([event], [home], { since: "2099-01-01" }).length, 0);
});
test("invalid coordinates or unsupported radius rejected", () => {
  assert.throws(() => coordinates(null, 78, 5));
  assert.throws(() => coordinates(91, 78, 5));
  assert.throws(() => coordinates(17, 78, 100));
  assert.deepEqual(coordinates("17", "78", "5"), {
    latitude: 17,
    longitude: 78,
    radius: 5,
  });
});
test("source URLs only permit public HTTPS links", () => {
  assert.equal(safeSourceUrl("javascript:alert(1)"), false);
  assert.equal(safeSourceUrl("https://127.0.0.1/x"), false);
  assert.equal(safeSourceUrl(source.url), true);
});
test("discovery accepts evidence-backed local events, rejects invented sources and distant events", () => {
  const urls = new Set([source.url]);
  assert.equal(validateCandidate(event, home, urls), true);
  assert.equal(validateCandidate(event, home, new Set()), false);
  assert.equal(
    validateCandidate({ ...event, latitude: 40 }, home, urls),
    false,
  );
  assert.equal(
    validateCandidate({ ...event, confidence: NaN }, home, urls),
    false,
  );
  assert.equal(validateCandidate({ ...event, sources: [] }, home, urls), false);
});
test("provider citation extraction supports both annotations and search sources", () => {
  const result = {
    output: [
      { action: { sources: [{ url: "a" }] } },
      { content: [{ annotations: [{ type: "url_citation", url: "b" }] }] },
    ],
  };
  assert.deepEqual([...citedUrls(result)], ["a", "b"]);
});
test("persistent states suppress repeat stories and remember previous evidence", async () => {
  const db = sqliteStore(":memory:");
  try {
    const first = await db.put(event);
    assert.ok(first);
    assert.match(first.oldState, /Previously untracked/);
    assert.equal(await db.put({ ...event, newState: "Approved!" }), null);
    const next = await db.put({ ...event, newState: "Under construction" });
    assert.equal(next.oldState, "Approved");
    assert.equal((await db.nearby(home)).length, 2);
    const reversed = await db.put({ ...event, newState: "Approved" });
    assert.ok(reversed);
    assert.equal(reversed.oldState, "Under construction");
    assert.equal(await db.put({ ...event, newState: "Approved" }), null);
    assert.equal((await db.nearby({ ...home, latitude: 40 })).length, 0);
  } finally {
    await db.close();
  }
});

test("stale and future evidence is not published", () => {
  const urls = new Set([source.url]);
  assert.equal(
    validateCandidate(
      { ...event, sources: [{ ...source, publishedAt: "2020-01-01" }] },
      home,
      urls,
    ),
    false,
  );
  assert.equal(
    validateCandidate(
      { ...event, sources: [{ ...source, publishedAt: "2099-01-01" }] },
      home,
      urls,
    ),
    false,
  );
});
test("SQLite survives closing and reopening the store", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "beat-test-")),
    file = join(dir, "store.sqlite");
  let db = sqliteStore(file);
  try {
    await db.put(event);
    await db.close();
    db = sqliteStore(file);
    assert.equal((await db.nearby(home)).length, 1);
    assert.equal(await db.put(event), null);
  } finally {
    await db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
