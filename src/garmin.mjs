export function garminStatus() {
  return {
    mode: "reference_runtime_only",
    configured: false,
    label: "Garmin host capability or reference fallback",
    connectionState: "no_bundled_write_executor",
    attendedBrowserAvailability: "determined_by_current_host",
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

  throw new TypeError("This optional reference runtime has no live Garmin workout-write executor. Delegate an explicitly selected browser, script, plugin, or other capability to the current host.");
}
