import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, LayoutGrid, RotateCcw } from "lucide-react";
import { PlatformPanel, PANEL_WIDTH } from "@/components/tokentrack/PlatformPanel";
import { AddRowDialog } from "@/components/tokentrack/AddRowDialog";
import { PlatformDetail } from "@/components/tokentrack/PlatformDetail";
import { AddPayoutDialog } from "@/components/tokentrack/AddPayoutDialog";
import { TokenTrackProvider, todayISO, useTokenTrack } from "@/lib/tokentrack/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TokenTrack by MAD — Platform Performance Console" },
      {
        name: "description",
        content:
          "TokenTrack by MAD: a dark console for monitoring tokens, earnings, followers and hours across six platform slots, with transparent reconciliation.",
      },
      { property: "og:title", content: "TokenTrack by MAD — Platform Performance Console" },
      {
        property: "og:description",
        content:
          "Monitor tokens, earnings, followers and hours across six configurable platform slots with traceable, reconcilable figures.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <TokenTrackProvider>
      <Dashboard />
    </TokenTrackProvider>
  ),
});

const NAV = ["Dashboard", "Analytics", "Reconciliation", "Payouts", "Backups", "Settings"];

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function Dashboard() {
  const { platforms, layout, workingDate, setWorkingDate, setPanel, restoreAll, ready } =
    useTokenTrack();
  const [view, setView] = useState<string>("Dashboard");
  const [addFor, setAddFor] = useState<string | null>(null);
  const [payoutFor, setPayoutFor] = useState<string | null>(null);
  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState({ width: 1200, height: 900 });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => setBounds({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [detailFor]);

  const minimised = platforms.filter((p) => layout[p.id]?.minimised);
  const visible = platforms.filter((p) => !layout[p.id]?.minimised);
  const addPlatform = platforms.find((p) => p.id === addFor);
  const payoutPlatform = platforms.find((p) => p.id === payoutFor);
  const detailPlatform = platforms.find((p) => p.id === detailFor);
  const zFor = (id: string) => 10 + Math.max(order.indexOf(id), 0);

  const focus = (id: string) => setOrder((o) => [...o.filter((x) => x !== id), id]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-console">
      <nav className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-6">
          <div className="flex shrink-0 items-center gap-2">
            <div className="grid size-6 place-items-center rounded-sm bg-foreground">
              <div className="size-2.5 rotate-45 bg-console" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              TokenTrack <span className="font-medium text-muted-foreground">by MAD</span>
            </span>
          </div>
          <div className="hidden items-center gap-1 rounded-md bg-panel p-1 lg:flex">
            {NAV.map((item, i) => (
              <button
                key={item}
                type="button"
                className={
                  i === 0
                    ? "rounded bg-secondary px-3 py-1 text-xs font-medium text-foreground"
                    : "rounded px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border bg-panel px-1 py-1">
            <button
              type="button"
              aria-label="Previous date"
              onClick={() => setWorkingDate(shiftDate(workingDate, -1))}
              className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <div className="px-1 text-center">
              <span className="label-micro block leading-none">Working date</span>
              <input
                type="date"
                value={workingDate}
                onChange={(e) => setWorkingDate(e.target.value)}
                className="numeric bg-transparent text-sm outline-none"
              />
            </div>
            <button
              type="button"
              aria-label="Next date"
              onClick={() => setWorkingDate(shiftDate(workingDate, 1))}
              className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setWorkingDate(todayISO())}
            className="hidden rounded-md border border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground sm:block"
          >
            Today
          </button>
        </div>
      </nav>

      <div className="flex min-h-0 flex-1">
        <div ref={canvasRef} className="relative min-w-0 flex-1 overflow-auto p-6">
          {ready &&
            visible.map((p) => (
              <PlatformPanel
                key={p.id}
                platform={p}
                layout={layout[p.id] ?? { x: 0, y: 0, minimised: false }}
                bounds={{
                  width: Math.max(bounds.width - 48, PANEL_WIDTH),
                  height: Math.max(bounds.height - 48, 400),
                }}
                zIndex={zFor(p.id)}
                onFocus={() => focus(p.id)}
                onAddRow={() => setAddFor(p.id)}
                onAddPayout={() => setPayoutFor(p.id)}
                onOpenDetail={() => setDetailFor(p.id)}
              />
            ))}
          {ready && visible.length === 0 && (
            <p className="pt-20 text-center text-xs text-muted-foreground">
              All panels are minimised. Restore them from the dock below.
            </p>
          )}
        </div>

        {detailPlatform && (
          <PlatformDetail platform={detailPlatform} onClose={() => setDetailFor(null)} />
        )}
      </div>

      <footer className="flex h-11 shrink-0 items-center gap-3 border-t border-border bg-console px-4">
        <span className="label-micro flex shrink-0 items-center gap-1.5">
          <LayoutGrid className="size-3.5" /> Minimised
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {minimised.length === 0 ? (
            <span className="text-[11px] text-muted-foreground">No panels minimised</span>
          ) : (
            minimised.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPanel(p.id, { minimised: false })}
                className="shrink-0 rounded border border-border bg-panel px-3 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              >
                {p.name}
              </button>
            ))
          )}
        </div>
        <button
          type="button"
          onClick={restoreAll}
          className="flex shrink-0 items-center gap-1.5 rounded border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-3" /> Restore all
        </button>
      </footer>

      {addPlatform && (
        <AddRowDialog platform={addPlatform} date={workingDate} onClose={() => setAddFor(null)} />
      )}

      {payoutPlatform && (
        <AddPayoutDialog
          platform={payoutPlatform}
          date={workingDate}
          onClose={() => setPayoutFor(null)}
        />
      )}
    </div>
  );
}

