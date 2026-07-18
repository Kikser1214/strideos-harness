# Training-plan engine

StrideOS creates a deterministic four-week proposal from the completed athlete profile, the current athlete analysis, imported activity summaries, and manual check-ins. The model may explain a plan or research a requested method, but it cannot silently change the deterministic baseline, safety stop, or approval boundary.

## Inputs and output

`buildTrainingPlan({ profile, analysis, startDate })` requires a completed deterministic athlete analysis. The start date is aligned to the next Monday and the same normalized inputs always produce the same plan ID and content.

The plan records:

- the selected path and starting stage;
- the four-week window and realistic weekly frequency;
- every running, run/walk, strength, mobility, rest, and optional cross-training session;
- the reason, duration, intensity guardrail, and modification route for each session;
- plan confidence, evidence gaps, progression rules, and adaptation rules;
- method-research status and the athlete approval state.

Supported paths are couch-to-active, running habit, general cardio, return-to-running, and race-distance preparation. A plan is a bounded first block, not a promise of race readiness or an injury-free outcome.

## Beginner and strength behavior

A starter receives comfortable run/walk work that does not require pace knowledge. The default frame is three separated running exposures and two technique-first strength exposures when the athlete has four or more realistic days; lower availability reduces the prescription. Equipment determines the exercise menu, and experience determines the starting dose.

Week four reduces running and strength volume before another block is proposed. Optional mobility and cross-training stay visibly optional and never become automatic catch-up work.

## Intensity and named methods

Controlled quality is available only to a building or established athlete when the selected baseline supports it and current recovery, pain, and intensity-tolerance signals do not hold progression.

`threshold`, `norwegian_inspired`, a custom method, and regional labels such as Kenyan or Ethiopian training trigger a research gate. StrideOS keeps a conservative baseline until the exact coach or system, target population, altitude, volume, recovery demands, and athlete suitability have been reviewed. It never treats “Norwegian” or “African” training as one universal template.

## Safety and adaptation

The normal plan path stops when the athlete analysis contains an active safety stop or a pain progression hold. A blocked plan has no approval route.

The block also carries explicit rules:

- pain that changes movement, chest discomfort, dizziness, fainting, or unusual breathlessness stops the normal plan path;
- low pain without changed movement removes quality and shortens the proposal pending a new check-in;
- very high RPE, low energy, or poor sleep feel keeps effort easy and reduces proposed duration;
- one missed session is skipped or moved only when recovery spacing remains;
- two or more missed sessions lead to repeating or simplifying the week;
- sessions are never doubled to catch up;
- no fixed percentage is presented as automatically safe progression.

A manual check-in with pain of 4/10 or higher moves an active plan to `review_required` and clears it as the active block. Completing a changed athlete profile also marks the previous active plan for review and makes pending proposals stale.

## Approval lifecycle

`GET /api/training-plan` returns a fresh preview, the active plan, and recent proposals. Previewing changes nothing.

`POST /api/training-plan/proposals` creates the exact plan proposal and a linked `change_training_plan` decision. The proposal becomes `awaiting_approval`; duplicate active or pending proposals are rejected. A read-only athlete can inspect the preview but cannot propose activation.

Only `POST /api/decisions/approve` can activate the plan, and it resolves the server-stored plan ID from the server-stored decision. Client-supplied replacement plan content is ignored. Declining the linked decision leaves the plan inactive. The decision ledger records evidence, reasoning boundary, rule gate, and result.

## Evidence basis

- [NHS Couch to 5K](https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/) — comfortable beginner run/walk progression and recovery between sessions.
- [Physical Activity Guidelines for Americans](https://odphp.health.gov/our-work/nutrition-physical-activity/physical-activity-guidelines/current-guidelines/top-10-things-know) — starting small, building activity over time, and including muscle-strengthening work.
- [Bern return-to-sport consensus](https://bjsm.bmj.com/content/50/14/853) — individualized, graded return decisions rather than a generic calendar.
- [Running session distance cohort study](https://bjsm.bmj.com/content/59/17/1203) — avoiding abrupt single-session distance spikes without presenting one percentage as universally safe.
- [Strength training and running economy meta-analysis](https://pubmed.ncbi.nlm.nih.gov/38165636/) — strength as a useful part of runner development while dose remains athlete-specific.

These sources inform conservative product behavior; they do not turn StrideOS into medical care or replace individual professional assessment.
