import { brandingProfiles } from "./profiles";

export type BrandingConfig = {
  profile: string;
  appName: string;
  appShortName: string;
  operationalBadgeText: string;
  loginSubtitle: string;
  bootSubtitle: string;
  labels: {
    home: string;
    deliveries: string;
    accesses: string;
    people: string;
    messages: string;
    receiveDelivery: string;
    deliverDelivery: string;
    deliveryQuery: string;
    manualEntry: string;
    readLabel: string;
  };
  features: {
    deliveries: boolean;
    people: boolean;
    accesses: boolean;
    messages: boolean;
    deliveryOcr: boolean;
    deliveryManualEntry: boolean;
  };
  developerSignaturePrefix: string;
  developerSignatureName: string;
  showDeveloperSignature: boolean;
  logos: {
    primary: number;
    developer: number;
  };
  palette: {
    background: string;
    surface: string;
    text: string;
    muted: string;
    line: string;
    primary: string;
    primaryDark: string;
    danger: string;
    warning: string;
    success: string;
    ink: string;
  };
};

function readEnv(name: string, fallback: string) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

function readBoolEnv(name: string, fallback: boolean) {
  const value = process.env[name];
  if (!value?.trim()) {
    return fallback;
  }

  return value.trim().toLowerCase() === "true";
}

const requestedProfile = (process.env.EXPO_PUBLIC_BRAND_PROFILE ?? "rafiels").trim().toLowerCase();
const selectedProfile = brandingProfiles[requestedProfile as keyof typeof brandingProfiles] ?? brandingProfiles.rafiels;
const profileDefaults = selectedProfile.defaults;

export const branding: BrandingConfig = {
  profile: requestedProfile,
  appName: readEnv("EXPO_PUBLIC_BRAND_APP_NAME", profileDefaults.appName),
  appShortName: readEnv("EXPO_PUBLIC_BRAND_APP_SHORT_NAME", profileDefaults.appShortName),
  operationalBadgeText: readEnv("EXPO_PUBLIC_BRAND_OPERATIONAL_BADGE_TEXT", profileDefaults.operationalBadgeText),
  loginSubtitle: readEnv("EXPO_PUBLIC_BRAND_LOGIN_SUBTITLE", profileDefaults.loginSubtitle),
  bootSubtitle: readEnv("EXPO_PUBLIC_BRAND_BOOT_SUBTITLE", profileDefaults.bootSubtitle),
  labels: {
    home: readEnv("EXPO_PUBLIC_BRAND_LABEL_HOME", profileDefaults.labels.home),
    deliveries: readEnv("EXPO_PUBLIC_BRAND_LABEL_DELIVERIES", profileDefaults.labels.deliveries),
    accesses: readEnv("EXPO_PUBLIC_BRAND_LABEL_ACCESSES", profileDefaults.labels.accesses),
    people: readEnv("EXPO_PUBLIC_BRAND_LABEL_PEOPLE", profileDefaults.labels.people),
    messages: readEnv("EXPO_PUBLIC_BRAND_LABEL_MESSAGES", profileDefaults.labels.messages),
    receiveDelivery: readEnv("EXPO_PUBLIC_BRAND_LABEL_RECEIVE_DELIVERY", profileDefaults.labels.receiveDelivery),
    deliverDelivery: readEnv("EXPO_PUBLIC_BRAND_LABEL_DELIVER_DELIVERY", profileDefaults.labels.deliverDelivery),
    deliveryQuery: readEnv("EXPO_PUBLIC_BRAND_LABEL_DELIVERY_QUERY", profileDefaults.labels.deliveryQuery),
    manualEntry: readEnv("EXPO_PUBLIC_BRAND_LABEL_MANUAL_ENTRY", profileDefaults.labels.manualEntry),
    readLabel: readEnv("EXPO_PUBLIC_BRAND_LABEL_READ_LABEL", profileDefaults.labels.readLabel)
  },
  features: {
    deliveries: readBoolEnv("EXPO_PUBLIC_FEATURE_DELIVERIES", profileDefaults.features.deliveries),
    people: readBoolEnv("EXPO_PUBLIC_FEATURE_PEOPLE", profileDefaults.features.people),
    accesses: readBoolEnv("EXPO_PUBLIC_FEATURE_ACCESSES", profileDefaults.features.accesses),
    messages: readBoolEnv("EXPO_PUBLIC_FEATURE_MESSAGES", profileDefaults.features.messages),
    deliveryOcr: readBoolEnv("EXPO_PUBLIC_FEATURE_DELIVERY_OCR", profileDefaults.features.deliveryOcr),
    deliveryManualEntry: readBoolEnv("EXPO_PUBLIC_FEATURE_DELIVERY_MANUAL_ENTRY", profileDefaults.features.deliveryManualEntry)
  },
  developerSignaturePrefix: readEnv("EXPO_PUBLIC_BRAND_SIGNATURE_PREFIX", profileDefaults.developerSignaturePrefix),
  developerSignatureName: readEnv("EXPO_PUBLIC_BRAND_SIGNATURE_NAME", profileDefaults.developerSignatureName),
  showDeveloperSignature: readBoolEnv("EXPO_PUBLIC_BRAND_SHOW_DEVELOPER_SIGNATURE", profileDefaults.showDeveloperSignature),
  logos: selectedProfile.logos,
  palette: {
    background: readEnv("EXPO_PUBLIC_BRAND_COLOR_BACKGROUND", profileDefaults.palette.background),
    surface: readEnv("EXPO_PUBLIC_BRAND_COLOR_SURFACE", profileDefaults.palette.surface),
    text: readEnv("EXPO_PUBLIC_BRAND_COLOR_TEXT", profileDefaults.palette.text),
    muted: readEnv("EXPO_PUBLIC_BRAND_COLOR_MUTED", profileDefaults.palette.muted),
    line: readEnv("EXPO_PUBLIC_BRAND_COLOR_LINE", profileDefaults.palette.line),
    primary: readEnv("EXPO_PUBLIC_BRAND_COLOR_PRIMARY", profileDefaults.palette.primary),
    primaryDark: readEnv("EXPO_PUBLIC_BRAND_COLOR_PRIMARY_DARK", profileDefaults.palette.primaryDark),
    danger: readEnv("EXPO_PUBLIC_BRAND_COLOR_DANGER", profileDefaults.palette.danger),
    warning: readEnv("EXPO_PUBLIC_BRAND_COLOR_WARNING", profileDefaults.palette.warning),
    success: readEnv("EXPO_PUBLIC_BRAND_COLOR_SUCCESS", profileDefaults.palette.success),
    ink: readEnv("EXPO_PUBLIC_BRAND_COLOR_INK", profileDefaults.palette.ink)
  }
};
