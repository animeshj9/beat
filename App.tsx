import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import {
  categories,
  formatDistance,
  rankFeed,
  starterPlaces,
} from "./src/domain.mjs";
import { fetchFeed, isDemo, searchPlaces } from "./src/api";
import type { Change, Place, Preferences } from "./src/types";
import EventMap from "./src/components/EventMap";

const C = {
  bg: "#F6F4EF",
  ink: "#28382F",
  muted: "#777C73",
  orange: "#DA5C35",
  line: "#E5E5DD",
  white: "#FFFFFF",
  green: "#53755D",
};
const defaults: Preferences = {
  places: [starterPlaces[0]],
  saved: [],
  followed: [],
  hidden: [],
  useful: [],
  lastVisit: "",
  onboarded: false,
};
const storageKey = "beat.preferences.v1";
const feedCacheKey = isDemo ? "beat.sample-feed.v1" : "beat.live-feed.v1";
type Tab = "For you" | "Nearby" | "Map" | "Saved";
const tabs: [Tab, keyof typeof Ionicons.glyphMap][] = [
  ["For you", "layers-outline"],
  ["Nearby", "navigate-outline"],
  ["Map", "map-outline"],
  ["Saved", "bookmark-outline"],
];
function Icon({
  name,
  size = 20,
  color = C.ink,
}: {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
function Button({
  label,
  onPress,
  quiet = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  quiet?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, quiet && s.quiet, disabled && { opacity: 0.45 }]}
    >
      <Text style={[s.buttonText, quiet && { color: C.ink }]}>{label}</Text>
    </Pressable>
  );
}
function AppContent() {
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<Change[]>([]);
  const [tab, setTab] = useState<Tab>("For you");
  const [category, setCategory] = useState("all");
  const [activePlace, setActivePlace] = useState("all");
  const [nearby, setNearby] = useState<Place | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [detail, setDetail] = useState<Change | null>(null);
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [radius, setRadius] = useState(5);
  const [newOnly, setNewOnly] = useState(false);
  const visit = useRef("");
  const request = useRef(0);
  const searchRequest = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (raw) {
          try {
            const p = JSON.parse(raw);
            if (
              Array.isArray(p.places) &&
              p.places.length &&
              p.places.every(
                (x: Place) =>
                  Number.isFinite(x.latitude) && Number.isFinite(x.longitude),
              )
            ) {
              setPrefs({ ...defaults, ...p });
              visit.current = p.lastVisit || "";
            }
          } catch {
            /* recover a corrupt cache */
          }
        }
      })
      .catch(() => setNotice("Your preferences could not be loaded."))
      .then(async () => {
        try {
          const cached = await AsyncStorage.getItem(feedCacheKey);
          if (cached) setEvents(JSON.parse(cached));
        } catch {
          /* A missing cache never blocks first use. */
        }
      })
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (ready)
      AsyncStorage.setItem(
        storageKey,
        JSON.stringify({ ...prefs, lastVisit: new Date().toISOString() }),
      ).catch(() =>
        setNotice("Preferences could not be saved on this device."),
      );
  }, [prefs, ready]);
  const places =
    tab === "Nearby"
      ? nearby
        ? [nearby]
        : []
      : activePlace === "all"
        ? prefs.places
        : prefs.places.filter((p) => p.id === activePlace);
  async function refresh(
    targets: Place[] = [...prefs.places, ...(nearby ? [nearby] : [])],
  ) {
    const id = ++request.current;
    setBusy(true);
    setError("");
    try {
      const data = await fetchFeed(targets);
      if (id === request.current) {
        const merged = [
          ...new Map(
            [...events.filter((e) => prefs.saved.includes(e.id)), ...data].map(
              (e) => [e.id, e],
            ),
          ).values(),
        ];
        setEvents(merged);
        void AsyncStorage.setItem(feedCacheKey, JSON.stringify(merged)).catch(
          () => {},
        );
        setNotice(
          isDemo
            ? "Sample feed refreshed. These are fictional examples."
            : "You’re up to date with the latest discovered changes.",
        );
      }
    } catch {
      if (id === request.current)
        setError(
          "Could not reach Beat. Check your connection and try again. Your saved preferences are safe.",
        );
    } finally {
      if (id === request.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (ready && prefs.onboarded) void refresh();
  }, [ready, prefs.onboarded, JSON.stringify(prefs.places), nearby?.id]);
  function toggle(key: "saved" | "followed" | "hidden" | "useful", id: string) {
    setPrefs((p) => ({
      ...p,
      [key]: p[key].includes(id)
        ? p[key].filter((x) => x !== id)
        : [...p[key], id],
    }));
  }
  async function locate() {
    setBusy(true);
    setSearchError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setSearchError(
          "Location permission is off. Search for an area or choose one below.",
        );
        return;
      }
      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const p: Place = {
        id: `near-${result.coords.latitude.toFixed(3)}-${result.coords.longitude.toFixed(3)}`,
        name: "Current location",
        label: "Your location · stored on this device",
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        radius,
      };
      setNearby(p);
      if (!prefs.onboarded) choosePlace(p);
      else {
        setTab("Nearby");
        setLocationsOpen(false);
      }
    } catch {
      setSearchError(
        "We couldn’t get your location. You can still choose a neighbourhood.",
      );
    } finally {
      setBusy(false);
    }
  }
  function choosePlace(p: Place) {
    setPrefs((prev) => ({
      ...prev,
      onboarded: true,
      places: prev.onboarded
        ? [...prev.places.filter((x) => x.id !== p.id), { ...p, radius }]
        : [{ ...p, radius }],
    }));
    setActivePlace(p.id);
    setLocationsOpen(false);
    setQuery("");
    setResults([]);
    setTab("For you");
  }
  async function search() {
    if (query.trim().length < 2) return;
    const id = ++searchRequest.current;
    setSearching(true);
    setSearchError("");
    const local = starterPlaces.filter((p) =>
      `${p.name} ${p.label}`.toLowerCase().includes(query.toLowerCase()),
    );
    if (isDemo) {
      setResults(local);
      setSearchError(
        local.length
          ? ""
          : "Sample mode covers Financial District and Lynnwood. Connect the API for address and PIN-code search.",
      );
      setSearching(false);
      return;
    }
    try {
      const found = await searchPlaces(query);
      if (id === searchRequest.current) {
        setResults(found);
        if (!found.length)
          setSearchError(
            "No places found. Try a neighbourhood, city, or PIN code.",
          );
      }
    } catch {
      if (id === searchRequest.current)
        setSearchError(
          "Place search is unavailable. Try one of the areas below.",
        );
    } finally {
      if (id === searchRequest.current) setSearching(false);
    }
  }
  const ranked = rankFeed(events, places, {
    hidden: prefs.hidden,
    category,
    since: newOnly ? visit.current : "",
  }) as (Change & { distance: number; place: Place })[];
  const shown =
    tab === "Saved"
      ? events.filter(
          (e) =>
            prefs.saved.includes(e.id) &&
            (category === "all" || e.category === category),
        )
      : ranked;
  const fresh = rankFeed(events, places, {
    hidden: prefs.hidden,
    since: visit.current,
  }).length;
  const mapPlace = places[0] || prefs.places[0];
  function mapEvent(e: Change) {
    setDetail(null);
    setActivePlace(
      prefs.places.find((p) => rankFeed([e], [p]).length)?.id || "all",
    );
    setTab("Map");
  }
  const picker = (
    <View style={{ gap: 20 }}>
      <View>
        <Text style={s.eyebrow}>YOUR WORLD, A LITTLE CLOSER</Text>
        <Text style={s.hero}>What’s happening{"\n"}around you?</Text>
        <Text style={s.subtitle}>
          Follow the places you care about.{"\n"}We’ll find what’s changed.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={locate}
        style={s.locationButton}
      >
        <Icon name="locate-outline" color={C.orange} />
        <Text style={s.bold}>Use my current location</Text>
        {busy && <ActivityIndicator color={C.orange} />}
      </Pressable>
      <View style={s.search}>
        <Icon name="search-outline" color={C.muted} />
        <TextInput
          accessibilityLabel="Search neighbourhood, city or PIN code"
          placeholder="Neighbourhood, city or PIN code"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          style={s.input}
          returnKeyType="search"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search places"
          onPress={search}
        >
          {searching ? <ActivityIndicator /> : <Icon name="arrow-forward" />}
        </Pressable>
      </View>
      {!!searchError && (
        <Text accessibilityRole="alert" style={s.error}>
          {searchError}
        </Text>
      )}
      <View>
        <Text style={s.eyebrow}>HOW FAR SHOULD WE LOOK?</Text>
        <View style={[s.row, { marginTop: 12 }]}>
          {[2, 5, 10].map((r) => (
            <Pressable
              accessibilityRole="button"
              key={r}
              onPress={() => setRadius(r)}
              style={[s.radius, r === radius && s.chipActive]}
            >
              <Text style={[s.bold, r === radius && { color: "white" }]}>
                {r} km
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View>
        <Text style={s.eyebrow}>
          {results.length ? "SEARCH RESULTS" : "START EXPLORING"}
        </Text>
        {(results.length ? results : starterPlaces).map((p) => (
          <Pressable
            accessibilityRole="button"
            key={p.id}
            onPress={() => choosePlace(p)}
            style={s.placeRow}
          >
            <View style={s.placeIcon}>
              <Icon name="location-outline" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.bold}>{p.name}</Text>
              <Text style={s.small}>{p.label}</Text>
            </View>
            <Icon name="arrow-forward" />
          </Pressable>
        ))}
      </View>
      {prefs.onboarded && (
        <View>
          <Text style={s.eyebrow}>YOUR PLACES</Text>
          {prefs.places.map((p) => (
            <View key={p.id} style={s.placeRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.bold}>{p.name}</Text>
                <Text style={s.small}>{p.radius} km radius</Text>
              </View>
              <Pressable
                accessibilityLabel={`Set ${p.name} radius to ${radius} km`}
                onPress={() =>
                  setPrefs((v) => ({
                    ...v,
                    places: v.places.map((x) =>
                      x.id === p.id ? { ...x, radius } : x,
                    ),
                  }))
                }
              >
                <Text style={s.link}>Use {radius} km</Text>
              </Pressable>
              {prefs.places.length > 1 && (
                <Pressable
                  accessibilityLabel={`Remove ${p.name}`}
                  onPress={() => {
                    setPrefs((v) => ({
                      ...v,
                      places: v.places.filter((x) => x.id !== p.id),
                    }));
                    setActivePlace("all");
                  }}
                >
                  <Icon name="close-circle-outline" />
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}
      {!isDemo && results.length > 0 && (
        <Pressable
          accessibilityRole="link"
          onPress={() =>
            Linking.openURL("https://www.openstreetmap.org/copyright")
          }
        >
          <Text style={s.small}>Place search © OpenStreetMap contributors</Text>
        </Pressable>
      )}
      <Text style={s.small}>
        No account needed. Location access is optional.
      </Text>
    </View>
  );
  if (!ready)
    return (
      <View style={s.loading}>
        <ActivityIndicator color={C.orange} />
      </View>
    );
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <View style={s.shell}>
        <View style={s.header}>
          <View style={s.row}>
            <View style={s.logo}>
              <Text style={s.logoText}>b.</Text>
            </View>
            <Text style={s.wordmark}>beat</Text>
          </View>
          <View style={s.row}>
            <View style={s.dot} />
            <Text style={s.tagline}>A little more local.</Text>
          </View>
        </View>
        {!prefs.onboarded ? (
          <ScrollView contentContainerStyle={s.onboarding}>
            {picker}
            <View style={s.introNote}>
              <Icon name="sparkles-outline" color={C.orange} />
              <Text style={[s.small, { flex: 1 }]}>
                {isDemo
                  ? "Explore a sample neighbourhood feed. Every example is labelled; live news comes from connected sources."
                  : "Local changes, with the evidence attached. No noise, no endless scroll."}
              </Text>
            </View>
          </ScrollView>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={s.content}
              refreshControl={
                <RefreshControl
                  refreshing={busy}
                  onRefresh={() => refresh()}
                  tintColor={C.orange}
                />
              }
            >
              <View style={s.topline}>
                <Text style={s.eyebrow}>
                  {tab === "Saved"
                    ? "YOUR READING LIST"
                    : "THE NEIGHBOURHOOD EDIT"}
                </Text>
                <Pressable
                  accessibilityLabel="Manage places"
                  onPress={() => setLocationsOpen(true)}
                  style={s.row}
                >
                  <Icon name="location-outline" size={14} />
                  <Text style={s.small}>
                    {places.length === 1 ? places[0].name : "Your places"}
                  </Text>
                  <Icon name="chevron-down" size={12} />
                </Pressable>
              </View>
              <View style={s.titleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.hero}>
                    {tab === "For you"
                      ? "Closer to what’s\nchanging."
                      : tab === "Nearby"
                        ? "Right around you."
                        : tab === "Map"
                          ? "A sense of place."
                          : "Worth keeping."}
                  </Text>
                  <Text style={s.subtitle}>
                    {tab === "Saved"
                      ? `${shown.length} saved change${shown.length === 1 ? "" : "s"} to come back to.`
                      : isDemo
                        ? "A first look at your neighbourhood feed."
                        : `${fresh} changes since your last visit.`}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Refresh feed"
                  onPress={() => refresh()}
                  style={s.refresh}
                >
                  {busy ? (
                    <ActivityIndicator color={C.orange} />
                  ) : (
                    <Icon name="refresh-outline" color={C.orange} />
                  )}
                </Pressable>
              </View>
              {isDemo && (
                <View style={s.sampleBanner}>
                  <Icon name="flask-outline" size={16} color={C.orange} />
                  <Text style={s.sampleText}>
                    SAMPLE EDITION · Fictional changes, real app.
                  </Text>
                </View>
              )}
              {!!error && (
                <View style={s.errorBox}>
                  <Text accessibilityRole="alert" style={s.error}>
                    {error}
                  </Text>
                  <Button label="Try again" onPress={() => refresh()} quiet />
                </View>
              )}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filters}
              >
                <Pressable
                  onPress={() => setActivePlace("all")}
                  style={[s.chip, activePlace === "all" && s.chipActive]}
                >
                  <Text style={[s.chipText, activePlace === "all" && s.white]}>
                    All places
                  </Text>
                </Pressable>
                {prefs.places.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => setActivePlace(p.id)}
                    style={[s.chip, activePlace === p.id && s.chipActive]}
                  >
                    <Text style={[s.chipText, activePlace === p.id && s.white]}>
                      {p.name}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  accessibilityLabel="Add a place"
                  onPress={() => setLocationsOpen(true)}
                  style={s.chip}
                >
                  <Icon name="add" size={18} />
                </Pressable>
              </ScrollView>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.categoryRow}
              >
                {[
                  ["all", "Everything"],
                  ...Object.entries(categories).map(([k, v]) => [k, v.label]),
                ].map(([k, label]) => (
                  <Pressable
                    key={k}
                    onPress={() => setCategory(k)}
                    style={[s.category, category === k && s.categorySelected]}
                  >
                    <Text
                      style={[
                        s.categoryText,
                        category === k && { color: C.ink },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={s.sectionRow}>
                <Text style={s.eyebrow}>
                  {tab === "Saved"
                    ? "SAVED BY YOU"
                    : `${shown.length} ${isDemo ? "SAMPLE " : ""}CHANGES`}
                </Text>
                {tab !== "Saved" && (
                  <Pressable
                    onPress={() => setNewOnly((v) => !v)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: newOnly }}
                    style={s.row}
                  >
                    <Icon
                      name={newOnly ? "checkbox" : "square-outline"}
                      size={16}
                      color={C.muted}
                    />
                    <Text style={s.small}>New since last visit</Text>
                  </Pressable>
                )}
              </View>
              {tab === "Nearby" && !nearby ? (
                <View style={s.empty}>
                  <Icon name="navigate-outline" size={36} color={C.orange} />
                  <Text style={s.cardTitle}>
                    Your neighbourhood, wherever you are.
                  </Text>
                  <Text style={s.subtitle}>
                    Use your location to see nearby changes.
                  </Text>
                  <Button label="Find changes near me" onPress={locate} />
                  {!!searchError && <Text style={s.error}>{searchError}</Text>}
                </View>
              ) : tab === "Map" ? (
                <View style={{ minHeight: 450 }}>
                  <EventMap
                    events={shown}
                    place={mapPlace}
                    onSelect={setDetail}
                  />
                </View>
              ) : !shown.length ? (
                <View style={s.empty}>
                  <Icon
                    name={tab === "Saved" ? "bookmark-outline" : "leaf-outline"}
                    size={36}
                    color={C.green}
                  />
                  <Text style={s.cardTitle}>
                    {tab === "Saved"
                      ? "Keep a change for later."
                      : "Quiet is a good thing."}
                  </Text>
                  <Text style={s.subtitle}>
                    {tab === "Saved"
                      ? "Tap the bookmark on any card."
                      : "No changes match this view yet. Try another category or a wider radius."}
                  </Text>
                  <Button
                    label="Adjust places"
                    onPress={() => setLocationsOpen(true)}
                    quiet
                  />
                </View>
              ) : (
                shown.map((e, i) => {
                  const cat = categories[e.category];
                  const rankedEvent = ranked.find((x) => x.id === e.id);
                  return (
                    <View key={e.id} style={[s.card, i === 0 && s.firstCard]}>
                      <View style={s.cardTop}>
                        <View style={s.row}>
                          <View
                            style={[
                              s.categoryIcon,
                              { backgroundColor: cat.color + "15" },
                            ]}
                          >
                            <Icon
                              name={cat.icon as keyof typeof Ionicons.glyphMap}
                              color={cat.color}
                              size={17}
                            />
                          </View>
                          <Text style={[s.cardCategory, { color: cat.color }]}>
                            {cat.label}
                          </Text>
                        </View>
                        <Text style={s.small}>
                          {e.sample
                            ? "Example"
                            : new Date(e.detectedAt).toLocaleDateString(
                                "en-IN",
                                { day: "numeric", month: "short" },
                              )}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Read ${e.title}`}
                        onPress={() => setDetail(e)}
                      >
                        <Text style={s.cardTitle}>{e.title}</Text>
                        {prefs.followed.includes(e.entityId) && (
                          <Text style={s.link}>Following this place</Text>
                        )}
                        <Text style={s.summary}>{e.summary}</Text>
                      </Pressable>
                      <View style={s.diff}>
                        <Text style={s.diffLabel}>WHAT CHANGED</Text>
                        <View style={s.diffRow}>
                          <Text style={s.minus}>−</Text>
                          <Text style={s.oldState}>{e.oldState}</Text>
                        </View>
                        <View style={s.diffRow}>
                          <Text style={s.plus}>+</Text>
                          <Text style={s.newState}>{e.newState}</Text>
                        </View>
                      </View>
                      <View style={s.cardFooter}>
                        <Pressable
                          onPress={() => mapEvent(e)}
                          style={[s.row, { flex: 1 }]}
                        >
                          <Icon
                            name="location-outline"
                            size={14}
                            color={C.muted}
                          />
                          <Text style={s.small}>
                            {rankedEvent
                              ? `${formatDistance(rankedEvent.distance)} away`
                              : "View location"}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => setDetail(e)}>
                          <Text style={s.sourceText}>
                            {e.sample
                              ? "Sample"
                              : `${e.sources.length} source${e.sources.length === 1 ? "" : "s"}`}{" "}
                            ↗
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={
                            prefs.saved.includes(e.id)
                              ? `Unsave ${e.title}`
                              : `Save ${e.title}`
                          }
                          onPress={() => toggle("saved", e.id)}
                          style={s.saveButton}
                        >
                          <Icon
                            name={
                              prefs.saved.includes(e.id)
                                ? "bookmark"
                                : "bookmark-outline"
                            }
                            size={19}
                            color={
                              prefs.saved.includes(e.id) ? C.orange : C.ink
                            }
                          />
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
              {!!shown.length && tab !== "Map" && (
                <View style={s.endnote}>
                  <View style={s.endLine} />
                  <Icon
                    name="checkmark-circle-outline"
                    size={22}
                    color={C.green}
                  />
                  <Text style={s.bold}>You’re in the loop.</Text>
                  <Text style={s.small}>Go enjoy your neighbourhood.</Text>
                </View>
              )}
              {!!notice && (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[s.small, { textAlign: "center", marginBottom: 16 }]}
                >
                  {notice}
                </Text>
              )}
            </ScrollView>
            <View style={s.nav}>
              {tabs.map(([name, icon]) => (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityLabel={name}
                  accessibilityState={{ selected: tab === name }}
                  key={name}
                  onPress={() => setTab(name)}
                  style={s.navItem}
                >
                  <Icon
                    name={icon}
                    size={22}
                    color={tab === name ? C.orange : C.muted}
                  />
                  <Text
                    style={[s.navText, tab === name && { color: C.orange }]}
                  >
                    {name}
                  </Text>
                  {tab === name && <View style={s.navDot} />}
                </Pressable>
              ))}
            </View>
          </>
        )}
        <Modal
          visible={locationsOpen}
          animationType="slide"
          onRequestClose={() => setLocationsOpen(false)}
        >
          <SafeAreaView style={s.safe}>
            <View style={[s.shell, { padding: 24 }]}>
              <Pressable
                accessibilityLabel="Close places"
                onPress={() => setLocationsOpen(false)}
                style={s.close}
              >
                <Icon name="close" />
              </Pressable>
              <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                {picker}
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
        <Modal
          visible={!!detail}
          animationType="slide"
          onRequestClose={() => setDetail(null)}
        >
          <SafeAreaView style={s.safe}>
            <View style={s.shell}>
              {detail && (
                <ScrollView contentContainerStyle={[s.content, { gap: 20 }]}>
                  <View style={s.sectionRow}>
                    <Text style={s.eyebrow}>THE STORY BEHIND THE CHANGE</Text>
                    <Pressable
                      accessibilityLabel="Close story"
                      onPress={() => setDetail(null)}
                      style={s.close}
                    >
                      <Icon name="close" />
                    </Pressable>
                  </View>
                  <Text
                    style={[
                      s.cardCategory,
                      { color: categories[detail.category].color },
                    ]}
                  >
                    {categories[detail.category].label}
                  </Text>
                  <Text style={s.hero}>{detail.title}</Text>
                  <Text style={s.summary}>{detail.summary}</Text>
                  <View style={s.diff}>
                    <Text style={s.diffLabel}>WHAT CHANGED</Text>
                    <Text style={s.oldState}>− {detail.oldState}</Text>
                    <Text style={s.newState}>+ {detail.newState}</Text>
                  </View>
                  <Text style={s.small}>
                    {detail.sample
                      ? "Fictional example. This is not a verified local report."
                      : `Detected ${new Date(detail.detectedAt).toLocaleString("en-IN")} · ${detail.confidence >= 0.85 ? "High" : "Moderate"} evidence confidence (model estimate)`}
                  </Text>
                  <Text style={s.eyebrow}>THE EVIDENCE</Text>
                  {detail.sources.length ? (
                    detail.sources.map((source) => (
                      <Pressable
                        key={source.url}
                        onPress={() =>
                          Linking.openURL(source.url).catch(() =>
                            setNotice("Could not open that source."),
                          )
                        }
                        style={s.evidence}
                      >
                        <Text style={s.bold}>{source.title} ↗</Text>
                        <Text style={s.small}>
                          {new URL(source.url).hostname}
                          {source.publishedAt
                            ? ` · ${new Date(source.publishedAt).toLocaleDateString("en-IN")}`
                            : ""}
                        </Text>
                        <Text style={s.summary}>{source.excerpt}</Text>
                      </Pressable>
                    ))
                  ) : (
                    <Text style={s.summary}>
                      Sample cards have no source links. Live cards must include
                      traceable evidence before they can appear.
                    </Text>
                  )}
                  <Button
                    label="Open location in maps ↗"
                    onPress={() =>
                      Linking.openURL(
                        `https://www.google.com/maps/search/?api=1&query=${detail.latitude},${detail.longitude}`,
                      )
                    }
                  />
                  <View style={s.row}>
                    <View style={{ flex: 1 }}>
                      <Button
                        label={
                          prefs.saved.includes(detail.id)
                            ? "Saved ✓"
                            : "Save change"
                        }
                        quiet
                        onPress={() => toggle("saved", detail.id)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        label={
                          prefs.followed.includes(detail.entityId)
                            ? "Following ✓"
                            : "Follow this place"
                        }
                        quiet
                        onPress={() => toggle("followed", detail.entityId)}
                      />
                    </View>
                  </View>
                  {prefs.followed.includes(detail.entityId) && (
                    <Text style={s.small}>
                      Following on this device. Future changes to this place get
                      a highlight in your feed. Push notifications aren’t
                      enabled.
                    </Text>
                  )}
                  <View style={s.sectionRow}>
                    <Text style={s.small}>Was this worth knowing?</Text>
                    <Pressable onPress={() => toggle("useful", detail.id)}>
                      <Text style={s.link}>
                        {prefs.useful.includes(detail.id)
                          ? "Useful ✓"
                          : "Useful"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        toggle("hidden", detail.id);
                        setDetail(null);
                        setNotice("Change hidden from your feed.");
                      }}
                    >
                      <Text style={s.small}>Not useful</Text>
                    </Pressable>
                  </View>
                </ScrollView>
              )}
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  shell: { flex: 1, width: "100%", maxWidth: 760, alignSelf: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "white",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 35,
    letterSpacing: -2,
  },
  wordmark: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1.5,
    color: C.ink,
  },
  tagline: { fontSize: 11, color: C.muted },
  dot: { width: 5, height: 5, borderRadius: 4, backgroundColor: C.orange },
  content: { padding: 22, paddingBottom: 30 },
  onboarding: { padding: 26, paddingTop: 38 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.8,
    color: C.muted,
  },
  hero: {
    fontSize: 37,
    lineHeight: 42,
    fontWeight: "700",
    letterSpacing: -1.4,
    color: C.ink,
    marginTop: 12,
  },
  subtitle: { fontSize: 14, lineHeight: 22, color: C.muted, marginTop: 12 },
  bold: { fontSize: 14, fontWeight: "600", color: C.ink },
  small: { fontSize: 11, lineHeight: 18, color: C.muted },
  button: {
    backgroundColor: C.orange,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 13,
    alignItems: "center",
  },
  buttonText: { color: "white", fontSize: 14, fontWeight: "600" },
  quiet: { backgroundColor: "#ECEEE7" },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
    backgroundColor: "#F0E9DC",
    borderRadius: 14,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "white",
    borderRadius: 13,
    padding: 15,
  },
  input: { flex: 1, fontSize: 14, color: C.ink, paddingVertical: 4 },
  radius: {
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
  },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E9EDE5",
    alignItems: "center",
    justifyContent: "center",
  },
  introNote: {
    flexDirection: "row",
    gap: 12,
    marginTop: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
  },
  topline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  refresh: {
    width: 42,
    height: 42,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  sampleBanner: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: "#F2E8DC",
    borderRadius: 9,
  },
  sampleText: { fontSize: 10, letterSpacing: 0.5, color: "#965A36", flex: 1 },
  filters: { gap: 8, paddingVertical: 20 },
  chip: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 10,
    justifyContent: "center",
  },
  chipText: { fontSize: 12, color: C.ink, fontWeight: "500" },
  white: { color: "white" },
  categoryRow: { gap: 22, borderBottomWidth: 1, borderColor: C.line },
  category: { paddingBottom: 14 },
  categorySelected: { borderBottomWidth: 2, borderColor: C.orange },
  categoryText: { fontSize: 12, color: C.muted, fontWeight: "600" },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingVertical: 20,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 19,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E9E8E0",
  },
  firstCard: { borderTopWidth: 3, borderTopColor: C.orange },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  categoryIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCategory: { fontSize: 11, fontWeight: "700" },
  cardTitle: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "600",
    letterSpacing: -0.6,
    color: C.ink,
  },
  summary: { fontSize: 13, lineHeight: 21, color: "#72776E", marginTop: 10 },
  diff: {
    marginTop: 18,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#F5F6F1",
    gap: 7,
  },
  diffLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.3,
    color: C.muted,
    marginBottom: 3,
  },
  diffRow: { flexDirection: "row", gap: 9 },
  minus: { color: "#9D8D80", fontSize: 13 },
  plus: { color: C.green, fontSize: 13 },
  oldState: { color: "#96968C", fontSize: 12, lineHeight: 19, flexShrink: 1 },
  newState: {
    color: C.green,
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "600",
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "#F0F0E9",
  },
  sourceText: { fontSize: 10, color: C.green, fontWeight: "600" },
  saveButton: { padding: 7 },
  nav: {
    flexDirection: "row",
    paddingTop: 13,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
  },
  navItem: { flex: 1, alignItems: "center", gap: 5, minHeight: 53 },
  navText: { fontSize: 10, fontWeight: "600", color: C.muted },
  navDot: { height: 3, width: 3, borderRadius: 2, backgroundColor: C.orange },
  empty: { paddingVertical: 40, alignItems: "center", gap: 18 },
  endnote: { alignItems: "center", gap: 10, paddingVertical: 28 },
  endLine: { height: 1, width: 42, backgroundColor: C.line, marginBottom: 10 },
  error: { color: "#AE422E", fontSize: 13, lineHeight: 20 },
  errorBox: {
    padding: 15,
    gap: 12,
    backgroundColor: "#FCEDE7",
    borderRadius: 12,
    marginTop: 15,
  },
  close: { padding: 10, alignSelf: "flex-end" },
  link: { color: C.orange, fontSize: 12, fontWeight: "600" },
  evidence: {
    padding: 18,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 13,
    gap: 5,
  },
});
