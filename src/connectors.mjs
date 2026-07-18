import { garminStatus } from "./garmin.mjs";

const staticConnectors = [
  {
    id: "strava", label: "Strava", route: "oauth", canRead: true, canWrite: false,
    note: "Cross-device activity history through Strava OAuth. It is useful for workouts, but it is not a complete sleep or recovery source.",
    setup: { kind: "oauth", requiredEnvironment: ["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET", "STRAVA_REDIRECT_URI"], requestedScopes: ["activity:read_all"] }
  },
  {
    id: "apple_health", label: "Apple Health / Watch", route: "ios_companion", status: "companion_required", canRead: true, canWrite: false,
    note: "HealthKit reads and WorkoutKit delivery must happen inside an authorized iOS companion app. This web harness cannot connect to Apple Health or push an Apple Watch workout directly.",
    workoutDelivery: { status: "companion_required", route: "WorkoutKit", supportedHere: false },
    setup: {
      kind: "native_companion", platform: "iOS", permissionModel: "per health data type",
      methods: [{ id: "workoutkit_companion", label: "Build an iOS WorkoutKit companion", recommended: true, guide: "docs/SELF_SERVICE_CONNECTORS.md#apple-watch" }]
    }
  },
  {
    id: "health_connect", label: "Android Health Connect", route: "android_companion", status: "companion_required", canRead: true, canWrite: false,
    note: "Health Connect reads and planned-exercise delivery require an Android companion app, declared record types, and user-granted permissions.",
    workoutDelivery: { status: "companion_required", route: "planned exercise", supportedHere: false },
    setup: {
      kind: "native_companion", platform: "Android", permissionModel: "per record type",
      methods: [{ id: "health_connect_companion", label: "Build an Android Health Connect companion", recommended: true, guide: "docs/SELF_SERVICE_CONNECTORS.md#android-and-wear-os" }]
    }
  },
  { id: "fitbit", label: "Fitbit", route: "oauth", status: "planned", canRead: true, canWrite: false, note: "OAuth connector is planned. Use Strava, an exported activity file, or a manual check-in today." },
  { id: "oura", label: "Oura", route: "oauth", status: "planned", canRead: true, canWrite: false, note: "Recovery connector is planned; it would complement rather than replace workout history." },
  { id: "whoop", label: "WHOOP", route: "oauth", status: "planned", canRead: true, canWrite: false, note: "Recovery and workout connector is planned. It is not connected in this release." },
  { id: "polar", label: "Polar", route: "oauth", status: "planned", canRead: true, canWrite: false, note: "Polar AccessLink support is planned. File import is available now.", workoutDelivery: { status: "provider_review_required", supportedHere: false } },
  { id: "coros", label: "COROS", route: "partner_or_relay", status: "planned", canRead: true, canWrite: false, note: "Partner access may be required. Strava or file import is the current route.", workoutDelivery: { status: "provider_review_required", supportedHere: false } },
  { id: "suunto", label: "Suunto", route: "partner_or_relay", status: "planned", canRead: true, canWrite: false, note: "Partner access may be required. Strava or file import is the current route.", workoutDelivery: { status: "provider_review_required", supportedHere: false } },
  {
    id: "file_import", label: "FIT / GPX / TCX / CSV", route: "local_import", status: "available", canRead: true, canWrite: false,
    note: "Available now. StrideOS stores normalized summaries locally and discards the uploaded raw bytes after parsing.",
    setup: { kind: "local", formats: ["fit", "gpx", "tcx", "csv"], maxBytes: 8_000_000 }
  },
  {
    id: "manual", label: "Manual check-ins", route: "built_in", status: "available", canRead: true, canWrite: false,
    note: "Available now for pain, effort, energy, sleep feel, and context. A watch is never required."
  },
  { id: "none", label: "No device", route: "manual", status: "available", canRead: true, canWrite: false, note: "A safe starter plan can use onboarding answers and short manual check-ins." }
];

function stravaStatus() {
  const required = ["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET", "STRAVA_REDIRECT_URI"];
  const configured = required.every((key) => Boolean(process.env[key]));
  return {
    configured,
    status: configured ? "oauth_setup_ready" : "setup_required",
    truth: configured
      ? "OAuth environment is configured; no athlete has been labeled connected."
      : "OAuth is not configured and no Strava account is connected."
  };
}

export function listConnectors() {
  const garmin = garminStatus();
  const strava = stravaStatus();
  return [
    {
      id: "garmin", label: "Garmin Connect", route: "bridge", status: garmin.configured ? "adapter_configured" : "setup_required",
      canRead: false, canWrite: true,
      note: garmin.configured
        ? "A server-side workout-write adapter URL is configured. Read sync is not implemented here; athlete authorization and every write still require their own proof and approval."
        : "No Garmin account is connected. Add an approved Garmin integration or a private bridge; workout writes remain approval-gated.",
      truth: garmin.configured ? "Adapter configured — athlete connection not asserted." : "Not connected — writes are simulated.",
      workoutDelivery: { status: garmin.configured ? "adapter_configured" : "setup_required", route: "structured workout bridge", supportedHere: true, approval: "every_write" },
      setup: {
        kind: "server_bridge", requiredEnvironment: ["GARMIN_BRIDGE_URL"], optionalEnvironment: ["GARMIN_BRIDGE_TOKEN"],
        methods: [
          { id: "official_training_api", label: "Garmin Connect Training API", recommended: true, status: "provider_approval_required", guide: "docs/SELF_SERVICE_CONNECTORS.md#garmin-official-route" },
          { id: "community_local_bridge", label: "Local community Python bridge", recommended: false, status: "self_hosted", unofficial: true, guide: "docs/SELF_SERVICE_CONNECTORS.md#garmin-local-community-route" },
          { id: "simulation", label: "Safe simulation", recommended: false, status: "available" }
        ]
      }
    },
    ...staticConnectors.map((connector) => connector.id === "strava" ? { ...connector, status: strava.status, truth: strava.truth } : { ...connector })
  ];
}

export function sourcePriority(onboarding) {
  const selected = Array.isArray(onboarding?.profile?.data?.sources) ? onboarding.profile.data.sources : [];
  const primary = onboarding?.profile?.data?.primarySource;
  const ordered = [primary, ...selected, "file_import", "manual"].filter(Boolean);
  return [...new Set(ordered)].filter((id) => listConnectors().some((connector) => connector.id === id));
}

export function connectorFreshnessPolicy() {
  return {
    freshHours: 36,
    agingHours: 96,
    labels: {
      fresh: "Fresh enough for a daily coaching decision",
      aging: "Use with current manual feedback",
      stale: "Refresh or add a manual check-in before adapting the plan"
    }
  };
}
