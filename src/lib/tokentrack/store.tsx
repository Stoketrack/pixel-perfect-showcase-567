import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DerivedRow, EntryRow, Payout, Platform, PlatformStatus } from "./types";

const STORAGE_KEY = "tokentrack.v1";
export const OPENING_DATE = "2026-08-01";

export const DEFAULT_PLATFORMS: Platform[] = [
  {
    id: "pf-chaturbate",
    name: "Chaturbate",
    status: "active",
    slot: 1,
    inputMode: "tokens_and_usd",
    tokenValueUsd: 0.05,
    openingBalanceUsd: 0,
    openingDate: OPENING_DATE,
    accent: "var(--color-accent)",
    payoutDestination: "Coins.ph",
  },
  {
    id: "pf-stripchat",
    name: "Stripchat",
    status: "active",
    slot: 2,
    inputMode: "tokens_and_usd",
    tokenValueUsd: 0.05,
    openingBalanceUsd: 0,
    openingDate: OPENING_DATE,
    accent: "var(--color-accent)",
    payoutDestination: "Wise",
  },
  {
    id: "pf-cam4",
    name: "Cam4",
    status: "active",
    slot: 3,
    inputMode: "tokens_and_usd",
    tokenValueUsd: 0.1,
    openingBalanceUsd: 0,
    openingDate: OPENING_DATE,
    accent: "var(--color-accent)",
    payoutDestination: "Coins.ph",
  },
  {
    id: "pf-bongacams",
    name: "BongaCams",
    status: "active",
    slot: 4,
    inputMode: "usd",
    tokenValueUsd: null,
    openingBalanceUsd: 0,
    openingDate: OPENING_DATE,
    accent: "var(--color-accent)",
    payoutDestination: "Wise",
  },
  {
    id: "pf-camsoda",
    name: "CamSoda",
    status: "testing",
    slot: 5,
    inputMode: "tokens_and_usd",
    tokenValueUsd: 0.05,
    openingBalanceUsd: 0,
    openingDate: OPENING_DATE,
    accent: "var(--color-accent)",
    payoutDestination: "Coins.ph",
  },
  {
    id: "pf-slot6",
    name: "Open Slot",
    status: "paused",
    slot: 6,
    inputMode: "usd",
    tokenValueUsd: null,
    openingBalanceUsd: 0,
    openingDate: OPENING_DATE,
    accent: "var(--color-accent)",
    payoutDestination: "Coins.ph",
  },
];

export interface PanelLayout {
  x: number;
  y: number;
  minimised: boolean;
}

interface PersistedState {
  platforms: Platform[];
  rows: EntryRow[];
  payouts: Payout[];
  layout: Record<string, PanelLayout>;
  usdPhpRate: number;
}

/** Application-wide USD to PHP rate (configurable later in Settings). */
export const DEFAULT_USD_PHP_RATE = 58.5;

const defaultLayout = (platforms: Platform[]): Record<string, PanelLayout> => {
  const out: Record<string, PanelLayout> = {};
  platforms.forEach((p, i) => {
    out[p.id] = { x: (i % 3) * 400, y: Math.floor(i / 3) * 404, minimised: false };
  });
  return out;
};

const emptyState = (): PersistedState => ({
  platforms: DEFAULT_PLATFORMS,
  rows: [],
  payouts: [],
  layout: defaultLayout(DEFAULT_PLATFORMS),
  usdPhpRate: DEFAULT_USD_PHP_RATE,
});

function load(): PersistedState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const platforms = parsed.platforms?.length ? parsed.platforms : DEFAULT_PLATFORMS;
    return {
      platforms,
      rows: parsed.rows ?? [],
      payouts: parsed.payouts ?? [],
      layout: { ...defaultLayout(platforms), ...(parsed.layout ?? {}) },
      usdPhpRate:
        typeof parsed.usdPhpRate === "number" && parsed.usdPhpRate > 0
          ? parsed.usdPhpRate
          : DEFAULT_USD_PHP_RATE,
    };
  } catch {
    return emptyState();
  }
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Minutes between two HH:mm strings; wraps past midnight. */
export function durationMinutes(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const [sh = NaN, sm = NaN] = start.split(":").map(Number);
  const [eh = NaN, em = NaN] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff < 0 ? diff + 1440 : diff;
}

/** Time-of-day band derived from a HH:mm start time. */
export function timeOfDayFrom(start?: string | null): string | null {
  if (!start) return null;
  const [h = NaN] = start.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  if (h < 6) return "Night";
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}

/** Single source of truth for turning a stored row into a USD figure. */
export function deriveRow(row: EntryRow): DerivedRow {
  const minutesValue = durationMinutes(row.startTime, row.endTime) ?? row.minutes ?? 0;
  const followerChange =
    row.followersStart !== null &&
    row.followersStart !== undefined &&
    row.followersEnd !== null &&
    row.followersEnd !== undefined
      ? row.followersEnd - row.followersStart
      : (row.followers ?? 0);

  let usdValue = 0;
  let usdSource: DerivedRow["usdSource"] = "estimated";
  if (row.usdActual !== null && row.usdActual !== undefined) {
    usdValue = row.usdActual;
    usdSource = "actual";
  } else if (row.tokens !== null && row.tokenValueUsdAtEntry) {
    usdValue = row.tokens * row.tokenValueUsdAtEntry;
    usdSource = "calculated";
  }

  return {
    ...row,
    usdValue,
    usdSource,
    minutesValue,
    followerChange,
    usdPerHour: minutesValue > 0 ? usdValue / (minutesValue / 60) : null,
  };
}


export const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export const fmtPhp = (n: number) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const fmtNum = (n: number) => n.toLocaleString("en-US");

export const fmtHours = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

interface StoreValue {
  ready: boolean;
  platforms: Platform[];
  rows: EntryRow[];
  payouts: Payout[];
  layout: Record<string, PanelLayout>;
  usdPhpRate: number;
  workingDate: string;
  setWorkingDate: (d: string) => void;
  rowsFor: (platformId: string, date?: string) => DerivedRow[];
  summaryFor: (platformId: string, date: string) => PlatformSummary;
  /** Opening balance + all recorded earnings - all recorded payouts. */
  currentTotalFor: (platformId: string) => number;
  /** Latest recorded follower count for the platform, or null when unknown. */
  currentFollowersFor: (platformId: string) => number | null;
  payoutsFor: (platformId: string) => Payout[];
  addPayout: (payout: { platformId: string; date: string; amountUsd: number; note?: string }) => void;
  addRow: (row: Omit<EntryRow, "id" | "createdAt" | "updatedAt">) => void;
  updateRow: (id: string, patch: Partial<EntryRow>) => void;
  deleteRow: (id: string) => void;
  updatePlatform: (id: string, patch: Partial<Platform>) => void;
  setPanel: (platformId: string, patch: Partial<PanelLayout>) => void;
  restoreAll: () => void;
}

export interface PlatformSummary {
  tokens: number | null;
  usdForDate: number;
  usdSource: "actual" | "calculated" | "mixed" | "none";
  followers: number;
  minutes: number;
  runningTotalUsd: number;
}

const StoreContext = createContext<StoreValue | null>(null);

export function TokenTrackProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(() => emptyState());
  const [ready, setReady] = useState(false);
  const [workingDate, setWorkingDate] = useState<string>(todayISO());

  useEffect(() => {
    setState(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — keep working in memory */
    }
  }, [state, ready]);

  const rowsFor = useCallback(
    (platformId: string, date?: string) =>
      state.rows
        .filter((r) => r.platformId === platformId && (!date || r.date === date))
        .map(deriveRow)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [state.rows],
  );

  const summaryFor = useCallback(
    (platformId: string, date: string): PlatformSummary => {
      const platform = state.platforms.find((p) => p.id === platformId);
      const all = state.rows.filter((r) => r.platformId === platformId).map(deriveRow);
      const forDate = all.filter((r) => r.date === date);
      const tokenRows = forDate.filter((r) => r.tokens !== null);
      const sources = new Set(forDate.map((r) => r.usdSource));
      return {
        tokens: tokenRows.length ? tokenRows.reduce((s, r) => s + (r.tokens ?? 0), 0) : null,
        usdForDate: forDate.reduce((s, r) => s + r.usdValue, 0),
        usdSource:
          forDate.length === 0
            ? "none"
            : sources.size > 1
              ? "mixed"
              : sources.has("actual")
                ? "actual"
                : "calculated",
        followers: forDate.reduce((s, r) => s + r.followerChange, 0),
        minutes: forDate.reduce((s, r) => s + r.minutesValue, 0),
        runningTotalUsd:
          (platform?.openingBalanceUsd ?? 0) +
          all.filter((r) => r.date <= date).reduce((s, r) => s + r.usdValue, 0),
      };
    },
    [state.rows, state.platforms],
  );

  const currentTotalFor = useCallback(
    (platformId: string) => {
      const platform = state.platforms.find((p) => p.id === platformId);
      const earned = state.rows
        .filter((r) => r.platformId === platformId)
        .reduce((sum, r) => sum + deriveRow(r).usdValue, 0);
      const paid = state.payouts
        .filter((p) => p.platformId === platformId)
        .reduce((sum, p) => sum + p.amountUsd, 0);
      return (platform?.openingBalanceUsd ?? 0) + earned - paid;
    },
    [state.rows, state.payouts, state.platforms],
  );

  const currentFollowersFor = useCallback(
    (platformId: string) => {
      const rows = state.rows
        .filter((r) => r.platformId === platformId)
        .filter((r) => r.followersEnd !== null && r.followersEnd !== undefined)
        .sort((a, b) =>
          a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date),
        );
      const last = rows[rows.length - 1];
      return last ? (last.followersEnd ?? null) : null;
    },
    [state.rows],
  );

  const payoutsFor = useCallback(
    (platformId: string) =>
      state.payouts
        .filter((p) => p.platformId === platformId)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [state.payouts],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      platforms: [...state.platforms].sort((a, b) => a.slot - b.slot),
      rows: state.rows,
      payouts: state.payouts,
      layout: state.layout,
      usdPhpRate: state.usdPhpRate,
      workingDate,
      setWorkingDate,
      rowsFor,
      summaryFor,
      currentTotalFor,
      currentFollowersFor,
      payoutsFor,
      addPayout: ({ platformId, date, amountUsd, note }) =>
        setState((s) => {
          const platform = s.platforms.find((p) => p.id === platformId);
          if (!platform || !Number.isFinite(amountUsd) || amountUsd <= 0) return s;
          return {
            ...s,
            payouts: [
              ...s.payouts,
              {
                id: `payout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                platformId,
                date,
                amountUsd,
                destination: platform.payoutDestination ?? "Unassigned",
                usdPhpRateAtEntry: s.usdPhpRate,
                note: note ?? "",
                createdAt: new Date().toISOString(),
              },
            ],
          };
        }),
      addRow: (row) =>
        setState((s) => ({
          ...s,
          rows: [
            ...s.rows,
            {
              ...row,
              id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),
      updateRow: (id, patch) =>
        setState((s) => ({
          ...s,
          rows: s.rows.map((r) =>
            r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r,
          ),
        })),
      deleteRow: (id) => setState((s) => ({ ...s, rows: s.rows.filter((r) => r.id !== id) })),
      updatePlatform: (id, patch) =>
        setState((s) => ({
          ...s,
          platforms: s.platforms.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      setPanel: (platformId, patch) =>
        setState((s) => ({
          ...s,
          layout: {
            ...s.layout,
            [platformId]: { ...(s.layout[platformId] ?? { x: 0, y: 0, minimised: false }), ...patch },
          },
        })),
      restoreAll: () =>
        setState((s) => ({
          ...s,
          layout: Object.fromEntries(
            Object.entries(s.layout).map(([k, v]) => [k, { ...v, minimised: false }]),
          ),
        })),
    }),
    [ready, state, workingDate, rowsFor, summaryFor, currentTotalFor, currentFollowersFor, payoutsFor],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useTokenTrack() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useTokenTrack must be used inside TokenTrackProvider");
  return ctx;
}

export const STATUS_LABEL: Record<PlatformStatus, string> = {
  active: "Active",
  testing: "Testing",
  paused: "Paused",
  retired: "Retired",
};
