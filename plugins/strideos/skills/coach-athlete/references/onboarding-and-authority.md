# Onboarding and authority contract

Use this reference for first-run intake, safety stops, state transitions, and approval-sensitive actions.

## Intake inventory

Collect fields only when they can change safety, recommendation, delivery, or communication.

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
- source scope, history window, cloud-processing choice, and retention preference;
- desired workout destination and whether setup help is guide-only, reviewed local help, or not now.

StrideOS provides official recommendations; it does not define an allowlist. Route provider requests to `$use-training-data`, which may actively offer attended browser/computer use when the current surface exposes it. If the athlete explicitly selects a local script, another plugin, or another external host capability, let provider guidance step aside. The agent handles that capability under host permissions and the ordinary exact write-approval boundary.

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
