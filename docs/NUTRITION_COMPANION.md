# Nutrition companion

StrideOS nutrition support is optional and athlete-controlled. It organizes ordinary food, hydration, training context, and supplement questions; it does not diagnose, prescribe medical nutrition treatment, or turn an image into a certain food record.

## Support modes

- **Off** — no guidance, photo analysis, or food logging. Training still works.
- **Loose** — meal rhythm, food variety, hydration, appetite, and training-fuel cues without calorie or macro displays.
- **Guided** — the same non-numeric guardrails with clearer meal and session structure.
- **Detailed** — confirmed meal estimates may show calorie and macro ranges. If a valid body weight was explicitly allowed for context, StrideOS may show an optional protein planning range; it does not calculate a generic calorie target.
- **Number-free** — food, rhythm, appetite, hydration, and session context without calorie, macro, or body-weight targets.

Number-free behavior wins over the requested mode when the athlete asks for it, marks weight as “do not use,” reports a previous or current tracking concern, is working under clinician guidance for that concern, or is under 18. A clinician-prescribed diet also creates a protected context: the harness may organize questions but must not contradict or replace that plan.

## Deterministic companion

`buildNutritionCompanion({ profile, activePlan })` returns the same result for the same inputs. It includes:

- the effective support mode and number-display policy;
- a food-first everyday framework adapted to the reported dietary pattern;
- session cues for ordinary, short/easy, longer/quality, and strength days present in the active plan;
- declared allergy, medical-diet, kitchen, budget, hydration, and tracking constraints;
- a protein powder, creatine, caffeine, and other-supplement inventory;
- photo permission and retention truth;
- hard boundaries and primary evidence.

No supplement receives an automatic recommendation. Product, dose, timing, tolerance, medicines, purpose, and independent quality testing remain review questions. High reported caffeine use never triggers a recommendation to add more.

## Meal and fridge photos

Photo support requires completed onboarding, nutrition enabled, and explicit photo permission. In live GPT-5.6 mode, the athlete must also enable cloud processing. Demo mode does not inspect the selected image; it returns a clearly labeled fixed estimate so the approval lifecycle can be tested locally.

The live prompt is schema-constrained and receives only the athlete note plus the relevant nutrition-display context, dietary pattern, and declared allergy note. It is instructed never to declare allergy safety or prescribe restriction, supplements, or medical treatment.

The deterministic post-processor then:

- bounds item count, text length, and confidence;
- adds ingredient, portion, cooking-fat, sauce, allergen, and cross-contact confirmation questions;
- hides all calorie and macro ranges when the number policy requires it;
- marks the raw image as not stored;
- creates a local `awaiting_confirmation` draft and a linked `log_food` decision.

The athlete may add a correction before approval. `POST /api/decisions/approve` resolves the server-stored meal draft and requires `mealConfirmation.confirmed === true`; client content cannot replace the estimate. Approval stores the normalized estimate and correction as `logged`. Decline records `declined`. Every local record can be deleted. Changing the athlete profile makes an unconfirmed draft stale.

## API and local state

- `GET /api/nutrition` — current companion and local meal records, with numeric fields masked by the current policy.
- `POST /api/food` — photo estimate, normalized draft, and approval decision.
- `POST /api/decisions/approve` — explicit meal confirmation and optional bounded correction.
- `POST /api/decisions/decline` — decline the linked draft without logging it.
- `DELETE /api/meals/:id` — delete any local meal record.

The local state stores the normalized estimate, athlete note, correction, lifecycle timestamps, and `imageStored: false`. The raw image is held only for the request and is never written to the included state file.

## Evidence basis

- [Dietary Guidelines for Americans, 2025–2030](https://cdn.realfood.gov/DGA_508.pdf) — varied nutrient-dense foods, hydration, and individual context instead of one calorie target for everyone.
- [NIH ODS exercise and athletic performance fact sheet](https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-Consumer/) — food-first context and evidence-aware discussion of protein, creatine, caffeine, and other performance supplements.
- [NIH ODS dietary supplement safety guide](https://ods.od.nih.gov/factsheets/WYNTK-Consumer/) — product, dose, timing, medicine, safety, and quality review.
- [FDA food allergy guidance](https://www.fda.gov/food/buy-store-serve-safe-food/food-allergies-what-you-need-know) — declared allergies are hard exclusions and image recognition is not an allergen-safety check.
- [NICE eating-disorder guideline](https://www.nice.org.uk/guidance/ng69) — relevant concerns belong with qualified assessment and care, not intensified automated tracking.

These sources inform conservative wellness behavior. They do not make StrideOS a dietitian, clinician, emergency service, or food-safety authority.
