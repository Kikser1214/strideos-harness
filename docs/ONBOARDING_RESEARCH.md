# Onboarding research and provider-route truth matrix

Last reviewed: 2026-07-20

This document records the sources behind the `coach-athlete` first-run questions and keeps official provider recommendations, host capabilities, and user-supplied tools clearly separated.

## Safety and general activity

- The official [PAR-Q+ pathway](https://eparmedx.com/) begins with seven general health questions and routes indicated users through follow-up or a qualified exercise/health professional. StrideOS links to that tool and uses its own conservative safety gate; it does not reproduce the copyrighted form or diagnose a user.
- The [WHO physical activity guidelines](https://www.who.int/publications/i/item/9789240015128) state that some activity is better than none and that inactive adults should start with small amounts and gradually increase frequency, intensity, and duration.
- The [CDC adult activity guidance](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html) recommends aerobic activity plus muscle-strengthening work for all major muscle groups on two or more days per week. StrideOS treats strength as a core plan component and adapts the dose to experience, equipment, recovery, and running load.
- The [NIH Office of Dietary Supplements](https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-Consumer/) emphasizes adequate diet, fluids, training, and qualified guidance before performance supplements. StrideOS inventories supplement use and interactions/concerns instead of automatically prescribing products.
- The [2025–2030 Dietary Guidelines for Americans](https://cdn.realfood.gov/DGA_508.pdf) support varied nutrient-dense foods, hydration, and individual context; StrideOS does not assign one generic calorie target.
- [FDA food allergy guidance](https://www.fda.gov/food/buy-store-serve-safe-food/food-allergies-what-you-need-know) makes declared allergies hard constraints. A meal image is never presented as proof of ingredients, allergen safety, or cross-contact safety.
- The [NICE eating-disorder guideline](https://www.nice.org.uk/guidance/ng69) anchors the protected route: relevant concerns switch automated support to number-free behavior and qualified-care guidance instead of more restrictive tracking.

## Provider route matrix

StrideOS provides official recommendations; it does not define an allowlist. A playbook exposes only provider-documented official routes. Official self-service API/MCP/native access is preferred, followed by attended browser/computer use when the current AI surface exposes it, official export/local import, and manual entry. A user-supplied script, plugin, or adapter remains outside the recommendation layer.

| Source | Useful signals or actions | Honest individual route | Limitations shown during onboarding |
| --- | --- | --- | --- |
| Garmin Connect | exported activity evidence and manual context | Athlete-selected official export and local file import; manual | Developer access is application/business reviewed; attended host browser/computer use is the universal second tier, including one approved workout/calendar write |
| Strava | activity history and routes | Official Strava MCP where available; athlete-initiated official export; manual | Prefer the MCP for structured reads; do not teach an unofficial API substitute; attended host browser/computer use remains available |
| Apple Watch / Apple Health | workouts, activity, heart rate, sleep, and other authorized HealthKit types | User-authorized iOS companion; XML export after an adapter exists; manual | No desktop/web HealthKit store; permission is per type; recovery means raw authorized signals, not a provider score |
| Android Health Connect | activity, body measurements, nutrition, sleep, and vitals | User-authorized Android companion; backup archive only after format validation; manual | Android-only on-device store; planned-exercise writes do not prove watch delivery; recovery means raw authorized records |
| Fitbit / Pixel Watch | provider-supported health and activity data | Official Google Health API with scoped setup, disclosure, and consent; official export; manual | Public API use may require verification; attended host browser/computer use remains available |
| Oura | sleep, readiness, and activity | Official Oura MCP where compatible; manual | Keep current model-use and retention requirements visible; attended host browser/computer use remains available |
| WHOOP | recovery, strain, sleep, and workouts | Official API/export after current consent, retention, and model-use review; manual | Do not teach an unofficial connector; attended host browser/computer use remains available |
| Polar | training and health data where permitted | Verified individual AccessLink route when current terms allow; otherwise official export/manual | Planned workout delivery must not be inferred from read access |
| COROS | activity, health, recovery, fitness, and calendar data | Official user-authorized read-only COROS MCP; official export; manual | MCP is read-only; direct API access is application-reviewed; attended host browser/computer use remains available |
| Suunto | activities and device-vendor data visible to the athlete | Official export/manual | Partner-only API access remains unavailable and is not a setup option |
| FIT / GPX / TCX / CSV | exported activities and user-provided history | Local file import | Point-in-time data; user must refresh it |
| Attended browser/computer use | relevant visible values and one approved visible write | Any interactive AI surface that exposes the capability; user-authenticated and attended | Store `source: <providerId>`, `provenance: "browser_read"`, `ingestionRoute: "browser_read"`, and freshness; no raw session material; never scheduled/headless |
| User-supplied script/plugin/tool | capability selected by the athlete | Outside StrideOS route guidance | Agent handles it through the host as if StrideOS were absent; not bundled or supported by upstream |
| Manual check-in | pain, RPE, energy, sleep feel, barriers, and context a watch cannot know | Built in | Subjective by design; always retained with source and timestamp |

Primary platform sources:

- [Garmin Connect Developer Program](https://developer.garmin.com/gc-developer-program/)
- [Garmin Health API](https://developer.garmin.com/gc-developer-program/health-api/)
- [Garmin Connect Developer Program FAQ](https://developer.garmin.com/gc-developer-program/program-faq/)
- [Garmin Terms of Use](https://www.garmin.com/en-US/legal/terms-of-use/)
- [Strava API Policy](https://www.strava.com/legal/api_policy)
- [Strava Terms of Service](https://www.strava.com/legal/terms)
- [Strava data export](https://support.strava.com/hc/en-us/articles/216918437-Exporting-your-Data-and-Bulk-Export)
- [Strava MCP connector](https://support.strava.com/en-us/articles/15401531-strava-mcp-connector)
- [Apple HealthKit authorization](https://developer.apple.com/documentation/HealthKit/authorizing-access-to-health-data)
- [Apple HealthKit setup](https://developer.apple.com/documentation/healthkit/setting-up-healthkit)
- [Apple Health export](https://support.apple.com/guide/iphone/share-your-health-data-iph5ede58c3d/ios)
- [Apple health data and iCloud.com](https://support.apple.com/en-us/102630)
- [Android Health Connect data types](https://developer.android.com/health-and-fitness/health-connect/data-types)
- [Android Health Connect availability](https://developer.android.com/health-and-fitness/health-connect/availability)
- [Health Connect export and backup](https://support.google.com/android/answer/15323271?hl=en)
- [COROS MCP guide](https://support.coros.com/hc/en-us/articles/50841795180948-COROS-MCP-A-Guide-to-Connecting-Your-Training-Data-to-AI)
- [COROS Terms of Service](https://www.coros.com/terms)
- [Google Health API setup](https://developers.google.com/health/setup)
- [Google Health developer data policy](https://developers.google.com/health/policies/health-api-developer-user-data-policy)
- [Oura API and MCP Agreement](https://cloud.ouraring.com/legal/api-agreement)
- [WHOOP Terms](https://www.whoop.com/us/en/whoop-terms-of-use/)
- [WHOOP API Terms](https://developer.whoop.com/api-terms-of-use/)

## Required onboarding domains

1. Identity and context: preferred name, age band, locale, timezone, and units. Exact date of birth, sex, height, and weight stay optional unless needed for a chosen feature.
2. Current movement: inactivity, walking, running, other sports, recent consistency, weekly volume, longest recent session, benchmark, and time away.
3. Strength: prior/current experience, weekly frequency, movement confidence, coaching history, available equipment, limitations, likes/dislikes, and desired emphasis.
4. Safety: current pain, recent injury/surgery, concerning symptoms, known conditions, medication considerations, pregnancy/postpartum when relevant, and existing clearance. Positive signals stop automated prescription and route to qualified review.
5. Goal: general health, cardio, habit, return, race completion/performance, trail, strength, or another athlete-defined outcome; event date and target are optional.
6. Real-life capacity: available days, minutes per session, work/shift pattern, sleep, stress, caregiving, surface, climate, treadmill/gym access, and recurring barriers.
7. Data: owned devices/apps, primary source, exact per-provider read scopes (activities, workout details, route/elevation, recovery, sleep, and optional weight trend), desired history, read-now versus later timing, separately requested write capabilities, official route, current host browser/computer-use capability, user-supplied tool choice, import fallback, freshness, and consent.
8. Training preference: recommend-for-me or a named approach, intensity tolerance, social/solo, indoor/outdoor, disliked sessions, coaching tone, and desired explanation depth.
9. Nutrition: opt-in level, dietary pattern, allergies/intolerances, medically prescribed diet, cooking access, budget, hydration, routine meals, supplements, photo use, and number-free preference.
10. Delivery and privacy: dashboard, briefings, weekly review, schedule, approval rules, local/cloud processing, the bundled no-retention photo rule, export, and deletion.

## Recommendation rules

- Conversational onboarding uses the schema's eight grouped rounds. A natural-language answer may populate several granular fields; the agent reflects what it extracted and asks only for missing required information, safety ambiguity, or an explicit permission decision. Grouping must not delete useful athlete-map fields.
- Complete an explicitly authorized read-now step before asking the athlete to manually reproduce source-observable history. Summarize each provider's exact scopes, history window, and timing for confirmation first. If the read cannot complete, ask whether to pause or continue with a clearly provisional interview-only plan.

- Strength is always considered. For an eligible adult beginner, the default is two short technique-first full-body sessions, adjusted downward when the starting capacity cannot yet support them. Established athletes keep or progress strength according to experience and race load.
- Named methods are preferences, not commands. The agent researches the exact method and checks suitability before proposing it. “Norwegian” may refer to threshold-focused systems used by advanced endurance athletes; “African” is not treated as one method.
- A plan cannot be finalized when a safety gate is active. The user can still save onboarding answers and receive a clear next step.
- Missing wearable data reduces confidence; it never prevents a manual plan for an otherwise eligible user.
- Offer attended browser/computer use whenever the current interactive surface exposes it. The user completes login/MFA; reads store `source: <providerId>`, `provenance: "browser_read"`, `ingestionRoute: "browser_read"`, and freshness; the route never becomes a scheduled sync.
- Every provider/browser write requires a separate dry-run, one exact approval, one visible write, and provider-side verification. Login, source selection, plan approval, and one provider write are distinct permissions.
- If the user explicitly supplies a local script, another plugin, or an adapter, StrideOS guidance steps aside. The host handles it under ordinary permissions and write approval; the public plugin neither blocks it nor teaches its setup recipe.
- Nutrition support is optional. Number-free support is available, and uncertain photo estimates require confirmation before logging.
