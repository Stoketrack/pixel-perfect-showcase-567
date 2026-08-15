import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

const FALLBACK_USD_PHP_RATE = 58.5;

async function liveRate(): Promise<{ rate: number; live: boolean }> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const json = (await res.json()) as { rates?: Record<string, number> };
      const rate = json?.rates?.['PHP'];
      if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
        return { rate, live: true };
      }
    }
  } catch {
    // fall through to the fallback rate
  }
  return { rate: FALLBACK_USD_PHP_RATE, live: false };
}

export default defineTool({
  name: "usd_to_php",
  title: "Convert USD to PHP",
  description:
    "Convert a USD amount to Philippine pesos using the current live USD/PHP rate (the same source the app uses). Returns the rate so the USD figure stays the source of truth.",
  inputSchema: {
    amountUsd: z.number().describe("USD amount to convert. Numbers only, no currency symbols."),
  },
  outputSchema: {
    amountUsd: z.number(),
    usdPhpRate: z.number(),
    rateIsLive: z.boolean(),
    amountPhp: z.number(),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ amountUsd }) => {
    if (!Number.isFinite(amountUsd)) throw new ToolError("amountUsd must be a finite number.");
    const { rate, live } = await liveRate();
    const result = {
      amountUsd,
      usdPhpRate: rate,
      rateIsLive: live,
      amountPhp: amountUsd * rate,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
