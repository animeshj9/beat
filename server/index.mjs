import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createStore } from "./store.mjs";
import { coordinates } from "./validation.mjs";
import { discover } from "./discovery.mjs";
export function authorized(header, token) {
  if (!token || !header) return false;
  const a = Buffer.from(header),
    b = Buffer.from(`Bearer ${token}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function createServer(store) {
  let searching = false,
    lastSearch = 0,
    ingesting = false;
  const cache = new Map();
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (
      origin &&
      origin === (process.env.CORS_ORIGIN || "http://localhost:8081")
    ) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Content-Type", "application/json");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const send = (status, data) => {
      res.writeHead(status);
      res.end(JSON.stringify(data));
    };
    const url = new URL(req.url, "http://localhost");
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      send(204, {});
      return;
    }
    try {
      if (req.method === "GET" && url.pathname === "/health") {
        send(200, {
          ok: true,
          discoveryConfigured: !!process.env.OPENAI_API_KEY,
        });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/feed") {
        let place;
        try {
          place = coordinates(
            url.searchParams.get("lat"),
            url.searchParams.get("lon"),
            url.searchParams.get("radius"),
          );
        } catch (e) {
          send(400, { error: e.message });
          return;
        }
        const events = await store.nearby(place);
        send(200, { events, generatedAt: new Date().toISOString() });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/places") {
        const q = (url.searchParams.get("q") || "").trim();
        if (q.length < 2 || q.length > 200) {
          send(400, { error: "Search must be 2–200 characters" });
          return;
        }
        if (cache.has(q)) {
          send(200, { places: cache.get(q) });
          return;
        }
        if (searching || Date.now() - lastSearch < 1100) {
          send(429, { error: "Please wait a moment before searching again" });
          return;
        }
        searching = true;
        lastSearch = Date.now();
        try {
          const remote = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`,
            {
              headers: {
                "User-Agent": "Beat/0.1 (https://github.com/animeshj9/beat)",
                "Accept-Language": "en",
              },
              signal: AbortSignal.timeout(10000),
            },
          );
          if (!remote.ok) throw new Error("Geocoder unavailable");
          const data = await remote.json();
          const places = data.map((p) => ({
            id: `osm-${p.osm_type}-${p.osm_id}`,
            name: p.name || p.display_name.split(",")[0],
            label: p.display_name,
            latitude: Number(p.lat),
            longitude: Number(p.lon),
            radius: 5,
          }));
          if (cache.size >= 1000) cache.delete(cache.keys().next().value);
          cache.set(q, places);
          send(200, { places, attribution: "© OpenStreetMap contributors" });
        } finally {
          searching = false;
        }
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/discover") {
        if (!authorized(req.headers.authorization, process.env.INGEST_TOKEN)) {
          send(401, { error: "A server-side ingest token is required" });
          return;
        }
        if (ingesting) {
          send(409, { error: "Discovery already running" });
          return;
        }
        let place;
        try {
          place = {
            ...coordinates(
              url.searchParams.get("lat"),
              url.searchParams.get("lon"),
              url.searchParams.get("radius"),
            ),
            name: (
              url.searchParams.get("name") || "Selected neighbourhood"
            ).slice(0, 150),
          };
        } catch (e) {
          send(400, { error: e.message });
          return;
        }
        ingesting = true;
        try {
          send(200, await discover(place, store));
        } finally {
          ingesting = false;
        }
        return;
      }
      send(404, { error: "Not found" });
    } catch (e) {
      console.error("Request failed:", e.message);
      send(503, {
        error: "Service temporarily unavailable. Please try again.",
      });
    }
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const store = await createStore();
  const server = createServer(store);
  const port = Number(process.env.PORT || 8787);
  server.listen(port, process.env.HOST || "127.0.0.1", () =>
    console.log(
      `Beat API listening on ${process.env.HOST || "127.0.0.1"}:${port}`,
    ),
  );
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () =>
      server.close(async () => {
        await store.close();
        process.exit(0);
      }),
    );
}
