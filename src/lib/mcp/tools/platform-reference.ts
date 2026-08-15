import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { DEFAULT_PLATFORMS } from "@/lib/tokentrack/store";

export default defineTool({
  name: "platform_reference",
  title: "Platform slot reference",
  description:
    "List TokenTrack's six default platform slots with their display name, identity, status, dashboard position, default token value in USD and payout destination. Reference defaults only — a user's own settings live in their browser and are not exposed.",
  inputSchema: {
    slot: z
      .number()
      .nullable()
      .optional()
      .describe("Optional dashboard slot 1-6 to return a single platform."),
  },
  outputSchema: {
    platforms: z.array(
      z.object({
        slot: z.number(),
        displayName: z.string(),
        name: z.string(),
        status: z.string(),
        tokenValueUsd: z.number().nullable(),
        payoutDestination: z.string().nullable(),
      }),
    ),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ slot }) => {
    const platforms = DEFAULT_PLATFORMS.filter((p) => (slot ? p.slot === slot : true)).map((p) => ({
      slot: p.slot,
      displayName: p.displayName,
      name: p.name,
      status: p.status,
      tokenValueUsd: p.tokenValueUsd,
      payoutDestination: p.payoutDestination ?? null,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(platforms, null, 2) }],
      structuredContent: { platforms },
    };
  },
});
