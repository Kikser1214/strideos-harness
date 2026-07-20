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
const upstreamPolicySource = "rules/connector-playbooks.json";

function routeClass(type) {
  if (type === "official_mcp" || type === "official_api" || type === "native_companion") return "official";
  if (type === "assisted_browsing") return "assisted_browser";
  if (type === "file_import") return "file";
  if (type === "manual") return "manual";
  return "unknown";
}

function availableReason(type) {
  const category = routeClass(type);
  if (category === "official") return "official_route_available";
  if (category === "assisted_browser") return "assisted_browser_available";
  if (category === "file") return "file_route_available";
  if (category === "manual") return "manual_route_available";
  return "route_available";
}

function upstreamPolicyProvenance(playbooks, provider = null) {
  return {
    scope: "upstream_recommendation_catalog",
    origin: "upstream_playbook",
    source: upstreamPolicySource,
    schemaVersion: playbooks?.schemaVersion || null,
    reviewedAt: provider?.reviewedAt || playbooks?.lastReviewedAt || null
  };
}

function assistedBrowserPolicyProvenance(surface) {
  return {
    scope: "current_host_session",
    origin: "host_capability",
    source: `host:${surface}:assisted_browser`,
    upstreamSupport: "universal_attended_route",
    setupInstructionsIncluded: false
  };
}

function installationOmitsRecommendation(route, installationPolicy = {}) {
  const blockedIds = Array.isArray(installationPolicy.disabledRouteIds) ? installationPolicy.disabledRouteIds : [];
  const blockedTypes = Array.isArray(installationPolicy.disabledRouteTypes) ? installationPolicy.disabledRouteTypes : [];
  return blockedIds.includes(route.id) || blockedTypes.includes(route.type);
}

function browserContract(playbooks) {
  const contract = playbooks?.assistedBrowsingContract || {};
  return {
    attendedOnly: true,
    supportsScheduled: false,
    supportsHeadless: false,
    loginOwner: "user",
    credentialHandling: "forbidden",
    readProvenance: contract.readProvenance || "browser_read",
    writeApproval: contract.writeApproval || "exact_one_time_expiring",
    dryRunRequired: true,
    maxWritesPerApproval: 1,
    rawHtmlStored: false,
    sessionMaterialStored: false
  };
}

export function loadConnectorPlaybooks() {
  return JSON.parse(fs.readFileSync(playbookUrl, "utf8"));
}

function routeSupports(route, capability) {
  return !capability || route.capabilities?.includes(capability) || route.capabilities?.includes("*");
}

export function assistedBrowsingAvailable({
  surface = null,
  attended = false,
  scheduled = false,
  headless = false,
  browserToolAvailable = false,
  loginOwner = "user",
  credentialHandling = "forbidden"
} = {}) {
  return typeof surface === "string"
    && surface.length > 0
    && attended === true
    && scheduled !== true
    && headless !== true
    && browserToolAvailable === true
    && loginOwner === "user"
    && credentialHandling === "forbidden";
}

function browserRouteAllowed(route, { surface, attended, scheduled, headless, browserToolAvailable }) {
  if (route.type !== "assisted_browsing") return true;
  return assistedBrowsingAvailable({ surface, attended, scheduled, headless, browserToolAvailable });
}

function universalBrowserRoute(provider, capability, playbooks, webAppUrl = null) {
  if (!provider || !webAppUrl) return null;
  return {
    id: `${provider.id}_assisted_browser`,
    type: "assisted_browsing",
    providerPermittedForIndividual: null,
    providerPermissionClaim: "not_evaluated_by_plugin",
    status: "available_attended",
    capabilities: capability ? [capability] : ["*"],
    capabilityBoundAtRuntime: true,
    routeOrigin: "host_assisted_browser",
    upstreamSupport: "host_delegated",
    executionAuthority: "host",
    recommendationOnly: true,
    recommendationNonExclusive: true,
    webAppUrl,
    browserContract: browserContract(playbooks),
    ...(capability?.startsWith("write_") ? {
      writeContract: { dryRunRequired: true, approval: "exact_one_time_expiring", maxWritesPerApproval: 1, verificationRequired: true }
    } : {})
  };
}

function modelContextReasonClassification(reason) {
  if (/prohibited|blocked|mcp_only|route_not_allowed/.test(reason || "")) return "upstream_route_not_recommended";
  if (/not_established|policy_review_required|unknown_or_unpermitted_route/.test(reason || "")) return "upstream_route_not_established";
  if (/disclosure_required|consent_required/.test(reason || "")) return "recommendation_requirements_unmet";
  return "recommendation_requirements_unmet";
}

function attendedBrowserModelContext(purpose) {
  if (purpose === "model_training" || purpose === "model_evaluation") {
    return { allowed: false, purpose, reason: "attended_browser_not_authorized_for_training_or_evaluation" };
  }
  return { allowed: true, purpose, reason: purpose === "model_inference" ? "user_attended_browser_evidence" : "not_model_context" };
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
  browserToolAvailable = null,
  hostCapabilities = {},
  recommendationPreferences = null,
  installationPolicy = {},
  playbooks = loadConnectorPlaybooks()
} = {}) {
  const provider = playbooks.providers.find((item) => item.id === providerId);
  if (!provider) return [];
  const hostBrowserAvailable = browserToolAvailable === true
    || hostCapabilities?.assistedBrowsing === true
    || hostCapabilities?.computerUse === true;
  const hostWebAppUrl = hostCapabilities?.providerWebAppUrls?.[providerId]
    || hostCapabilities?.providerWebAppUrl
    || provider.webAppUrl
    || null;
  const localRecommendationPreferences = recommendationPreferences || installationPolicy;

  const rank = new Map(playbooks.routePrecedence.map((type, index) => [type, index]));
  const upstream = (provider?.permittedRoutes || [])
    .filter((route) => route.providerPermittedForIndividual === true)
    .filter((route) => routeSupports(route, capability))
    .filter((route) => browserRouteAllowed(route, { surface, attended, scheduled, headless, browserToolAvailable: hostBrowserAvailable }))
    .map((route) => {
      const modelContext = evaluateModelContextPolicy({ providerId, routeId: route.id, purpose, disclosureAccepted, consentRecorded, playbooks });
      const omittedByLocalPreference = installationOmitsRecommendation(route, localRecommendationPreferences);
      const selectable = selectableStatuses.has(route.status) && modelContext.allowed && !omittedByLocalPreference;
      return {
        ...route,
        providerId,
        label: routeLabels[route.type] || route.type,
        routeClass: routeClass(route.type),
        routeOrigin: "upstream_playbook",
        recommendationOnly: true,
        recommendationNonExclusive: true,
        executionAuthority: "provider_or_host",
        policyProvenance: upstreamPolicyProvenance(playbooks, provider),
        ...(route.type === "assisted_browsing" ? {
          browserContract: browserContract(playbooks),
          ...(capability?.startsWith("write_") ? {
            writeContract: { dryRunRequired: true, approval: "exact_one_time_expiring", maxWritesPerApproval: 1, verificationRequired: true }
          } : {})
        } : {}),
        modelContext,
        reasonClassification: selectable
          ? availableReason(route.type)
          : omittedByLocalPreference
            ? "recommendation_omitted_by_local_preference"
            : !selectableStatuses.has(route.status)
              ? "missing_implementation"
              : modelContextReasonClassification(modelContext.reason),
        selectable
      };
    });

  const browserAvailable = provider && assistedBrowsingAvailable({
    surface,
    attended,
    scheduled,
    headless,
    browserToolAvailable: hostBrowserAvailable
  });
  const browser = browserAvailable && !upstream.some((route) => route.type === "assisted_browsing")
    ? universalBrowserRoute(provider, capability, playbooks, hostWebAppUrl)
    : null;
  if (browser) {
    const omittedByLocalPreference = installationOmitsRecommendation(browser, localRecommendationPreferences);
    const modelContext = attendedBrowserModelContext(purpose);
    upstream.push({
      ...browser,
      providerId,
      label: routeLabels.assisted_browsing,
      routeClass: "assisted_browser",
      recommendationOnly: true,
      recommendationNonExclusive: true,
      executionAuthority: "host",
      policyProvenance: assistedBrowserPolicyProvenance(surface),
      modelContext,
      reasonClassification: omittedByLocalPreference
        ? "recommendation_omitted_by_local_preference"
        : modelContext.allowed
          ? "assisted_browser_available"
          : "upstream_route_not_established",
      selectable: !omittedByLocalPreference && modelContext.allowed
    });
  }

  return upstream.sort((a, b) => (rank.get(a.type) ?? 999) - (rank.get(b.type) ?? 999));
}

export function resolveProviderRoute(options = {}) {
  return resolveProviderRoutes(options).find((route) => route.selectable) || null;
}

function routeDecisionMessage(reasonClassification, providerId) {
  const provider = providerId || "this provider";
  if (reasonClassification === "upstream_route_not_recommended") {
    return `The upstream catalog does not recommend this route for ${provider}. This is recommendation metadata, not a StrideOS enforcement decision.`;
  }
  if (reasonClassification === "upstream_route_not_established") {
    return `The installed upstream playbook does not establish a recommended route for this capability on ${provider}. Other user-directed host capabilities remain outside plugin scope.`;
  }
  if (reasonClassification === "missing_implementation") {
    return "The route is described, but the current host does not expose the required adapter or capability.";
  }
  if (reasonClassification === "recommendation_requirements_unmet") {
    return "The consent or disclosure requirements for this upstream recommendation are not complete. This is not a prohibition on user-directed host capabilities.";
  }
  if (reasonClassification === "recommendation_omitted_by_local_preference") {
    return "This route was omitted from StrideOS suggestions by a local recommendation preference. Execution through a user-selected host capability remains outside plugin scope.";
  }
  if (reasonClassification === "host_capability_context_missing") {
    return "The host reports a browser/computer tool, but the current request is not in a visible attended session. StrideOS does not disable the host capability.";
  }
  return "A recommended route is available. Execution and authorization remain with the provider or host.";
}

export function resolveProviderRouteDecision({
  userDirectedCapability = null,
  requestedRouteId = null,
  ...options
} = {}) {
  if (userDirectedCapability?.explicit === true) {
    const kind = userDirectedCapability.kind || "host_capability";
    const browserLike = kind === "assisted_browsing" || kind === "computer_use" || kind === "browser";
    const writeRequested = userDirectedCapability.operation === "write"
      || String(userDirectedCapability.capability || options.capability || "").startsWith("write_");
    return {
      outcome: "delegate_to_host",
      reasonClassification: "outside_plugin_scope",
      pluginAuthority: "recommendation_only",
      recommendationNonExclusive: true,
      enforcement: false,
      route: null,
      requestedCapability: {
        kind,
        id: userDirectedCapability.id || null,
        capability: userDirectedCapability.capability || options.capability || null
      },
      hostRequirements: {
        permissionOwner: "host",
        loginOwner: "user",
        credentialsOrMfaHandledByPlugin: false,
        ...(browserLike ? { attendedOnly: true, scheduled: false, headless: false } : {}),
        ...(writeRequested ? {
          dryRunRequired: true,
          approval: "exact_one_time_expiring",
          maxWritesPerApproval: 1,
          verificationRequired: true
        } : {})
      },
      message: "This capability was explicitly chosen by the user and is outside the plugin's recommendation scope. Delegate execution and permission checks to the host; StrideOS neither approves nor vetoes it."
    };
  }

  const routes = resolveProviderRoutes(options);
  const requested = requestedRouteId ? routes.find((route) => route.id === requestedRouteId) : null;
  const selected = requestedRouteId
    ? (requested?.selectable ? requested : null)
    : routes.find((route) => route.selectable) || null;
  if (selected) {
    return {
      outcome: "recommendation",
      reasonClassification: selected.reasonClassification,
      pluginAuthority: "recommendation_only",
      recommendationNonExclusive: true,
      enforcement: false,
      route: selected,
      policyProvenance: selected.policyProvenance,
      message: routeDecisionMessage(selected.reasonClassification, options.providerId)
    };
  }

  const provider = options.playbooks?.providers?.find((item) => item.id === options.providerId)
    || loadConnectorPlaybooks().providers.find((item) => item.id === options.providerId);
  const configuredRoute = provider?.permittedRoutes?.find((route) => route.id === requestedRouteId)
    || provider?.permittedRoutes?.find((route) => routeSupports(route, options.capability));
  let reasonClassification = "upstream_route_not_established";
  if (configuredRoute) {
    if (installationOmitsRecommendation(configuredRoute, options.recommendationPreferences || options.installationPolicy)) {
      reasonClassification = "recommendation_omitted_by_local_preference";
    } else if (!selectableStatuses.has(configuredRoute.status)) {
      reasonClassification = "missing_implementation";
    } else {
      const modelContext = evaluateModelContextPolicy({
        providerId: options.providerId,
        routeId: configuredRoute.id,
        purpose: options.purpose,
        disclosureAccepted: options.disclosureAccepted,
        consentRecorded: options.consentRecorded,
        playbooks: options.playbooks
      });
      if (!modelContext.allowed) reasonClassification = modelContextReasonClassification(modelContext.reason);
    }
  } else if (requestedRouteId?.endsWith("_assisted_browser")) {
    const hostHasBrowser = options.browserToolAvailable === true
      || options.hostCapabilities?.assistedBrowsing === true
      || options.hostCapabilities?.computerUse === true;
    reasonClassification = hostHasBrowser ? "host_capability_context_missing" : "missing_implementation";
  }

  const policyProvenance = upstreamPolicyProvenance(options.playbooks || loadConnectorPlaybooks(), provider);
  return {
    outcome: "no_recommendation",
    reasonClassification,
    pluginAuthority: "recommendation_only",
    recommendationNonExclusive: true,
    enforcement: false,
    route: null,
    policyProvenance,
    message: routeDecisionMessage(reasonClassification, options.providerId)
  };
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
  browserToolAvailable = null,
  hostCapabilities = {},
  providerWebAppUrl = null,
  recommendationPreferences = null,
  installationPolicy = {},
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
    browserToolAvailable,
    hostCapabilities: providerWebAppUrl ? { ...hostCapabilities, providerWebAppUrl } : hostCapabilities,
    recommendationPreferences,
    installationPolicy,
    playbooks
  })
    .find((item) => item.type === "assisted_browsing" && item.id === routeId && item.selectable);
  if (!route) {
    throw new TypeError(`The current host does not expose the required attended browser capability for ${providerId || "this provider"}.`);
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
  const configuredWebAppUrl = providerWebAppUrl || route.webAppUrl || provider?.webAppUrl || null;
  const providerPage = configuredWebAppUrl ? new URL(configuredWebAppUrl) : null;
  if (parsed.protocol !== "https:" || !providerPage || parsed.origin !== providerPage.origin) {
    throw new TypeError("Browser-read provenance must reference the configured provider web-app origin.");
  }
  const visiblePage = `${parsed.origin}${parsed.pathname}`;

  return {
    providerId,
    source: providerId,
    provenance: "browser_read",
    ingestionRoute: "browser_read",
    routeId,
    routeClass: "assisted_browser",
    routeOrigin: route.routeOrigin,
    policyProvenance: route.policyProvenance,
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
    const hostBrowserRecord = provider
      && record?.routeId === `${provider.id}_assisted_browser`
      && record?.routeClass === "assisted_browser"
      && record?.routeOrigin === "host_assisted_browser";
    const expectedProvenance = route?.type === "assisted_browsing" || hostBrowserRecord ? "browser_read" : route?.type || null;
    if (!expectedProvenance || record?.provenance !== expectedProvenance || record?.ingestionRoute !== expectedProvenance) {
      excluded.push({ id: record?.id || null, providerId: record?.providerId || "unknown", routeId: record?.routeId || null, reason: "missing_or_mismatched_provenance" });
      continue;
    }
    if (hostBrowserRecord) {
      const observedAt = Date.parse(record?.observedAt || "");
      const retrievedAt = Date.parse(record?.retrievedAt || "");
      const freshnessTimestamp = Date.parse(record?.freshnessTimestamp || "");
      if (!Number.isFinite(observedAt) || !Number.isFinite(retrievedAt) || !Number.isFinite(freshnessTimestamp)
        || observedAt > retrievedAt || retrievedAt !== freshnessTimestamp) {
        excluded.push({ id: record?.id || null, providerId: record?.providerId || "unknown", routeId: record?.routeId || null, reason: "missing_or_invalid_browser_freshness" });
        continue;
      }
    }
    const decision = hostBrowserRecord
      ? attendedBrowserModelContext(purpose)
      : evaluateModelContextPolicy({
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
  if (provider.webAppUrl) {
    return "The current host may offer attended browser or computer use alongside these non-exclusive upstream recommendations. The user signs in; the plugin never handles credentials.";
  }
  return provider.limitations?.[0] || "Use a provider export or a manual check-in; no direct individual route is claimed.";
}

export function listConnectors({ surface = null, attended = false, hostCapabilities = {}, browserToolAvailable = null } = {}) {
  const playbooks = loadConnectorPlaybooks();
  const providers = playbooks.providers.map((provider) => {
    const context = { surface, attended, hostCapabilities, browserToolAvailable, playbooks };
    const preferredRead = resolveProviderRoute({ providerId: provider.id, capability: "read_activity", ...context });
    const preferredWrite = resolveProviderRoute({ providerId: provider.id, capability: "write_workout", ...context });
    const methods = provider.permittedRoutes.map((route, index) => ({
      id: route.id,
      type: route.type,
      label: routeLabels[route.type] || route.type,
      recommended: index === 0,
      status: route.status,
      attendedOnly: route.type === "assisted_browsing",
      executorImplemented: route.type !== "assisted_browsing" ? true : null,
      executionAuthority: route.type === "assisted_browsing" ? "host" : "provider_or_host"
    }));
    const hostWebAppUrl = hostCapabilities?.providerWebAppUrls?.[provider.id]
      || hostCapabilities?.providerWebAppUrl
      || provider.webAppUrl
      || null;
    if (hostWebAppUrl) methods.push({
      id: `${provider.id}_assisted_browser`,
      type: "assisted_browsing",
      label: routeLabels.assisted_browsing,
      recommended: false,
      status: preferredRead?.type === "assisted_browsing" || preferredWrite?.type === "assisted_browsing" ? "available_attended" : "host_capability_required",
      attendedOnly: true,
      executorImplemented: null,
      executionAuthority: "host"
    });

    return {
      id: provider.id,
      label: provider.label,
      route: preferredRead?.type || preferredWrite?.type || "manual",
      status: connectorStatus(provider, preferredRead, preferredWrite),
      canRead: provider.permittedRoutes.some((route) => route.capabilities?.some((capability) => capability.startsWith("read_"))),
      canWrite: provider.permittedRoutes.some((route) => route.capabilities?.some((capability) => capability.startsWith("write_"))) || Boolean(hostWebAppUrl),
      note: connectorNote(provider, preferredRead, preferredWrite),
      truth: "No persistent provider session is claimed. Browser session state is ephemeral and user-owned.",
      workoutDelivery: preferredWrite ? {
        status: preferredWrite.status,
        route: preferredWrite.label,
        supportedHere: preferredWrite.type === "assisted_browsing",
        attendedOnly: preferredWrite.type === "assisted_browsing",
        approval: "exact_one_time"
      } : hostWebAppUrl
        ? { status: "host_capability_required", supportedHere: false, attendedOnly: true, approval: "exact_one_time", availableWhen: "the current host exposes attended browser or computer use" }
        : { status: "not_available_in_upstream_recommendations", supportedHere: false },
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
