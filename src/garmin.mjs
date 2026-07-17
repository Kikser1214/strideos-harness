export function garminStatus() {
  const configured = Boolean(process.env.GARMIN_BRIDGE_URL);
  return {
    mode: configured ? "bridge" : "simulation",
    configured,
    label: configured ? "Garmin bridge connected" : "Garmin simulation"
  };
}

export async function pushWorkout({ decision, athlete }) {
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
      body: JSON.stringify({ decisionId: decision.id, athleteId: athlete.athlete.firstName, workout: athlete.workout })
    });
    if (!response.ok) throw new Error(`Garmin bridge rejected the write (${response.status}).`);
    return { performed: true, simulated: false, message: "Workout sent through the configured Garmin bridge." };
  } finally {
    clearTimeout(timeout);
  }
}
