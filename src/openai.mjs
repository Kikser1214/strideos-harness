const API_URL = "https://api.openai.com/v1/responses";

async function createResponse({ input, instructions, schema, schemaName }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const response = await fetch(API_URL, {
    method: "POST",
    signal: controller.signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      reasoning: { effort: "medium" },
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema
        }
      },
      instructions,
      input
    })
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${body.slice(0, 240)}`);
  }

  const data = await response.json();
  const refusal = data.output
    ?.flatMap((item) => item.content || [])
    .find((item) => item.type === "refusal");
  if (refusal) throw new Error(`The model declined this request: ${refusal.refusal}`);
  return JSON.parse(data.output_text || "{}");
}

export async function analyzeMeal({ imageDataUrl, note = "" }) {
  return createResponse({
    instructions: [
      "You are the food-sensing component of a personal running coach harness.",
      "Estimate ordinary foods and portions conservatively. Never claim certainty from an image.",
      "Estimate summary, foods, useful ranges, and clarifying questions using the required response schema.",
      "This is wellness information, not medical or dietary treatment."
    ].join("\n"),
    schemaName: "meal_estimate",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "items", "caloriesRange", "proteinRange", "carbsRange", "questions", "confidence"],
      properties: {
        summary: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "portion", "confidence"],
            properties: {
              name: { type: "string" },
              portion: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 1 }
            }
          }
        },
        caloriesRange: { type: "string" },
        proteinRange: { type: "string" },
        carbsRange: { type: "string" },
        questions: { type: "array", items: { type: "string" } },
        confidence: { type: "number", minimum: 0, maximum: 1 }
      }
    },
    input: [{
      role: "user",
      content: [
        { type: "input_text", text: `Analyze this meal for a runner. Athlete note: ${note || "none"}` },
        { type: "input_image", image_url: imageDataUrl, detail: "high" }
      ]
    }]
  });

}

export async function coach({ message, athlete }) {
  return createResponse({
    instructions: [
      "You are the reasoning component inside StrideOS, a rule-governed running coach harness.",
      "Use only the supplied athlete data. Do not invent metrics.",
      "Recommendations must cite evidence. Any plan change or external write must be phrased as a proposal requiring approval.",
      "Do not diagnose or provide medical treatment. Stop and direct the athlete to qualified care for serious red flags.",
      "Return the evidence, intended action, confidence, and proposal using the required response schema."
    ].join("\n"),
    schemaName: "coach_decision",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["evidence", "action", "confidence", "proposal"],
      properties: {
        evidence: { type: "array", items: { type: "string" }, minItems: 1 },
        action: {
          type: "string",
          enum: ["read_training_data", "change_training_plan", "push_garmin_workout", "medical_red_flag"]
        },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        proposal: { type: "string" }
      }
    },
    input: `ATHLETE DATA\n${JSON.stringify(athlete)}\n\nATHLETE MESSAGE\n${message}`
  });
}
