export default {
  expo: {
    name: "Beat",
    slug: "beat",
    scheme: "beat",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    icon: "./assets/icon.png",
    ios: { supportsTablet: true, bundleIdentifier: "com.animeshj9.beat" },
    android: {
      package: "com.animeshj9.beat",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#F6F4EF",
      },
      ...(process.env.GOOGLE_MAPS_API_KEY
        ? {
            config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY } },
          }
        : {}),
    },
    plugins: [
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Beat uses your location to find changes nearby. Your location stays on your device unless you request nearby updates.",
        },
      ],
    ],
    web: { bundler: "metro", favicon: "./assets/icon.png" },
  },
};
