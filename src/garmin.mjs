export function garminStatus() {
  const configured = Boolean(process.env.GARMIN_BRIDGE_URL);
  return {
    mode: configured ? "bridge" : "simulation",
    configured,
    label: configured ? "Garmin bridge configured" : "Garmin simulation",
    connectionState: configured ? "adapter_configured" : "not_connected"
  };
}

export async function pushWorkout({ decision }) {
  const resource = decision?.resource;
  const source = resource?.workout?.source;
  if (resource?.type !== "workout" || !resource.athleteId || !resource.workout?.name || !["approved_training_plan", "synthetic_judge_fixture"].includes(source)) {
    throw new TypeError("Garmin writes require an exact server-authored workout resource.");
  }
  if (source === "synthetic_judge_fixture") {
    return {
      performed: false,
      simulated: true,
      message: "Approval recorded. Synthetic judge workouts are always simulated; no external calendar changed."
    };
  }
  const status = garminStatus();
  if (!status.configured) {
    return {
      performed: false,
      simulated: true,
      message: "Approval recorded. Garmin write simulated; no external calendar changed."
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(process.env.GARMIN_BRIDGE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(process.env.GARMIN_BRIDGE_TOKEN ? { authorization: `Bearer ${process.env.GARMIN_BRIDGE_TOKEN}` } : {})
      },
      body: JSON.stringify({ decisionId: decision.id, athleteId: resource.athleteId, workout: resource.workout })
    });
    if (!response.ok) throw new Error(`Garmin bridge rejected the write (${response.status}).`);
    return { performed: true, simulated: false, message: "Workout sent through the configured Garmin bridge." };
  } finally {
    clearTimeout(timeout);
  }
}
