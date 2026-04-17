const { brandingBuildProfiles } = require("./branding.build-profiles");

const profileKey = (process.env.EXPO_PUBLIC_BRAND_PROFILE || "rafiels").trim().toLowerCase();
const selectedProfile = brandingBuildProfiles[profileKey] || brandingBuildProfiles.rafiels;

const appName = process.env.EXPO_PUBLIC_BRAND_APP_NAME || selectedProfile.appName;
const appSlug = process.env.EXPO_PUBLIC_BRAND_SLUG || selectedProfile.slug;
const appScheme = process.env.EXPO_PUBLIC_BRAND_SCHEME || selectedProfile.scheme;
const iosBundleIdentifier =
  process.env.EXPO_PUBLIC_BRAND_IOS_BUNDLE_ID || selectedProfile.iosBundleIdentifier;
const androidPackage =
  process.env.EXPO_PUBLIC_BRAND_ANDROID_PACKAGE || selectedProfile.androidPackage;
const splashBackgroundColor =
  process.env.EXPO_PUBLIC_BRAND_SPLASH_BACKGROUND || selectedProfile.splashBackgroundColor;
const cameraPermission =
  process.env.EXPO_PUBLIC_BRAND_CAMERA_PERMISSION ||
  selectedProfile.cameraPermission ||
  `${appName} usa a camera para registrar etiquetas, volumes e fotos faciais autorizadas.`;

module.exports = {
  expo: {
    name: appName,
    slug: appSlug,
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    scheme: appScheme,
    splash: {
      backgroundColor: splashBackgroundColor
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: iosBundleIdentifier,
      infoPlist: {
        NSCameraUsageDescription: cameraPermission
      }
    },
    android: {
      package: androidPackage,
      permissions: ["CAMERA"]
    },
    plugins: [
      [
        "expo-image-picker",
        {
          cameraPermission
        }
      ]
    ]
  }
};
