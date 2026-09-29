export type Category =
  | "roads"
  | "transit"
  | "business"
  | "construction"
  | "civic"
  | "utilities"
  | "schools"
  | "health"
  | "parks"
  | "offices"
  | "events";
export type Place = {
  id: string;
  name: string;
  label: string;
  latitude: number;
  longitude: number;
  radius: number;
};
export type Source = {
  title: string;
  url: string;
  publishedAt: string | null;
  excerpt: string;
};
export type Change = {
  id: string;
  entityId: string;
  title: string;
  summary: string;
  category: Category;
  latitude: number;
  longitude: number;
  detectedAt: string;
  effectiveDate: string | null;
  oldState: string;
  newState: string;
  confidence: number;
  significance: number;
  sources: Source[];
  sample?: boolean;
};
export type Preferences = {
  places: Place[];
  saved: string[];
  followed: string[];
  hidden: string[];
  useful: string[];
  lastVisit: string;
  onboarded: boolean;
};
