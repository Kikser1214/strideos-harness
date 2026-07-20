import fs from "node:fs";

const playbookUrl = new URL("../rules/connector-playbooks.json", import.meta.url);

const routeLabels = {
  official_mcp: "Official provider MCP",
  official_api: "Official self-service API",
  native_companion: "User-owned native companion",
  assisted_browsing: "Attended web session",
  file_import: "Provider export and local import",
  manual: "Manual check-in"
};

const selectableStatuses = new Set(["available", "available_attended", "setup_required", "companion_required"]);
const modelPurposes = new Set(["model_inference", "model_training", "model_evaluation"]);
const nonModelPurposes = new Set(["access", "local_analysis"]);
const routeModelBlocks = new Set(["blocked_for_llm_context", "local_only_until_policy_review", "policy_review_required"]);

export function loadConnectorPlaybooks() {
  return JSON.parse(fs.readFileSync(playbookUrl, "utf8"));
}

function routeSupports(route, capability) {
  return !capability || route.capabilities?.includes(capability);
}

export function assistedBrowsingAvailable({ classification, executorImplemented = false, surface = null, attended = false, scheduled = false, headless = false } = {}) {
  return classification === "permitted" && executorImplemented === true && surface === "codex_desktop" && attended === true && scheduled !== true && headless !== true;
}

function browserRouteAllowed(provider, route, { surface, attended, scheduled, headless }, executorEnabled) {
  if (route.type !== "assisted_browsing") return true;
  return assistedBrowsingAvailable({ classification: provider.assistedBrowsingClassification, executorImplemented: executorEnabled === true && route.executorImplemented === true, surface, attended, scheduled, headless });
}

export function evaluateModelContextPolicy({
  providerId,
  routeId,
  purpose = "model_inference",
  disclosureAccepted = false,
  consentRecorded = false,
  playbooks = loadConnectorPlaybooks()
} = {}) {
  if (nonModelPurposes.has(purpose)) {
    return { allowed: true, purpose, reason: "not_model_context" };
  }
  if (!modelPurposes.has(purpose)) return { allowed: false, purpose, reason: "unknown_purpose" };

  const provider = playbooks.providers.find((item) => item.id === providerId);
  if (!provider) return { allowed: false, purpose, reason: "unknown_provider" };
  const route = provider.permittedRoutes.find((item) => item.id === routeId);
  if (!route || route.providerPermittedForIndividual !== true) {
    return { allowed: false, purpose, reason: "unknown_or_unpermitted_route" };
  }
  if (route.type === "manual") {
    return purpose === "model_inference"
      ? { allowed: true, purpose, reason: "athlete_supplied_manual_evidence" }
      : { allowed: false, purpose, reason: "manual_evidence_not_authorized_for_training_or_evaluation" };
  }
  if (routeModelBlocks.has(route.modelContextPolicy)) {
    return { allowed: false, purpose, reason: route.modelContextPolicy };
  }

  const policy = provider.modelContextPolicy;
  if (!policy) {
    return purpose === "model_inference"
      ? { allowed: true, purpose, reason: "no_provider_model_inference_restriction_recorded" }
      : { allowed: false, purpose, reason: "provider_training_or_evaluation_not_established" };
  }
  if (purpose === "model_training") {
    return { allowed: policy.training === "permitted", purpose, reason: policy.training || "not_established" };
  }
  if (purpose === "model_evaluation") {
    return { allowed: policy.evaluation === "permitted", purpose, reason: policy.evaluation || "not_established" };
  }
  if (Array.isArray(policy.allowedRoutes) && !policy.allowedRoutes.includes(route.id)) {
    return { allowed: false, purpose, reason: "route_not_allowed_for_model_context" };
  }
  if (policy.status === "not_established") {
    return { allowed: false, purpose, reason: "provider_model_context_not_established" };
  }
  if (policy.status === "mcp_only" && route.type !== "official_mcp") {
    return { allowed: false, purpose, reason: "provider_model_context_mcp_only" };
  }
  if (policy.inference === "policy_review_required") {
    return { allowed: false, purpose, reason: "provider_model_context_policy_review_required" };
  }
  if (policy.inference === "visible_health_or_fitness_feature_with_disclosure_and_consent") {
    if (disclosureAccepted !== true) return { allowed: false, purpose, reason: "model_context_disclosure_required" };
    if (consentRecorded !== true) return { allowed: false, purpose, reason: "model_context_consent_required" };
    return { allowed: true, purpose, reason: "disclosure_and_consent_recorded" };
  }
  return { allowed: true, purpose, reason: "provider_model_inference_permitted" };
}

export function resolveProviderRoutes({
  providerId,
  capability = null,
  purpose = "access",
  disclosureAccepted = false,
  consentRecorded = false,
  surface = null,
  attended = false,
  scheduled = false,
  headless = false,
  playbooks = loadConnectorPlaybooks()
} = {}) {
  const provider = playbooks.providers.find((item) => item.id === providerId);
  if (!provider) return [];

  const rank = new Map(playbooks.routePrecedence.map((type, index) => [type, index]));
  return provider.permittedRoutes
    .filter((route) => route.providerPermittedForIndividual === true)
    .filter((route) => routeSupports(route, capability))
    .filter((route) => browserRouteAllowed(provider, route, { surface, attended, scheduled, headless }, playbooks.assistedBrowsingContract?.executorEnabled))
    .map((route) => {
      const modelContext = evaluateModelContextPolicy({ providerId, routeId: route.id, purpose, disclosureAccepted, consentRecorded, playbooks });
      return {
        ...route,
        providerId,
        label: routeLabels[route.type] || route.type,
        modelContext,
        selectable: selectableStatuses.has(route.status) && modelContext.allowed
      };
    })
    .sort((a, b) => (rank.get(a.type) ?? 999) - (rank.get(b.type) ?? 999));
}

export function resolveProviderRoute(options = {}) {
  return resolveProviderRoutes(options).find((route) => route.selectable) || null;
}

export function browserReadProvenance({
  providerId,
  routeId,
  capability = "read_activity",
  observedAt,
  retrievedAt = new Date().toISOString(),
  pageUrl,
  surface = null,
  attended = false,
  scheduled = false,
  headless = false,
  disclosureAccepted = false,
  consentRecorded = false,
  playbooks = loadConnectorPlaybooks()
} = {}) {
  const provider = playbooks.providers.find((item) => item.id === providerId);
  const route = resolveProviderRoutes({
    providerId,
    capability,
    purpose: "model_inference",
    disclosureAccepted,
    consentRecorded,
    surface,
    attended,
    scheduled,
    headless,
    playbooks
  })
    .find((item) => item.type === "assisted_browsing" && item.id === routeId && item.selectable);
  if (!route) {
    throw new TypeError(`Attended browser reading is not a permitted route for ${providerId || "this provider"}.`);
  }
  if (!pageUrl) throw new TypeError("Browser-read provenance requires the visible provider page URL.");

  const observed = new Date(observedAt || retrievedAt);
  const retrieved = new Date(retrievedAt);
  if (Number.isNaN(observed.getTime()) || Number.isNaN(retrieved.getTime())) {
    throw new TypeError("Browser-read provenance requires valid timestamps.");
  }
  if (observed.getTime() > retrieved.getTime()) {
    throw new TypeError("Browser-read observation time cannot be later than its retrieval time.");
  }

  const parsed = new URL(pageUrl);
  const providerPage = provider?.webAppUrl ? new URL(provider.webAppUrl) : null;
  if (parsed.protocol !== "https:" || !providerPage || parsed.origin !== providerPage.origin) {
    throw new TypeError("Browser-read provenance must reference the permitted provider web app.");
  }
  const visiblePage = `${parsed.origin}${parsed.pathname}`;

  return {
    source: providerId,
    provenance: "browser_read",
    ingestionRoute: "browser_read",
    routeId,
    capability,
    observedAt: observed.toISOString(),
    retrievedAt: retrieved.toISOString(),
    freshnessTimestamp: retrieved.toISOString(),
    attended: true,
    browserContext: { surface, attended: true, scheduled: false, headless: false },
    page: visiblePage,
    rawHtmlStored: false,
    sessionMaterialStored: false
  };
}

export function filterProviderEvidenceForModelContext(records = [], { purpose = "model_inference", playbooks = loadConnectorPlaybooks() } = {}) {
  const included = [];
  const excluded = [];
  for (const record of Array.isArray(records) ? records : []) {
    const provider = playbooks.providers.find((item) => item.id === record?.providerId);
    const route = provider?.permittedRoutes.find((item) => item.id === record?.routeId);
    const expectedProvenance = route?.type === "assisted_browsing" ? "browser_read" : route?.type || null;
    if (!expectedProvenance || record?.provenance !== expectedProvenance || record?.ingestionRoute !== expectedProvenance) {
      excluded.push({ id: record?.id || null, providerId: record?.providerId || "unknown", routeId: record?.routeId || null, reason: "missing_or_mismatched_provenance" });
      continue;
    }
    const decision = evaluateModelContextPolicy({
      providerId: record?.providerId,
      routeId: record?.routeId,
      purpose,
      disclosureAccepted: record?.modelContext?.disclosureAccepted === true,
      consentRecorded: record?.modelContext?.consentRecorded === true,
      playbooks
    });
    if (decision.allowed) included.push(record);
    else excluded.push({ id: record?.id || null, providerId: record?.providerId || "unknown", routeId: record?.routeId || null, reason: decision.reason });
  }
  return { included, excluded };
}

function connectorStatus(provider, preferredRead, preferredWrite) {
  const preferred = preferredRead || preferredWrite;
  if (!preferred) return "manual_only";
  if (preferred.type === "assisted_browsing") return "attended_session_available";
  if (preferred.type === "native_companion") return "companion_required";
  if (preferred.type === "file_import" || preferred.type === "manual") return "file_or_manual";
  return preferred.status;
}

function connectorNote(provider, preferredRead, preferredWrite) {
  if (preferredRead?.type === "assisted_browsing" || preferredWrite?.type === "assisted_browsing") {
    return "Works in an attended web session that the user signs into. Reads keep browser_read provenance; every visible write needs one exact approval.";
  }
  if (preferredRead?.type === "official_mcp") {
    return "The provider offers a user-authorized MCP for individual AI reads. Use only its documented scopes and current read/write limits.";
  }
  if (preferredRead?.type === "official_api") {
    return "An official self-service route exists for an individual user. Setup, scopes, authorization, and provider terms must be reviewed before use.";
  }
  if (preferredRead?.type === "native_companion") {
    return "Requires a user-owned native companion and operating-system permission. A desktop browser cannot bypass that boundary.";
  }
  return provider.limitations?.[0] || "Use a provider export or a manual check-in; no direct individual route is claimed.";
}

export function listConnectors() {
  const playbooks = loadConnectorPlaybooks();
  const providers = playbooks.providers.map((provider) => {
    const preferredRead = resolveProviderRoute({ providerId: provider.id, capability: "read_activity" });
    const preferredWrite = resolveProviderRoute({ providerId: provider.id, capability: "write_workout" });
    const methods = provider.permittedRoutes.map((route, index) => ({
      id: route.id,
      type: route.type,
      label: routeLabels[route.type] || route.type,
      recommended: index === 0,
      status: route.status,
      attendedOnly: route.type === "assisted_browsing",
      executorImplemented: route.type !== "assisted_browsing" || (playbooks.assistedBrowsingContract?.executorEnabled === true && route.executorImplemented === true)
    }));

    return {
      id: provider.id,
      label: provider.label,
      route: preferredRead?.type || preferredWrite?.type || "manual",
      status: connectorStatus(provider, preferredRead, preferredWrite),
      canRead: provider.permittedRoutes.some((route) => route.capabilities?.some((capability) => capability.startsWith("read_"))),
      canWrite: provider.permittedRoutes.some((route) => route.capabilities?.some((capability) => capability.startsWith("write_"))),
      note: connectorNote(provider, preferredRead, preferredWrite),
      truth: "No persistent provider session is claimed. Browser session state is ephemeral and user-owned.",
      workoutDelivery: preferredWrite ? {
        status: preferredWrite.status,
        route: preferredWrite.label,
        supportedHere: preferredWrite.type === "assisted_browsing",
        attendedOnly: preferredWrite.type === "assisted_browsing",
        approval: "exact_one_time"
      } : { status: "not_available_for_individual", supportedHere: false },
      setup: {
        kind: "provider_playbook",
        methods,
        limitations: provider.limitations || [],
        officialSources: provider.officialSources || []
      }
    };
  });

  return [
    ...providers,
    {
      id: "file_import", label: "FIT / GPX / TCX / CSV", route: "file_import", status: "available", canRead: true, canWrite: false,
      note: "Available now. StrideOS stores normalized summaries locally and discards the raw bytes after parsing.",
      setup: { kind: "local", formats: ["fit", "gpx", "tcx", "csv"], maxBytes: 8_000_000 }
    },
    {
      id: "manual", label: "Manual check-ins", route: "manual", status: "available", canRead: true, canWrite: false,
      note: "Available now for pain, effort, energy, sleep feel, and context. A watch is never required."
    },
    { id: "none", label: "No device", route: "manual", status: "available", canRead: true, canWrite: false, note: "A safe starter plan can use onboarding answers and short manual check-ins." }
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
