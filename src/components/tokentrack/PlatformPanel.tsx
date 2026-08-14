import { useEffect, useRef, useState } from "react";
import { Minus, GripVertical, Maximize2, Plus, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STATUS_LABEL,
  fmtNum,
  fmtPhp,
  fmtUsd,
  useTokenTrack,
  type PanelLayout,
} from "@/lib/tokentrack/store";
import type { Platform } from "@/lib/tokentrack/types";

const STATUS_STYLES: Record<Platform["status"], string> = {
  active: "text-status-active border-status-active/30 bg-status-active/10",
  testing: "text-status-testing border-status-testing/30 bg-status-testing/10",
  inactive: "text-status-retired border-status-retired/30 bg-status-retired/10",
};

const PANEL_WIDTH = 380;

interface Props {
  platform: Platform;
  layout: PanelLayout;
  bounds: { width: number; height: number };
  onAddRow: () => void;
  onAddPayout: () => void;
  onOpenDetail: () => void;
  onFocus: () => void;
  zIndex: number;
}

export function PlatformPanel({
  platform,
  layout,
  bounds,
  onAddRow,
  onAddPayout,
  onOpenDetail,
  onFocus,
  zIndex,
}: Props) {
  const { currentTotalFor, currentFollowersFor, usdPhpRate, setPanel } = useTokenTrack();
  const currentTotal = currentTotalFor(platform.id);
  const followers = currentFollowersFor(platform.id);
  const ref = useRef<HTMLElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x: layout.x, y: layout.y });


  useEffect(() => {
    if (!dragging) setPos({ x: layout.x, y: layout.y });
  }, [layout.x, layout.y, dragging]);

  const startDrag = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    onFocus();
    const start = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
    const height = ref.current?.offsetHeight ?? 300;
    setDragging(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);

    const clamp = (x: number, y: number) => ({
      // Keep panels retrievable — never let them leave the console area.
      x: Math.min(Math.max(x, 0), Math.max(bounds.width - PANEL_WIDTH, 0)),
      y: Math.min(Math.max(y, 0), Math.max(bounds.height - Math.min(height, 120), 0)),
    });

    const move = (ev: PointerEvent) => {
      setPos(clamp(start.x + ev.clientX - start.px, start.y + ev.clientY - start.py));
    };
    const up = (ev: PointerEvent) => {
      const next = clamp(start.x + ev.clientX - start.px, start.y + ev.clientY - start.py);
      setPos(next);
      setPanel(platform.id, next);
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const dimmed = platform.status === "inactive";

  return (
    <article
      ref={ref}
      onPointerDown={onFocus}
      style={{ left: pos.x, top: pos.y, width: PANEL_WIDTH, zIndex }}
      className={cn(
        "absolute rounded-xl border border-border bg-panel shadow-panel",
        dragging ? "shadow-panel-lift" : "transition-shadow hover:shadow-panel-lift",
      )}
    >
      <header
        onPointerDown={startDrag}
        className={cn(
          "flex items-center justify-between gap-2 rounded-t-xl border-b border-border bg-panel-header px-3 py-2.5",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <GripVertical className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
          <h2 className="truncate text-sm font-semibold tracking-tight">{platform.name}</h2>
          <span
            className={cn(
              "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              STATUS_STYLES[platform.status],
            )}
          >
            {STATUS_LABEL[platform.status]}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={`Open ${platform.name} detail`}
            onClick={onOpenDetail}
            className="grid size-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Maximize2 className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Minimise ${platform.name}`}
            onClick={() => setPanel(platform.id, { minimised: true })}
            className="grid size-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Minus className="size-3.5" />
          </button>
        </div>
      </header>

      <div className={cn("space-y-4 p-4", dimmed && "opacity-60")}>
        <div>
          <p className="label-micro">Current total</p>
          <p className="numeric text-4xl font-semibold leading-none">{fmtUsd(currentTotal)}</p>
          <p className="numeric mt-1 text-lg font-semibold leading-none text-token">
            {fmtPhp(currentTotal * usdPhpRate)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Unpaid balance · @ {usdPhpRate.toFixed(2)} PHP/USD
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-console/60 px-3 py-2">
          <div>
            <p className="label-micro">Followers</p>
            <p className="numeric text-sm">{followers === null ? "—" : fmtNum(followers)}</p>
          </div>
          <div className="text-right">
            <p className="label-micro">Payout to</p>
            <p className="text-sm">{platform.payoutDestination ?? "Unassigned"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onAddRow}
            className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
          >
            <Plus className="size-3.5" /> Add new row
          </button>
          <button
            type="button"
            onClick={onAddPayout}
            className="flex items-center justify-center gap-1.5 rounded-md border border-border py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
          >
            <Banknote className="size-3.5" /> Add payout
          </button>
        </div>
      </div>

    </article>
  );
}

export { PANEL_WIDTH };
