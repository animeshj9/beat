import React from "react";
import MapView, { Marker } from "react-native-maps";
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
  return (
    <MapView
      key={place.id}
      style={{ flex: 1, minHeight: 360, borderRadius: 20 }}
      initialRegion={{
        ...place,
        latitudeDelta: place.radius / 35,
        longitudeDelta: place.radius / 35,
      }}
    >
      <Marker coordinate={place} title={place.name} pinColor="#263C32" />
      {events.map((e) => (
        <Marker
          key={e.id}
          coordinate={e}
          title={e.title}
          pinColor="#DA5C35"
          onPress={() => onSelect(e)}
        />
      ))}
    </MapView>
  );
}
