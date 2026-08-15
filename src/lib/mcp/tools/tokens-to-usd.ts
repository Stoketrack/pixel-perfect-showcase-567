import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "tokens_to_usd",
  title: "Convert tokens to USD",
  description:
    "Convert a token count to USD using an explicit platform-specific token value. There is no global token rate — the caller must supply tokenValueUsd; nothing is guessed.",
  inputSchema: {
    tokens: z.number().describe("Token count."),
    tokenValueUsd: z.number().describe("USD per token for that specific platform."),
  },
  outputSchema: {
    tokens: z.number(),
    tokenValueUsd: z.number(),
    usdValue: z.number(),
    source: z.string(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ tokens, tokenValueUsd }) => {
    if (!Number.isFinite(tokens) || !Number.isFinite(tokenValueUsd)) {
      throw new ToolError("tokens and tokenValueUsd must be finite numbers.");
    }
    const result = { tokens, tokenValueUsd, usdValue: tokens * tokenValueUsd, source: "calculated" };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
