import React from "react";
import { View, Text, Pressable, Linking } from "react-native";
import type { Change, Place } from "../types";
export default function EventMap({
  events,
  place,
  onSelect,
}: {
  events: Change[];
  place: Place;
  onSelect: (e: Change) => void;
}) {
  const delta = place.radius / 80;
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${place.longitude - delta},${place.latitude - delta},${place.longitude + delta},${place.latitude + delta}&layer=mapnik&marker=${place.latitude},${place.longitude}`;
  return (
    <View style={{ gap: 14 }}>
      {React.createElement("iframe", {
        title: `Map of ${place.name}`,
        src: url,
        style: { width: "100%", height: 320, border: 0, borderRadius: 18 },
      })}
      <Text style={{ color: "#B9C4B6" }}>
        Select a change below to inspect its location. Native apps show every
        change as a map pin.
      </Text>
      {events.map((e, i) => (
        <Pressable
          key={e.id}
          onPress={() => onSelect(e)}
          style={{ padding: 15, backgroundColor: "#242D27", borderRadius: 12 }}
        >
          <Text style={{ color: "#F6F7F2", fontWeight: "600" }}>
            {i + 1}. {e.title}
          </Text>
        </Pressable>
      ))}
      <Pressable
        onPress={() =>
          Linking.openURL(
            `https://www.openstreetmap.org/#map=15/${place.latitude}/${place.longitude}`,
          )
        }
      >
        <Text style={{ color: "#D6FF62" }}>Open full map ↗</Text>
      </Pressable>
    </View>
  );
}
