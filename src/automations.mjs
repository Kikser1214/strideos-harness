export const AUTOMATION_VERSION = "2026-07-18";

export const AUTOMATION_IDS = ["morning_brief", "pre_workout", "post_workout", "weekly_review"];

const definitions = {
  morning_brief: {
    label: "Morning readiness brief",
    description: "Summarize today's approved plan, recovery posture, evidence freshness, and any useful check-in request.",
    profileFlag: "morningBrief",
    cadence: "daily"
  },
  pre_workout: {
    label: "Pre-workout check",
    description: "Check the approved session and current evidence before training without silently moving or changing the plan.",
    profileFlag: "preWorkoutBrief",
    cadence: "daily"
  },
  post_workout: {
    label: "Post-workout reflection",
    description: "After an observed activity, ask for pain, RPE, energy, sleep context, and notes before adapting anything.",
    profileFlag: "postWorkoutReflection",
    cadence: "daily"
  },
  weekly_review: {
    label: "Weekly review",
    description: "Compare planned work with observed activity, strength exposure, recovery, and evidence gaps without claiming completion.",
    profileFlag: "weeklyReview",
    cadence: "weekly"
  }
};

const dayCodes = { monday: "MO", tuesday: "TU", wednesday: "WE", thursday: "TH", friday: "FR", saturday: "SA", sunday: "SU" };

function time(value, fallback) {
  const input = String(value || "").trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(input) ? input : fallback;
}

function minutes(value) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function clock(total) {
  const normalized = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function trainingTime(profile) {
  return { morning: "07:00", midday: "12:30", evening: "18:00", varies: "17:00" }[profile.schedule?.preferredTime] || "17:00";
}

function defaultSchedule(id, profile) {
  const base = trainingTime(profile);
  if (id === "morning_brief") return { time: time(profile.delivery?.briefTime, "07:00"), day: null };
  if (id === "pre_workout") return { time: clock(minutes(base) - Number(profile.delivery?.preWorkoutLeadMinutes || 60)), day: null };
  if (id === "post_workout") return { time: clock(minutes(base) + Number(profile.delivery?.postWorkoutDelayMinutes || 60)), day: null };
  return { time: time(profile.delivery?.weeklyReviewTime, "18:00"), day: dayCodes[profile.delivery?.weeklyReviewDay] ? profile.delivery.weeklyReviewDay : "sunday" };
}

function durablePrompt(id) {
  const label = definitions[id].label;
  return [
    `Run the StrideOS ${label} workflow in this local project.`,
    `Execute: npm run brief -- --kind ${id}`,
    "Treat the command's JSON as authoritative. Never substitute data/demo-athlete.json when the result says onboarding or evidence is missing.",
    "Summarize only the returned evidence and uncertainty. Keep planned sessions, observed activities, and confirmed completion separate.",
    "Do not modify files, activate or change a plan, log food, or write to Garmin, a calendar, or any connector.",
    "If an action is useful, present it as a proposal for the athlete to review in interactive StrideOS. If status is no_update, report that briefly without inventing a task.",
    "If the command fails, report the exact error and stop."
  ].join("\n");
}

export function normalizeAutomationOverride(id, input = {}) {
  if (!AUTOMATION_IDS.includes(id)) throw new TypeError("Unknown automation kind.");
  const result = {};
  if (typeof input.enabled === "boolean") result.enabled = input.enabled;
  if (input.time !== undefined) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(input.time))) throw new TypeError("Automation time must use HH:MM in 24-hour format.");
    result.time = String(input.time);
  }
  if (input.day !== undefined) {
    if (!dayCodes[input.day]) throw new TypeError("Choose a valid weekly review day.");
    result.day = input.day;
  }
  return result;
}

export function buildAutomationSetup({ profile, automationState = {}, now = new Date() }) {
  if (!profile) return { version: AUTOMATION_VERSION, status: "needs_onboarding", scheduled: false, tasks: [], explanation: "Complete athlete setup before proposing scheduled briefs." };
  const timezone = profile.personal?.timezone || "UTC";
  const overrides = automationState.overrides || {};
  const tests = automationState.tests || {};
  const tasks = AUTOMATION_IDS.map((id) => {
    const definition = definitions[id];
    const base = defaultSchedule(id, profile);
    const override = overrides[id] || {};
    const selected = profile.delivery?.[definition.profileFlag] === true;
    const enabled = override.enabled ?? selected;
    const scheduledTime = time(override.time, base.time);
    const day = definition.cadence === "weekly" && dayCodes[override.day] ? override.day : base.day;
    const [hour, minute] = scheduledTime.split(":").map(Number);
    const rrule = definition.cadence === "weekly"
      ? `RRULE:FREQ=WEEKLY;BYDAY=${dayCodes[day]};BYHOUR=${hour};BYMINUTE=${minute}`
      : `RRULE:FREQ=DAILY;BYHOUR=${hour};BYMINUTE=${minute}`;
    return {
      id,
      ...definition,
      selectedInOnboarding: selected,
      enabled,
      schedule: { timezone, time: scheduledTime, day, rrule, label: definition.cadence === "weekly" ? `${day} at ${scheduledTime}` : `daily at ${scheduledTime}` },
      scheduleStatus: "proposal_only",
      testedAt: tests[id]?.testedAt || null,
      lastTestStatus: tests[id]?.status || null,
      destination: "current_chat_or_standalone",
      prompt: durablePrompt(id),
      permissions: {
        projectRead: true,
        localCommand: "npm run brief",
        fileWrites: false,
        network: false,
        externalWrites: false,
        explanation: "Read-only preview. Any plan change, food log, or connector write returns to interactive approval."
      }
    };
  });
  return {
    version: AUTOMATION_VERSION,
    generatedAt: new Date(now).toISOString(),
    status: tasks.some((task) => task.enabled) ? "proposals_ready" : "off",
    scheduled: false,
    timezone,
    tasks,
    explanation: "Schedules are editable proposals. Test each prompt manually, then create it in ChatGPT/Codex Scheduled only if the athlete chooses to."
  };
}

function automationEvidence(dashboard) {
  return [
    dashboard.plan?.label || "No active training block",
    `Recovery: ${dashboard.recovery?.status || "unknown"}`,
    dashboard.recovery?.pain === null || dashboard.recovery?.pain === undefined ? "No current pain check-in" : `Pain: ${dashboard.recovery.pain}/10`,
    `Evidence freshness: ${dashboard.sources?.status || "unknown"}`
  ];
}

export function runAutomationPreview({ id, dashboard, imports = [], checkins = [], now = new Date() }) {
  if (!AUTOMATION_IDS.includes(id)) throw new TypeError("Unknown automation kind.");
  const generatedAt = new Date(now);
  if (!Number.isFinite(generatedAt.getTime())) throw new TypeError("Automation preview time is invalid.");
  if (!dashboard || dashboard.status === "needs_onboarding") return {
    id, generatedAt: generatedAt.toISOString(), status: "needs_onboarding", title: definitions[id].label,
    summary: "Complete the athlete map before this automation can produce a personal brief.", evidence: [], questions: [], externalActions: [], approvalRequired: false
  };
  const evidence = automationEvidence(dashboard);
  if (dashboard.status === "safety_stop") return {
    id, generatedAt: generatedAt.toISOString(), status: "safety_stop", title: definitions[id].label,
    summary: "Safety review overrides the normal scheduled coaching path. Follow the dashboard safety guidance and seek qualified care for urgent or worsening symptoms.", evidence, questions: [], externalActions: [], approvalRequired: false
  };

  if (id === "morning_brief") return {
    id, generatedAt: generatedAt.toISOString(), status: "ready", title: definitions[id].label,
    summary: `${dashboard.today.title}: ${dashboard.today.target}`,
    evidence,
    questions: dashboard.recovery?.pain === null || dashboard.sources?.status === "stale" ? ["Before training, add a quick pain, effort, energy, and sleep-feel check-in."] : [],
    externalActions: [], approvalRequired: false
  };

  if (id === "pre_workout") {
    if (dashboard.today?.state !== "scheduled") return {
      id, generatedAt: generatedAt.toISOString(), status: "no_update", title: definitions[id].label,
      summary: dashboard.today?.state === "upcoming" ? `${dashboard.today.title} is upcoming on ${dashboard.today.date}; nothing was moved onto today.` : "No active session is scheduled today. Nothing was moved or changed.",
      evidence, questions: [], externalActions: [], approvalRequired: false
    };
    return {
      id, generatedAt: generatedAt.toISOString(), status: "ready", title: definitions[id].label,
      summary: `${dashboard.today.title}: ${dashboard.today.target}`,
      evidence, questions: ["Any new pain, unusual symptoms, or meaningful recovery change since the last check-in?"], externalActions: [], approvalRequired: false
    };
  }

  if (id === "post_workout") {
    const today = generatedAt.toISOString().slice(0, 10);
    const activity = imports.find((item) => String(item.activityAt || "").slice(0, 10) === today) || null;
    if (!activity) return {
      id, generatedAt: generatedAt.toISOString(), status: "no_update", title: definitions[id].label,
      summary: "No activity was observed today. StrideOS does not infer a missed or completed session.", evidence, questions: [], externalActions: [], approvalRequired: false
    };
    const reflected = checkins.some((item) => new Date(item.capturedAt).getTime() >= new Date(activity.activityAt).getTime());
    return {
      id, generatedAt: generatedAt.toISOString(), status: reflected ? "no_update" : "needs_input", title: definitions[id].label,
      summary: reflected ? `A reflection already follows ${activity.name || "today's activity"}.` : `${activity.name || "Today's activity"} was observed${activity.summary ? `: ${activity.summary}` : "."}`,
      evidence: [...evidence, `Observed source: ${activity.source || "activity import"}`],
      questions: reflected ? [] : ["How hard did it feel from 1 to 10?", "Any pain during or after it?", "How is your energy now?", "Anything the next session should account for?"],
      externalActions: [], approvalRequired: false
    };
  }

  if (!dashboard.week?.number) return {
    id, generatedAt: generatedAt.toISOString(), status: "no_update", title: definitions[id].label,
    summary: "No approved training week is available to review.", evidence, questions: [], externalActions: [], approvalRequired: false
  };
  return {
    id, generatedAt: generatedAt.toISOString(), status: "ready", title: definitions[id].label,
    summary: `Week ${dashboard.week.number}: ${dashboard.week.plannedMinutes} planned minutes across ${dashboard.week.plannedSessions} sessions, including ${dashboard.week.plannedStrength} strength. ${dashboard.week.observedActivities} activities and ${dashboard.week.observedDistanceKm} km were observed, not automatically marked complete.`,
    evidence: [...evidence, dashboard.week.explanation],
    questions: ["What felt sustainable this week?", "What should stay the same before any new plan proposal?"], externalActions: [], approvalRequired: false
  };
}

