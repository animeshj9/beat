export const categories = {
  roads: {
    label: "Roads & traffic",
    icon: "git-branch-outline",
    color: "#BB5629",
  },
  transit: {
    label: "Metro & transit",
    icon: "train-outline",
    color: "#5E6CAA",
  },
  business: {
    label: "New businesses",
    icon: "storefront-outline",
    color: "#AE783D",
  },
  construction: {
    label: "Construction",
    icon: "construct-outline",
    color: "#927346",
  },
  civic: { label: "Civic works", icon: "business-outline", color: "#647B68" },
  utilities: { label: "Utilities", icon: "flash-outline", color: "#9A7B36" },
  schools: { label: "Schools", icon: "school-outline", color: "#657CA1" },
  health: { label: "Healthcare", icon: "medical-outline", color: "#AD6270" },
  parks: { label: "Public spaces", icon: "leaf-outline", color: "#487961" },
  offices: { label: "Offices", icon: "briefcase-outline", color: "#657480" },
  events: { label: "Local events", icon: "calendar-outline", color: "#977192" },
};
export const starterPlaces = [
  {
    id: "financial-district",
    name: "Financial District",
    label: "Hyderabad, Telangana · 500032",
    latitude: 17.4215,
    longitude: 78.3405,
    radius: 5,
  },
  {
    id: "lynnwood",
    name: "Lynnwood",
    label: "Washington, USA",
    latitude: 47.824,
    longitude: -122.259,
    radius: 5,
  },
];
export function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dlat = rad(b.latitude - a.latitude),
    dlon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
/** @param {any[]} events @param {any[]} places @param {{ hidden?: string[], category?: string, since?: string, now?: number }} options */
export function rankFeed(
  events,
  places,
  { hidden = [], category = "all", since = "", now = Date.now() } = {},
) {
  return events
    .filter(
      (e) =>
        !hidden.includes(e.id) &&
        (category === "all" || e.category === category) &&
        (!since || e.detectedAt > since),
    )
    .map((e) => {
      const matches = places
        .map((p) => ({ ...p, distance: distanceKm(p, e) }))
        .filter((p) => p.distance <= p.radius)
        .sort((a, b) => a.distance - b.distance);
      if (!matches.length) return null;
      const ageDays = Math.max(0, (now - Date.parse(e.detectedAt)) / 86400000);
      return {
        ...e,
        place: matches[0],
        distance: matches[0].distance,
        score:
          (1 / (1 + matches[0].distance)) *
          e.significance *
          e.confidence *
          (1 / (1 + ageDays / 14)),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}
export function safeSourceUrl(url) {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(u.hostname)
    );
  } catch {
    return false;
  }
}
