import { createStore } from "./store.mjs";
import { discover } from "./discovery.mjs";
import { starterPlaces } from "../src/domain.mjs";
const store = await createStore();
try {
  for (const place of starterPlaces) {
    console.log(place.name, await discover(place, store));
  }
} finally {
  await store.close();
}
