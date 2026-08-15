import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh ?? 0) * 60 + (em ?? 0) - ((sh ?? 0) * 60 + (sm ?? 0));
  if (mins < 0) mins += 24 * 60; // session crossed midnight
  return mins;
}

function timeOfDay(start: string): string {
  const hour = Number(start.split(":")[0] ?? 0);
  if (hour < 6) return "Night";
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

export default defineTool({
  name: "session_metrics",
  title: "Calculate session metrics",
  description:
    "Given a TokenTrack session (start/end time, follower snapshots, tokens, USD), calculate duration, time of day, follower change, USD value and earnings per hour. Uses the same rules as the app; never invents a token value.",
  inputSchema: {
    startTime: z.string().describe("Session start time as HH:mm (24h)."),
    endTime: z.string().describe("Session end time as HH:mm (24h)."),
    tokens: z.number().nullable().optional().describe("Tokens earned, or null."),
    tokenValueUsd: z
      .number()
      .nullable()
      .optional()
      .describe("USD per token for that platform, or null if unknown."),
    usdEarned: z
      .number()
      .nullable()
      .optional()
      .describe("Actual USD reported by the platform, if any."),
    followersStart: z.number().nullable().optional(),
    followersEnd: z.number().nullable().optional(),
  },
  outputSchema: {
    durationMinutes: z.number(),
    durationLabel: z.string(),
    timeOfDay: z.string(),
    followerChange: z.number().nullable(),
    usdValue: z.number().nullable(),
    usdSource: z.string(),
    usdPerHour: z.number().nullable(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: (input) => {
    const minutes = minutesBetween(input.startTime, input.endTime);
    const hours = minutes / 60;

    let usdValue: number | null = null;
    let usdSource: "actual" | "calculated" | "unknown" = "unknown";
    if (typeof input.usdEarned === "number") {
      usdValue = input.usdEarned;
      usdSource = "actual";
    } else if (typeof input.tokens === "number" && typeof input.tokenValueUsd === "number") {
      usdValue = input.tokens * input.tokenValueUsd;
      usdSource = "calculated";
    }

    const followerChange =
      typeof input.followersStart === "number" && typeof input.followersEnd === "number"
        ? input.followersEnd - input.followersStart
        : null;

    const usdPerHour = usdValue !== null && hours > 0 ? usdValue / hours : null;

    const result = {
      durationMinutes: minutes,
      durationLabel: `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`,
      timeOfDay: timeOfDay(input.startTime),
      followerChange,
      usdValue,
      usdSource,
      usdPerHour,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
