import { categories, distanceKm, safeSourceUrl } from "../src/domain.mjs";
export function coordinates(lat, lon, radius) {
  const p = {
    latitude: Number(lat),
    longitude: Number(lon),
    radius: Number(radius),
  };
  if (
    lat == null ||
    lon == null ||
    !Number.isFinite(p.latitude) ||
    Math.abs(p.latitude) > 90 ||
    !Number.isFinite(p.longitude) ||
    Math.abs(p.longitude) > 180 ||
    ![2, 5, 10].includes(p.radius)
  )
    throw new Error(
      "A valid latitude, longitude and radius (2, 5 or 10 km) are required",
    );
  return p;
}
export function validateCandidate(e, place, evidenceUrls, now = Date.now()) {
  if (
    !e ||
    !categories[e.category] ||
    !Number.isFinite(e.latitude) ||
    !Number.isFinite(e.longitude) ||
    Math.abs(e.latitude) > 90 ||
    Math.abs(e.longitude) > 180
  )
    return false;
  if (
    distanceKm(place, e) > place.radius ||
    !Number.isFinite(e.confidence) ||
    e.confidence < 0.65 ||
    e.confidence > 1 ||
    !Number.isFinite(e.significance) ||
    e.significance < 0 ||
    e.significance > 1
  )
    return false;
  if (
    !["entityId", "title", "summary", "newState"].every(
      (k) =>
        typeof e[k] === "string" &&
        e[k].trim().length > 2 &&
        e[k].length <= 2000,
    )
  )
    return false;
  if (
    !Array.isArray(e.sources) ||
    e.sources.length === 0 ||
    e.sources.length > 8
  )
    return false;
  if (
    !e.sources.some(
      (s) =>
        s.publishedAt &&
        Date.parse(s.publishedAt) >= now - 30 * 86400000 &&
        Date.parse(s.publishedAt) <= now + 86400000,
    )
  )
    return false;
  return e.sources.every(
    (s) =>
      typeof s.title === "string" &&
      s.title.length &&
      typeof s.excerpt === "string" &&
      s.excerpt.length >= 15 &&
      safeSourceUrl(s.url) &&
      evidenceUrls.has(s.url) &&
      (!s.publishedAt ||
        (Number.isFinite(Date.parse(s.publishedAt)) &&
          Date.parse(s.publishedAt) <= now + 86400000)),
  );
}
export function normalizeState(value) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
