import { demoEvents } from "./demo";
import type { Change, Place } from "./types";
export const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(
  /\/$/,
  "",
);
export const isDemo = !apiUrl;
const sampleFeed = demoEvents();
async function get(path: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch(`${apiUrl}${path}`, { signal: controller.signal });
    if (!r.ok) throw new Error(`Server returned ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}
export async function fetchFeed(places: Place[]): Promise<Change[]> {
  if (isDemo) return sampleFeed;
  const results = await Promise.all(
    places.map((p) =>
      get(`/api/feed?lat=${p.latitude}&lon=${p.longitude}&radius=${p.radius}`),
    ),
  );
  return [
    ...new Map<string, Change>(
      results.flatMap((r) => r.events).map((e: Change) => [e.id, e]),
    ).values(),
  ];
}
export async function searchPlaces(query: string): Promise<Place[]> {
  const r = await get(`/api/places?q=${encodeURIComponent(query)}`);
  return r.places;
}
