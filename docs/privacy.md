# Prototype privacy notes

No account is required. Saved locations, bookmarks, follows, feedback, last-visit time and a feed cache are stored locally in AsyncStorage. This is ordinary app storage, not encrypted secret storage. Uninstalling the app clears it; browser users can clear site data.

Foreground location permission is requested only after tapping a location action. Beat does not track location in the background. In sample mode, locations stay on the device. In live mode, coordinates and radius are sent to the configured Beat API to retrieve nearby events; typed place searches are sent through that API to OpenStreetMap's Nominatim service. Operator discovery sends the selected research area and known local states to the configured OpenAI API. The user's private bookmarks and feedback are not sent to the discovery provider.

Opening an evidence link or an external map uses a third-party service. The web map embeds OpenStreetMap, which receives the requested map area and ordinary browser connection metadata.

There is no advertising or analytics SDK. These are implementation notes for the prototype, not a complete app-store privacy policy. Review the deployed hosting, logs, vendors and retention settings before publication.
