# Onboarding and authority contract

Use this reference for first-run intake, safety stops, state transitions, and approval-sensitive actions.

## Intake inventory

Collect fields only when they can change safety, recommendation, delivery, or communication.

## Grouped interview contract

The detailed athlete map remains intact, but conversational onboarding must not present it as a long chain of isolated questions. Run these coherent rounds:

When the cloned reference runtime responds at `http://localhost:4173` and ChatGPT's in-app browser is available, ask the athlete to choose **1. Open the browser questionnaire (recommended)** or **2. Continue here in chat**. Choice 1 opens and keeps the wizard in the same embedded in-app browser tab; it must not launch a separate system browser. After the athlete completes it, re-read `GET /api/bootstrap` and require `onboarding.completedAt`; do not scrape the rendered page or infer completion from a partial draft. If localhost or the in-app browser is unavailable, say so briefly and use this grouped interview. Never open an external browser without the athlete explicitly requesting it. The browser and conversation paths produce the same versioned profile.

1. **You and success:** name, age group, units/timezone, goal, motivation, event details when applicable, and a concrete 12-week win.
2. **Safety:** present the seven safety signals as one numbered checklist with "none" as a valid answer; ask clearance/PAR-Q+ or detail questions only when relevant.
3. **Data and exact scope:** selected providers, primary source, per-provider scopes, history window, manual check-ins, and whether the read happens now before planning or later.
4. **Training baseline:** current movement, running experience, recent consistency, weekly volume, longest effort, other activities, benchmark, and effort-scale familiarity. Prefill provider-observable facts after an authorized read and ask the athlete to confirm them.
5. **Plan fit:** realistic schedule, work/life constraints, sleep/stress, training environment, barriers, and strength experience, equipment, technique confidence, limitations, and preferences.
6. **Coaching and fuel choice:** method recommendation or named-method research, intensity tolerance, session preferences, tone, explanation depth, and whether nutrition support is enabled.
7. **Fuel details, only when enabled:** priorities, dietary constraints, relationship with numbers, cooking/budget/hydration context, supplements, and optional photo use.
8. **Daily experience:** dashboard, Training Circle, coaching rhythms, workout destination, setup-help preference, approval rule, and cloud-processing choice.

Ask one round per turn, using plain language and explicitly allowing optional items to be skipped. Accept prose or a numbered answer. Extract all supported fields, reflect the important facts, and follow up only on missing required information, safety ambiguity, or an explicit decision boundary. A positive safety answer gets its own focused follow-up. Provider authorization is always summarized and confirmed separately even when its discovery questions were grouped.

### Identity and context

- preferred name, language, units, timezone;
- age group;
- optional height, weight, and explicit rule for whether weight may be used.

### Current baseline

- activity level and running experience;
- typical weekly distance or time in the last six to eight weeks;
- longest recent effort, other sports, consistency, and recent benchmark;
- familiarity with a 1–10 effort scale.

### Safety

- pain that changes movement today;
- chest discomfort during activity or at rest;
- unexplained dizziness, fainting, or loss of balance;
- unusual breathlessness at low effort;
- recent injury, surgery, or return from treatment;
- a condition or medication that may affect exercise;
- optional pregnancy/postpartum context;
- clearance and PAR-Q+ status when relevant.

Do not diagnose. Pause ordinary prescription when concerning symptoms or unresolved safety answers are present. Recommend the official PAR-Q+ pathway, a qualified clinician, or urgent care in proportion to the symptom. Do not use reassuring wearable data to override current symptoms.

### Goal and expectations

- primary goal and why it matters;
- event distance and date when applicable;
- optional time goal and deadline flexibility;
- a concrete 12-week success definition.

### Strength

- current and prior strength frequency;
- technique confidence and coaching experience;
- equipment, preferred style, limitations, and realistic availability;
- movements the athlete already tolerates.

### Life and recovery

- realistic training days and session duration;
- work pattern, sleep, stress, caregiving, travel, and recurring barriers;
- terrain, climate, daylight, and equipment access;
- preferred rest day and scheduling constraints.

### Evidence and delivery

- phone, watch, provider, files, or manual check-ins the athlete chooses to use;
- exact per-provider read scopes—activities, workout details, route/elevation, recovery, sleep, and optional weight trend—plus history window and read timing;
- cloud-processing choice and retention preference;
- desired workout destination and whether setup help is guide-only, reviewed local help, or not now.

StrideOS provides official recommendations; it does not define an allowlist. Route provider requests to `$use-training-data`, which may actively offer attended browser/computer use when the current surface exposes it. If the athlete explicitly selects a local script, another plugin, or another external host capability, let provider guidance step aside. The agent handles that capability under host permissions and the ordinary exact write-approval boundary.

### Pre-plan evidence checkpoint

When the athlete selects a provider, authorizes a read, and says they want to connect or use its data, complete that evidence step before the first individualized plan. Do not reinterpret the request as "connect later." Before handing off to `$plan-training`, hand the requested read to `$use-training-data` and continue only after the evidence has actually been retrieved and normalized.

If the timing is unclear, ask: "You chose [provider] and allowed [scope]. Before I build your first plan, would you like me to read it now? I will use the best available route; if that is attended browsing, you will sign in yourself. If not, I can pause or draft a clearly provisional plan from the interview only."

If the athlete agrees but the read cannot be completed, state the missing route or evidence and ask whether to pause or continue with the interview-only provisional plan. Consent to provider access is not consent to silently plan without the provider data. If the athlete explicitly chooses later or declines, confirm that choice before offering the provisional plan.

Before executing a read, reflect one compact permission statement: each provider, its exact scopes, the history window, and whether it is being read now. Obtain explicit confirmation of that statement. Reading one provider or scope never authorizes another, and no read authorization grants a workout/calendar write.

### Coaching and optional nutrition

- concise or detailed explanations;
- supportive or direct tone;
- recommend-for-me or a named method to research;
- nutrition off, loose, guided, detailed, or number-free;
- dietary constraints, allergies, routine foods, cooking access, supplements, medications, and photo choices.

### Collaboration and automation

- local dashboard or private Site;
- whether a real coach or trusted reviewer may be invited and what they may see;
- optional morning, pre-workout, post-workout, or weekly prompts;
- timezone, schedule, prompt, data access, and approval behavior for every proposed automation.

## Authority states

Use these labels explicitly:

- `evidence`: athlete-authorized observation;
- `inference`: interpretation with confidence and uncertainty;
- `recommendation`: advice only;
- `proposal`: exact state change awaiting a decision;
- `approved`: athlete approved that exact proposal;
- `performed`: the system executed it and verified the result;
- `declined`, `expired`, or `blocked`: no action occurred.

Casual agreement in conversation is not enough when the runtime exposes a server-stored approval decision. Use the linked decision. Unknown actions stop.

## Approval matrix

| Action | Default |
| --- | --- |
| Read already-authorized local evidence | May proceed |
| Save athlete-authored workout feedback | May proceed when submission itself is explicit |
| Analyze an athlete-selected meal image | May proceed within configured processing consent |
| Log a food estimate | Exact confirmation required |
| Activate or revise a training plan | Exact approval required |
| Create or publish a Site | Exact approval required |
| Invite, revoke, or change a reviewer | Exact approval required |
| Write through a provider or user-selected host capability | Real selected tool, exact preview, and one-use approval required |
| Schedule an automation | Route through `$schedule-coaching`; preview schedule, prompt, access, and gates before using the native scheduling surface |
| Unknown external mutation target, payload, or tool | Stop until it is exact |

## Beginner recommendation

For a suitable inactive or new athlete who wants StrideOS to choose, begin with three separated run-walk-run sessions and two short technique-first strength sessions. Increase easy running and reduce walking gradually only when pain, recovery, and effort support it. Easy cycling is optional low-impact support, not mandatory load or missed-work catch-up.

After giving the recommendation, ask one practical constraint that could change it. Do not ask the beginner to select among unexplained method names.
