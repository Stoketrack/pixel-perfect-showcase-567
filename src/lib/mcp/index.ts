import { defineMcp } from "@lovable.dev/mcp-js";
import sessionMetricsTool from "./tools/session-metrics";
import usdToPhpTool from "./tools/usd-to-php";
import tokensToUsdTool from "./tools/tokens-to-usd";
import platformReferenceTool from "./tools/platform-reference";

export default defineMcp({
  name: "pixel-perfect-clone",
  title: "Pixel Perfect Clone",
  version: "0.1.0",
  instructions:
    "Calculation tools for TokenTrack by MAD. Use `session_metrics` to derive duration, time of day, follower change and earnings per hour from a session; `tokens_to_usd` for platform-specific token conversion (always pass the platform's own token value — there is no global rate); `usd_to_php` for the live peso equivalent; `platform_reference` for the six default platform slots. Session records themselves live only in the user's browser and are not available here.",
  tools: [sessionMetricsTool, tokensToUsdTool, usdToPhpTool, platformReferenceTool],
});
