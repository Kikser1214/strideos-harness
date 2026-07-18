# Onboarding research and connector truth matrix

Last reviewed: 2026-07-18

This document records the sources behind the first-run questions and prevents the interface from promising integrations that the current architecture cannot provide.

## Safety and general activity

- The official [PAR-Q+ pathway](https://eparmedx.com/) begins with seven general health questions and routes indicated users through follow-up or a qualified exercise/health professional. StrideOS links to that tool and uses its own conservative safety gate; it does not reproduce the copyrighted form or diagnose a user.
- The [WHO physical activity guidelines](https://www.who.int/publications/i/item/9789240015128) state that some activity is better than none and that inactive adults should start with small amounts and gradually increase frequency, intensity, and duration.
- The [CDC adult activity guidance](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html) recommends aerobic activity plus muscle-strengthening work for all major muscle groups on two or more days per week. StrideOS treats strength as a core plan component and adapts the dose to experience, equipment, recovery, and running load.
- The [NIH Office of Dietary Supplements](https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-Consumer/) emphasizes adequate diet, fluids, training, and qualified guidance before performance supplements. StrideOS inventories supplement use and interactions/concerns instead of automatically prescribing products.
- The [2025–2030 Dietary Guidelines for Americans](https://cdn.realfood.gov/DGA_508.pdf) support varied nutrient-dense foods, hydration, and individual context; StrideOS does not assign one generic calorie target.
- [FDA food allergy guidance](https://www.fda.gov/food/buy-store-serve-safe-food/food-allergies-what-you-need-know) makes declared allergies hard constraints. A meal image is never presented as proof of ingredients, allergen safety, or cross-contact safety.
- The [NICE eating-disorder guideline](https://www.nice.org.uk/guidance/ng69) anchors the protected route: relevant concerns switch automated support to number-free behavior and qualified-care guidance instead of more restrictive tracking.

## Connector matrix

| Source | Useful signals | Honest first release route | Limitations shown during onboarding |
| --- | --- | --- | --- |
| Garmin Connect | activities, sleep, heart rate, stress, body battery, body composition, training/calendar writes | Existing bridge contract; official production access requires Garmin developer approval | Demo is simulation until a bridge is configured; writes always require approval |
| Strava | cross-device activities, routes, summary metrics | Web OAuth 2.0 | Activity scopes only; not a complete recovery or health record |
| Apple Watch / Apple Health | workouts, activity, heart rate, sleep and other authorized HealthKit types | Planned iOS companion app or user-approved export/Strava route | A plain web server cannot directly read HealthKit; permission is per data type |
| Android Health Connect | activity, body measurements, nutrition, sleep and vitals | Planned Android companion app | Android-only; permission, background-read, and history limits apply |
| Fitbit | activity, sleep, heart rate and body measurements subject to granted scopes | Planned OAuth connector | Not implemented in the first local release |
| Oura | sleep, readiness and activity subject to API permissions | Planned OAuth connector | Useful recovery context, but not a complete run-planning source |
| WHOOP | recovery, strain, sleep and workouts subject to API permissions | Planned OAuth connector | Not implemented in the first local release |
| Polar | training and health data exposed through AccessLink | Planned OAuth connector | Not implemented in the first local release |
| COROS / Suunto | activities and device-vendor data where developer access exists | Planned partner connector or Strava relay | Availability may depend on partner approval; never shown as connected by default |
| FIT / GPX / TCX / CSV | exported activities and user-provided history | Local file import | Point-in-time data; user must refresh it |
| Manual check-in | pain, RPE, energy, sleep feel, barriers and context a watch cannot know | Built in | Subjective by design; always retained with source and timestamp |

Primary platform sources:

- [Garmin Connect Developer Program](https://developer.garmin.com/gc-developer-program/)
- [Garmin Health API](https://developer.garmin.com/gc-developer-program/health-api/)
- [Strava OAuth](https://developers.strava.com/docs/authentication/)
- [Apple HealthKit authorization](https://developer.apple.com/documentation/HealthKit/authorizing-access-to-health-data)
- [Apple HealthKit setup](https://developer.apple.com/documentation/healthkit/setting-up-healthkit)
- [Android Health Connect data types](https://developer.android.com/health-and-fitness/health-connect/data-types)
- [Android Health Connect availability](https://developer.android.com/health-and-fitness/health-connect/availability)

## Required onboarding domains

1. Identity and context: preferred name, age band, locale, timezone, and units. Exact date of birth, sex, height, and weight stay optional unless needed for a chosen feature.
2. Current movement: inactivity, walking, running, other sports, recent consistency, weekly volume, longest recent session, benchmark, and time away.
3. Strength: prior/current experience, weekly frequency, movement confidence, coaching history, available equipment, limitations, likes/dislikes, and desired emphasis.
4. Safety: current pain, recent injury/surgery, concerning symptoms, known conditions, medication considerations, pregnancy/postpartum when relevant, and existing clearance. Positive signals stop automated prescription and route to qualified review.
5. Goal: general health, cardio, habit, return, race completion/performance, trail, strength, or body-composition support; event date and target are optional.
6. Real-life capacity: available days, minutes per session, work/shift pattern, sleep, stress, caregiving, surface, climate, treadmill/gym access, and recurring barriers.
7. Data: owned devices/apps, primary source, desired history, authorization, import fallback, freshness, and consent.
8. Training preference: recommend-for-me or a named approach, intensity tolerance, social/solo, indoor/outdoor, disliked sessions, coaching tone, and desired explanation depth.
9. Nutrition: opt-in level, dietary pattern, allergies/intolerances, medically prescribed diet, cooking access, budget, hydration, routine meals, supplements, photo use, and number-free preference.
10. Delivery and privacy: dashboard, briefings, weekly review, schedule, approval rules, local/cloud processing, photo retention, export, and deletion.

## Recommendation rules

- Strength is always considered. For an eligible adult beginner, the default is two short technique-first full-body sessions, adjusted downward when the starting capacity cannot yet support them. Established athletes keep or progress strength according to experience and race load.
- Named methods are preferences, not commands. The agent researches the exact method and checks suitability before proposing it. “Norwegian” may refer to threshold-focused systems used by advanced endurance athletes; “African” is not treated as one method.
- A plan cannot be finalized when a safety gate is active. The user can still save onboarding answers and receive a clear next step.
- Missing wearable data reduces confidence; it never prevents a manual plan for an otherwise eligible user.
- Nutrition and body-composition support are optional. Number-free support is available, and uncertain photo estimates require confirmation before logging.
