import { fmtPhp, fmtUsd, useTokenTrack } from "@/lib/tokentrack/store";
import type { Platform, PlatformStatus } from "@/lib/tokentrack/types";

const STATUSES: PlatformStatus[] = ["active", "testing", "inactive"];

const field =
  "w-full rounded-md border border-input bg-console px-2 py-1.5 text-xs outline-none focus:border-ring h-8";

export function PlatformSettings() {
  const { platforms, updatePlatform, usdPhpRate, rateIsLive, rateUpdatedAt } = useTokenTrack();

  const num = (raw: string): number | null => {
    if (raw.trim() === "") return null;
    const n = Number(raw.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-4 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Platform configuration</h1>
          <p className="text-xs text-muted-foreground">
            Six configurable profiles. Everything here drives the dashboard cards automatically.
          </p>
        </div>
        <div className="rounded-md border border-border bg-panel px-3 py-2 text-right">
          <p className="label-micro">Live USD → PHP</p>
          <p className="numeric text-sm">
            {fmtUsd(1)} = {fmtPhp(usdPhpRate)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {rateIsLive
              ? `Auto-updated${rateUpdatedAt ? ` ${new Date(rateUpdatedAt).toLocaleString()}` : ""}`
              : "Fetching current rate…"}
          </p>
        </div>
      </header>

      <div className="space-y-3">
        {platforms.map((p) => (
          <section key={p.id} className="rounded-xl border border-border bg-panel p-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
              <Labelled label="Display name">
                <input
                  className={field}
                  value={p.displayName}
                  onChange={(e) => updatePlatform(p.id, { displayName: e.target.value })}
                />
              </Labelled>
              <Labelled label="Platform identity">
                <input
                  className={field}
                  value={p.name}
                  onChange={(e) => updatePlatform(p.id, { name: e.target.value })}
                />
              </Labelled>
              <Labelled label="Status">
                <select
                  className={field}
                  value={p.status}
                  onChange={(e) =>
                    updatePlatform(p.id, { status: e.target.value as PlatformStatus })
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.toUpperCase()}
                    </option>
                  ))}
                </select>
              </Labelled>
              <Labelled label="Token value (USD)">
                <input
                  className={`${field} numeric`}
                  inputMode="decimal"
                  value={p.tokenValueUsd ?? ""}
                  placeholder="—"
                  onChange={(e) => updatePlatform(p.id, { tokenValueUsd: num(e.target.value) })}
                />
              </Labelled>
              <Labelled label="Payment destination">
                <input
                  className={field}
                  value={p.payoutDestination ?? ""}
                  placeholder="Coins.ph / Wise"
                  onChange={(e) => updatePlatform(p.id, { payoutDestination: e.target.value })}
                />
              </Labelled>
              <Labelled label="Payout information">
                <input
                  className={field}
                  value={p.payoutInfo ?? ""}
                  placeholder="Account ref, schedule, minimum"
                  onChange={(e) => updatePlatform(p.id, { payoutInfo: e.target.value })}
                />
              </Labelled>
              <Labelled label="Dashboard position">
                <select
                  className={`${field} numeric`}
                  value={p.slot}
                  onChange={(e) => updatePlatform(p.id, { slot: Number(e.target.value) })}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Labelled>
            </div>
          </section>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Token values are platform-specific — there is no global conversion rate. The USD/PHP rate is
        fetched automatically and never edited by hand; recorded USD earnings never change when it
        moves.
      </p>
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-micro mb-1 block">{label}</span>
      {children}
    </label>
  );
}

export type { Platform };
