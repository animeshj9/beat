import React, { useRef, useState } from "react";
import { ActivityIndicator, FlatList, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { categories, formatDistance } from "../domain.mjs";
import type { Change, Place } from "../types";

type Props = {
  events: Change[];
  ranked: (Change & { distance: number; place: Place })[];
  saved: string[]; useful: string[]; followed: string[];
  onSave: (e: Change) => void; onUseful: (e: Change) => void;
  onRead: (e: Change) => void; onMap: (e: Change) => void;
  onReset: () => void; savedView: boolean; busy: boolean;
};
const accent = "#D6FF62";
const archive = require("../../assets/stories/junction.webp");
function Action({ icon, label, selected, onPress, accessibilityLabel }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; selected?: boolean;
  onPress: () => void; accessibilityLabel: string;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ selected: !!selected }} onPress={onPress} style={s.action}>
    <View style={s.actionCircle}><Ionicons name={icon} size={25} color={selected ? accent : "white"} /></View>
    <Text style={[s.actionLabel, selected && { color: accent }]}>{label}</Text>
  </Pressable>;
}
export default function StoryFeed(props: Props) {
  const { events, ranked, saved, useful, followed, onRead, onSave, onUseful, onMap } = props;
  const [height, setHeight] = useState(600);
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<Change>>(null);
  const current = Math.min(index, Math.max(0, events.length - 1));
  const jump = (next: number) => {
    const target = Math.max(0, Math.min(events.length - 1, next));
    list.current?.scrollToOffset({ offset: target * height, animated: false });
    setIndex(target);
  };
  return <View style={s.container} onLayout={(e) => setHeight(Math.max(1, Math.round(e.nativeEvent.layout.height)))}>
    {!events.length ? <View style={s.empty}>
      {props.busy ? <ActivityIndicator color={accent} /> : <Ionicons name={props.savedView ? "bookmark-outline" : "compass-outline"} size={42} color={accent} />}
      <Text style={s.emptyTitle}>{props.busy ? "Finding your beat…" : props.savedView ? "Keep your local favourites." : "Nothing here just yet."}</Text>
      <Text style={s.emptyText}>{props.savedView ? "Save a story and it’ll be waiting here." : "Try all topics, or adjust your places and radius."}</Text>
      <Pressable accessibilityRole="button" onPress={props.onReset} style={s.reset}><Text style={{ fontWeight: "700", color: "#101211" }}>Back to the feed</Text></Pressable>
    </View> : <>
      <FlatList ref={list} data={events} keyExtractor={(e) => e.id} extraData={{ saved, useful, followed, height }}
        style={s.container} pagingEnabled snapToInterval={height} decelerationRate="fast" showsVerticalScrollIndicator={false}
        onScroll={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.y / height))} scrollEventThrottle={32}
        getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
        onLayout={() => list.current?.scrollToOffset({ offset: current * height, animated: false })}
        renderItem={({ item: e, index: i }) => {
          const rank = ranked.find((r) => r.id === e.id);
          const cat = categories[e.category];
          // A licensed archive is atmosphere only, never evidence or live imagery.
          const hasArchive = e.sample && e.latitude > 17 && e.latitude < 18;
          return <View style={[s.story, { height }]} accessibilityLabel={`Story ${i + 1} of ${events.length}`}>
            {hasArchive && <ImageBackground source={archive} style={[StyleSheet.absoluteFill, { height: "65%" }]} resizeMode="cover" imageStyle={{ opacity: 0.9, width: "100%", height: "100%" }} />}
            {!hasArchive && <View style={s.poster}><Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={160} color="#6F825B" /><Text style={s.posterLabel}>{cat.label.toUpperCase()}</Text></View>}
            <View style={s.top}><Text style={s.topic}>{cat.label.toUpperCase()}</Text><Text style={s.mediaLabel}>{hasArchive ? "ARCHIVE PHOTO · ILLUSTRATIVE" : "TEXT STORY"}</Text></View>
            <View style={s.bottom}>
              <View style={s.copy}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Read ${e.title}`} onPress={() => onRead(e)}>
                  <Text style={s.byline}>{e.sample ? "BEAT / SAMPLE STORY" : "BEAT / LOCAL UPDATE"}{followed.includes(e.entityId) ? " · FOLLOWING" : ""}</Text>
                  <Text style={[s.title, height < 500 && { fontSize: 23, lineHeight: 27 }]} numberOfLines={4}>{e.title}</Text>
                  {height >= 500 && <Text style={s.summary} numberOfLines={2}>{e.summary}</Text>}
                  <Text style={s.read}>The whole story <Ionicons name="arrow-forward" size={15} /></Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`View location of ${e.title}`} onPress={() => onMap(e)} style={s.location}>
                  <Ionicons name="location-outline" size={14} color={accent} />
                  <Text numberOfLines={1} style={s.locationText}>{rank ? `${rank.place.name} · ${formatDistance(rank.distance)}` : "View location"}</Text>
                </Pressable>
                <Text style={s.disclosure}>{e.sample ? "Fictional example · Not a local report" : `${e.sources.length} sources · ${new Date(e.detectedAt).toLocaleDateString("en-IN")}`}</Text>
              </View>
              <View style={s.rail}>
                <Action icon={useful.includes(e.id) ? "heart" : "heart-outline"} label="Useful" selected={useful.includes(e.id)} accessibilityLabel={`${useful.includes(e.id) ? "Undo useful for" : "Mark useful:"} ${e.title}`} onPress={() => onUseful(e)} />
                <Action icon={saved.includes(e.id) ? "bookmark" : "bookmark-outline"} label={saved.includes(e.id) ? "Saved" : "Save"} selected={saved.includes(e.id)} accessibilityLabel={`${saved.includes(e.id) ? "Unsave" : "Save"} ${e.title}`} onPress={() => onSave(e)} />
                <Action icon="ellipsis-horizontal" label="Details" accessibilityLabel={`Details for ${e.title}`} onPress={() => onRead(e)} />
              </View>
            </View>
          </View>;
        }} />
      <View style={s.pagination}>
        <Text accessibilityLiveRegion="polite" style={s.progress}>{String(current + 1).padStart(2, "0")} / {String(events.length).padStart(2, "0")}  ·  {current === events.length - 1 ? "You’re in the loop" : "Swipe or scroll to explore"}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous story" disabled={current === 0} onPress={() => jump(current - 1)} style={[s.step, current === 0 && s.disabled]}><Ionicons name="chevron-up" color="white" size={18} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next story" disabled={current === events.length - 1} onPress={() => jump(current + 1)} style={[s.step, current === events.length - 1 && s.disabled]}><Ionicons name="chevron-down" color="white" size={18} /></Pressable>
      </View>
    </>}
  </View>;
}
const s = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },
  story: { backgroundColor: "#25332C", overflow: "hidden", justifyContent: "flex-end" },
  top: { position: "absolute", top: 16, left: 20, right: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  topic: { fontSize: 10, letterSpacing: 1.5, fontWeight: "800", color: "#101211", backgroundColor: accent, paddingHorizontal: 10, paddingVertical: 7 },
  mediaLabel: { fontSize: 8, letterSpacing: 0.8, color: "white", backgroundColor: "#101211BB", padding: 6 },
  bottom: { flexDirection: "row", alignItems: "flex-end", padding: 20, paddingTop: 26, paddingBottom: 58, gap: 10, backgroundColor: "#0A100DEB" },
  copy: { flex: 1 },
  byline: { color: accent, fontWeight: "700", fontSize: 10, letterSpacing: 1.4, marginBottom: 10 },
  title: { color: "white", fontSize: 30, fontWeight: "800", lineHeight: 33, letterSpacing: -0.8 },
  summary: { color: "#DFE4DC", fontSize: 13, lineHeight: 19, marginTop: 10 },
  read: { color: "white", fontSize: 12, fontWeight: "700", paddingVertical: 12 },
  location: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 30 },
  locationText: { color: "#E4EAD9", fontSize: 11, flexShrink: 1 },
  disclosure: { color: "#BBC5B9", fontSize: 10, marginTop: 4 },
  rail: { gap: 13, paddingBottom: 8 },
  action: { alignItems: "center", minWidth: 46, gap: 5 },
  actionCircle: { width: 44, height: 44, borderRadius: 24, backgroundColor: "#FFFFFF16", justifyContent: "center", alignItems: "center" },
  actionLabel: { color: "white", fontSize: 10, fontWeight: "600" },
  pagination: { position: "absolute", bottom: 0, left: 0, right: 0, height: 44, paddingLeft: 20, flexDirection: "row", alignItems: "center", backgroundColor: "#0A100DEB" },
  progress: { color: "#B9C4B6", fontSize: 10, flex: 1 },
  step: { padding: 12, minWidth: 44, alignItems: "center" },
  disabled: { opacity: 0.3 },
  poster: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", paddingTop: 80, backgroundColor: "#293B31" },
  posterLabel: { fontWeight: "900", color: "#81976E", fontSize: 34, letterSpacing: -1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20, padding: 30 },
  emptyTitle: { color: "white", fontSize: 25, fontWeight: "700", textAlign: "center" },
  emptyText: { color: "#B9C4B6", textAlign: "center", lineHeight: 22 },
  reset: { backgroundColor: accent, padding: 16, borderRadius: 8 },
});
