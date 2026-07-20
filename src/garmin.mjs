export function garminStatus() {
  return {
    mode: "export_or_manual",
    configured: false,
    label: "Garmin export or manual entry",
    connectionState: "no_permitted_direct_route",
    assistedBrowsingClassification: "not_established",
    workoutDeliverySupported: false
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

  throw new TypeError("No provider-permitted individual Garmin workout-write route is currently established. Use a local structured preview and a manual provider action.");
}
