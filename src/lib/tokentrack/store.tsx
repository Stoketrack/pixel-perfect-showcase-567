import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DerivedRow, EntryRow, Payout, Platform, PlatformStatus } from "./types";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "tokentrack.v1"; /* legacy — read-only, never written again */
const LAYOUT_KEY = "tokentrack.layout.v1"; /* UI layout only, stays in browser */
const MIGRATION_KEY = "tokentrack.migrated";
export const OPENING_DATE = "2026-08-01";

export const DEFAULT_PLATFORMS: Platform[] = [
  {
    id: "pf-chaturbate",
    name: "Chaturbate",
    displayName: "CB",
    status: "active",
    slot: 1,
    inputMode: "tokens_and_usd",
    tokenValueUsd: 0.05,
    openingBalanceUsd: 0,
    openingDate: OPENING_DATE,
    accent: "var(--color-accent)",
    payoutDestination: "Coins.ph",
    payoutInfo: "",
  },
  {
    id: "pf-cam4",
    name: "Cam4",
    displayName: "C4",
    status: "active",
    slot: 2,
    inputMode: "tokens_and_usd",
    tokenValueUsd: 0.1,
    openingBalanceUsd: 0,
    openingDate: OPENING_DATE,
    accent: "var(--color-accent)",
    payoutDestination: "Coins.ph",
    payoutInfo: "",
  },
  {
    id: "pf-bongacams",
    name: "BongaCams",
    displayName: "BC",
    status: "active",
    slot: 3,
    inputMode: "tokens_and_usd",
    // Observed effective rate: 1,324 tokens = $27.539
    tokenValueUsd: 0.0208,
    openingBalanceUsd: 0,
    openingDate: OPENING_DATE,
    accent: "var(--color-accent)",
    payoutDestination: "Wise",
    payoutInfo: "",
  },
  {
    id: "pf-stripchat",
    name: "Stripchat",
    displayName: "SC",
    status: "active",
    slot: 4,
    inputMode: "tokens_and_usd",
    tokenValueUsd: 0.05,
    openingBalanceUsd: 0,
    openingDate: OPENING_DATE,
    accent: "var(--color-accent)",
    payoutDestination: "Wise",
    payoutInfo: "",
  },
  {
    id: "pf-camsoda",
    name: "CamSoda",
    displayName: "CS",
    status: "active",
    slot: 5,
    inputMode: "tokens_and_usd",
    tokenValueUsd: 0.05,
    openingBalanceUsd: 0,
    openingDate: OPENING_DATE,
    accent: "var(--color-accent)",
    payoutDestination: "Coins.ph",
    payoutInfo: "",
  },
  {
    id: "pf-slot6",
    name: "Open Slot",
    displayName: "—",
    status: "inactive",
    slot: 6,
    inputMode: "tokens_and_usd",
    tokenValueUsd: null,
    openingBalanceUsd: 0,
    openingDate: OPENING_DATE,
    accent: "var(--color-accent)",
    payoutDestination: "",
    payoutInfo: "",
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
}

/** Fallback used only until the live USD/PHP rate arrives. Never user-editable. */
export const FALLBACK_USD_PHP_RATE = 58.5;
const RATE_CACHE_KEY = "tokentrack.fx.usdphp";

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
});

/** Bring stored records forward without ever discarding history. */
function migratePlatform(p: Platform): Platform {
  const legacy = p.status as string;
  const status: Platform["status"] =
    legacy === "active" || legacy === "testing" ? legacy : "inactive";
  const fallback = DEFAULT_PLATFORMS.find((d) => d.id === p.id);
  const numOr = (v: unknown, alt: number) => (typeof v === "number" && Number.isFinite(v) ? v : alt);
  return {
    ...p,
    status,
    displayName: p.displayName?.trim() ? p.displayName : (fallback?.displayName ?? p.name),
    payoutInfo: p.payoutInfo ?? "",
    payoutDestination: p.payoutDestination ?? "",
    slot: numOr(p.slot, fallback?.slot ?? 6),
    openingBalanceUsd: numOr(p.openingBalanceUsd, fallback?.openingBalanceUsd ?? 0),
    tokenValueUsd:
      typeof p.tokenValueUsd === "number" && Number.isFinite(p.tokenValueUsd)
        ? p.tokenValueUsd
        : (fallback?.tokenValueUsd ?? null),
    inputMode: p.inputMode ?? fallback?.inputMode ?? "tokens_and_usd",
    accent: p.accent ?? fallback?.accent ?? "var(--color-accent)",
  };
}

export function rowImportKey(row: Pick<EntryRow, "platformId" | "date" | "startTime">) {
  return `${row.platformId}|${row.date}|${row.startTime ?? "-"}`;
}

function migrateRow(r: EntryRow): EntryRow {
  return {
    ...r,
    origin: r.origin ?? "manual",
    verified: r.verified ?? false,
    importKey: r.importKey ?? rowImportKey(r),
  };
}

// ── Supabase mapping helpers ───────────────────────────────

const toNum = (v: unknown): number | null =>
  v === null || v === undefined ? null : typeof v === "number" ? v : Number(v) || null;

/* eslint-disable @typescript-eslint/no-explicit-any */
function dbToPlatform(row: any): Platform {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    status: row.status,
    slot: Number(row.slot),
    inputMode: row.input_mode,
    tokenValueUsd: toNum(row.token_value_usd),
    openingBalanceUsd: Number(row.opening_balance_usd) || 0,
    openingDate: row.opening_date,
    accent: row.accent,
    payoutDestination: row.payout_destination ?? "",
    payoutInfo: row.payout_info ?? "",
  };
}

function dbToEntryRow(row: any): EntryRow {
  return {
    id: row.id,
    platformId: row.platform_id,
    date: row.date,
    startTime: row.start_time ?? null,
    endTime: row.end_time ?? null,
    timeOfDay: row.time_of_day ?? null,
    roomCount: row.room_count ?? null,
    followersStart: toNum(row.followers_start),
    followersEnd: toNum(row.followers_end),
    tokens: toNum(row.tokens),
    usdActual: toNum(row.usd_actual),
    followers: toNum(row.followers),
    minutes: toNum(row.minutes),
    tokenValueUsdAtEntry: toNum(row.token_value_usd_at_entry),
    note: row.note ?? "",
    origin: row.origin ?? "manual",
    verified: row.verified ?? false,
    importKey: row.import_key ?? null,
    importBatchId: row.import_batch_id ?? null,
    importedAt: row.imported_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dbToPayout(row: any): Payout {
  return {
    id: row.id,
    platformId: row.platform_id,
    date: row.date,
    amountUsd: Number(row.amount_usd) || 0,
    destination: row.destination,
    usdPhpRateAtEntry: toNum(row.usd_php_rate_at_entry),
    note: row.note ?? "",
    createdAt: row.created_at,
  };
}

function platformToDb(p: Platform): Record<string, unknown> {
  return {
    id: p.id,
    name: p.name,
    display_name: p.displayName,
    status: p.status,
    slot: p.slot,
    input_mode: p.inputMode,
    token_value_usd: p.tokenValueUsd,
    opening_balance_usd: p.openingBalanceUsd,
    opening_date: p.openingDate,
    accent: p.accent,
    payout_destination: p.payoutDestination,
    payout_info: p.payoutInfo,
  };
}

function entryRowToDb(r: EntryRow): Record<string, unknown> {
  return {
    id: r.id,
    platform_id: r.platformId,
    date: r.date,
    start_time: r.startTime,
    end_time: r.endTime,
    time_of_day: r.timeOfDay,
    room_count: r.roomCount,
    followers_start: r.followersStart,
    followers_end: r.followersEnd,
    tokens: r.tokens,
    usd_actual: r.usdActual,
    followers: r.followers,
    minutes: r.minutes,
    token_value_usd_at_entry: r.tokenValueUsdAtEntry,
    note: r.note,
    origin: r.origin,
    verified: r.verified,
    import_key: r.importKey,
    import_batch_id: r.importBatchId,
    imported_at: r.importedAt,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

function payoutToDb(p: Payout): Record<string, unknown> {
  return {
    id: p.id,
    platform_id: p.platformId,
    date: p.date,
    amount_usd: p.amountUsd,
    destination: p.destination,
    usd_php_rate_at_entry: p.usdPhpRateAtEntry,
    note: p.note,
    created_at: p.createdAt,
  };
}

function platformPatchToDb(patch: Partial<Platform>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (patch.name !== undefined) db.name = patch.name;
  if (patch.displayName !== undefined) db.display_name = patch.displayName;
  if (patch.status !== undefined) db.status = patch.status;
  if (patch.slot !== undefined) db.slot = patch.slot;
  if (patch.inputMode !== undefined) db.input_mode = patch.inputMode;
  if (patch.tokenValueUsd !== undefined) db.token_value_usd = patch.tokenValueUsd;
  if (patch.openingBalanceUsd !== undefined) db.opening_balance_usd = patch.openingBalanceUsd;
  if (patch.openingDate !== undefined) db.opening_date = patch.openingDate;
  if (patch.accent !== undefined) db.accent = patch.accent;
  if (patch.payoutDestination !== undefined) db.payout_destination = patch.payoutDestination;
  if (patch.payoutInfo !== undefined) db.payout_info = patch.payoutInfo;
  return db;
}

function entryPatchToDb(patch: Partial<EntryRow>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (patch.platformId !== undefined) db.platform_id = patch.platformId;
  if (patch.date !== undefined) db.date = patch.date;
  if (patch.startTime !== undefined) db.start_time = patch.startTime;
  if (patch.endTime !== undefined) db.end_time = patch.endTime;
  if (patch.timeOfDay !== undefined) db.time_of_day = patch.timeOfDay;
  if (patch.roomCount !== undefined) db.room_count = patch.roomCount;
  if (patch.followersStart !== undefined) db.followers_start = patch.followersStart;
  if (patch.followersEnd !== undefined) db.followers_end = patch.followersEnd;
  if (patch.tokens !== undefined) db.tokens = patch.tokens;
  if (patch.usdActual !== undefined) db.usd_actual = patch.usdActual;
  if (patch.followers !== undefined) db.followers = patch.followers;
  if (patch.minutes !== undefined) db.minutes = patch.minutes;
  if (patch.tokenValueUsdAtEntry !== undefined) db.token_value_usd_at_entry = patch.tokenValueUsdAtEntry;
  if (patch.note !== undefined) db.note = patch.note;
  if (patch.origin !== undefined) db.origin = patch.origin;
  if (patch.verified !== undefined) db.verified = patch.verified;
  if (patch.importKey !== undefined) db.import_key = patch.importKey;
  if (patch.importBatchId !== undefined) db.import_batch_id = patch.importBatchId;
  if (patch.importedAt !== undefined) db.imported_at = patch.importedAt;
  return db;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * One-time migration: pushes existing localStorage `tokentrack.v1` data into
 * Supabase so no figures are lost. Platforms are upserted (custom settings win);
 * entries and payouts are inserted with ON CONFLICT DO NOTHING so existing DB
 * rows are never overwritten. The legacy localStorage key is left untouched.
 */
async function migrateLocalStorageToSupabase(): Promise<void> {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  let parsed: Partial<PersistedState>;
  try {
    parsed = JSON.parse(raw) as Partial<PersistedState>;
  } catch {
    return;
  }

  if (parsed.platforms?.length) {
    const dbRows = parsed.platforms.map(migratePlatform).map(platformToDb);
    const { error } = await supabase
      .from("tokentrack_platforms")
      .upsert(dbRows, { onConflict: "id" });
    if (error) console.error("Platform migration error:", error);
  }

  if (parsed.rows?.length) {
    const dbRows = parsed.rows.map(migrateRow).map(entryRowToDb);
    const { error } = await supabase
      .from("tokentrack_entries")
      .upsert(dbRows, { onConflict: "id", ignoreDuplicates: true });
    if (error) console.error("Entry migration error:", error);
  }

  if (parsed.payouts?.length) {
    const dbRows = parsed.payouts.map(payoutToDb);
    const { error } = await supabase
      .from("tokentrack_payouts")
      .upsert(dbRows, { onConflict: "id", ignoreDuplicates: true });
    if (error) console.error("Payout migration error:", error);
  }
}

/** Live USD→PHP rate, fetched automatically. Never entered by the user. */
async function fetchUsdPhpRate(): Promise<number | null> {
  const sources = [
    { url: "https://open.er-api.com/v6/latest/USD", pick: (j: any) => j?.rates?.PHP },
    { url: "https://api.frankfurter.app/latest?from=USD&to=PHP", pick: (j: any) => j?.rates?.PHP },
  ];
  for (const s of sources) {
    try {
      const res = await fetch(s.url);
      if (!res.ok) continue;
      const rate = s.pick(await res.json());
      if (typeof rate === "number" && rate > 0) return rate;
    } catch {
      /* try the next source */
    }
  }
  return null;
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

/** Never let a missing/corrupt figure crash the UI — render 0 instead. */
const safeNum = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : 0);

export const fmtUsd = (n: number) =>
  safeNum(n).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

export const fmtPhp = (n: number) =>
  `₱${safeNum(n).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const fmtNum = (n: number) => safeNum(n).toLocaleString("en-US");

export const fmtHours = (minutes: number) => {
  const m = Math.max(0, Math.round(safeNum(minutes)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

interface StoreValue {
  ready: boolean;
  platforms: Platform[];
  rows: EntryRow[];
  payouts: Payout[];
  layout: Record<string, PanelLayout>;
  /** Live USD→PHP rate (auto-fetched, read-only). */
  usdPhpRate: number;
  rateUpdatedAt: string | null;
  rateIsLive: boolean;
  workingDate: string;
  setWorkingDate: (d: string) => void;
  rowsFor: (platformId: string, date?: string) => DerivedRow[];
  summaryFor: (platformId: string, date: string) => PlatformSummary;
  /** Opening balance + all recorded earnings - all recorded payouts. */
  currentTotalFor: (platformId: string) => number;
  /** Latest recorded follower count for the platform, or null when unknown. */
  currentFollowersFor: (platformId: string) => number | null;
  /** Most recent saved entry for a platform (by date/createdAt), or null when none exist. */
  lastEntryFor: (platformId: string) => EntryRow | null;
  /** Total tokens across all saved entries for a platform (running total). */
  totalTokensFor: (platformId: string) => number;
  /** Total USD earned across all saved entries for a platform (running total). */
  totalUsdFor: (platformId: string) => number;
  payoutsFor: (platformId: string) => Payout[];
  addPayout: (payout: { platformId: string; date: string; amountUsd: number; note?: string }) => void;
  addRow: (
    row: Omit<EntryRow, "id" | "createdAt" | "updatedAt" | "origin" | "verified"> &
      Partial<Pick<EntryRow, "origin" | "verified">>,
  ) => void;
  /**
   * Additive, duplicate-safe merge for future verified platform imports.
   * Matches on importKey: enriches an existing provisional row, inserts when new,
   * and never deletes or rewrites unrelated history.
   */
  importRows: (
    incoming: Array<Partial<EntryRow> & Pick<EntryRow, "platformId" | "date">>,
    batchId: string,
  ) => { inserted: number; enriched: number; unchanged: number };
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
  const [fx, setFx] = useState<{ rate: number; updatedAt: string | null; live: boolean }>({
    rate: FALLBACK_USD_PHP_RATE,
    updatedAt: null,
    live: false,
  });

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // 1. Load layout from localStorage (browser-only UI state)
      let layout = defaultLayout(DEFAULT_PLATFORMS);
      try {
        const layoutRaw = window.localStorage.getItem(LAYOUT_KEY);
        if (layoutRaw) {
          layout = { ...layout, ...JSON.parse(layoutRaw) };
        } else {
          const legacyRaw = window.localStorage.getItem(STORAGE_KEY);
          if (legacyRaw) {
            const legacy = JSON.parse(legacyRaw) as Partial<PersistedState>;
            if (legacy.layout) layout = { ...layout, ...legacy.layout };
          }
        }
      } catch {
        /* no layout */
      }

      // 2. One-time migration of legacy localStorage data into Supabase
      try {
        const migrated = window.localStorage.getItem(MIGRATION_KEY);
        if (!migrated) {
          await migrateLocalStorageToSupabase();
          window.localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
        }
      } catch (e) {
        console.error("Migration failed:", e);
      }

      // 3. Load all operational data from Supabase
      try {
        const [platformsRes, entriesRes, payoutsRes] = await Promise.all([
          supabase.from("tokentrack_platforms").select("*").order("slot"),
          supabase.from("tokentrack_entries").select("*"),
          supabase.from("tokentrack_payouts").select("*"),
        ]);

        if (platformsRes.error) throw platformsRes.error;
        if (entriesRes.error) throw entriesRes.error;
        if (payoutsRes.error) throw payoutsRes.error;

        const platforms = (platformsRes.data ?? []).map(dbToPlatform);
        const rows = (entriesRes.data ?? []).map(dbToEntryRow);
        const payouts = (payoutsRes.data ?? []).map(dbToPayout);

        if (!cancelled) {
          setState({
            platforms: platforms.length > 0 ? platforms.map(migratePlatform) : DEFAULT_PLATFORMS,
            rows,
            payouts,
            layout,
          });
        }
      } catch (e) {
        console.error("Failed to load from Supabase:", e);
        if (!cancelled) setState({ ...emptyState(), layout });
      }

      if (!cancelled) setReady(true);
    };

    void init();

    // 4. FX rate (unchanged — browser-cached, auto-refreshed)
    try {
      const cached = window.localStorage.getItem(RATE_CACHE_KEY);
      if (cached) {
        const c = JSON.parse(cached) as { rate: number; updatedAt: string };
        if (typeof c.rate === "number" && c.rate > 0) {
          setFx({ rate: c.rate, updatedAt: c.updatedAt, live: true });
        }
      }
    } catch {
      /* no cached rate */
    }
    const refresh = async () => {
      const rate = await fetchUsdPhpRate();
      if (cancelled || rate === null) return;
      const updatedAt = new Date().toISOString();
      setFx({ rate, updatedAt, live: true });
      try {
        window.localStorage.setItem(RATE_CACHE_KEY, JSON.stringify({ rate, updatedAt }));
      } catch {
        /* storage unavailable */
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 60 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  // Layout persists in the browser only — never sent to Supabase.
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(state.layout));
    } catch {
      /* storage unavailable */
    }
  }, [state.layout, ready]);

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

  const lastEntryFor = useCallback(
    (platformId: string): EntryRow | null => {
      const rows = state.rows
        .filter((r) => r.platformId === platformId)
        .sort((a, b) =>
          a.date === b.date
            ? a.createdAt.localeCompare(b.createdAt)
            : a.date.localeCompare(b.date),
        );
      return rows.length > 0 ? rows[rows.length - 1] : null;
    },
    [state.rows],
  );

  const totalTokensFor = useCallback(
    (platformId: string): number =>
      state.rows
        .filter((r) => r.platformId === platformId)
        .reduce((sum, r) => sum + (r.tokens ?? 0), 0),
    [state.rows],
  );

  const totalUsdFor = useCallback(
    (platformId: string): number =>
      state.rows
        .filter((r) => r.platformId === platformId)
        .reduce((sum, r) => sum + deriveRow(r).usdValue, 0),
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
      usdPhpRate: fx.rate,
      rateUpdatedAt: fx.updatedAt,
      rateIsLive: fx.live,
      workingDate,
      setWorkingDate,
      rowsFor,
      summaryFor,
      currentTotalFor,
      currentFollowersFor,
      lastEntryFor,
      totalTokensFor,
      totalUsdFor,
      payoutsFor,
      addPayout: ({ platformId, date, amountUsd, note }) =>
        setState((s) => {
          const platform = s.platforms.find((p) => p.id === platformId);
          if (!platform || !Number.isFinite(amountUsd) || amountUsd <= 0) return s;
          const payout: Payout = {
            id: `payout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            platformId,
            date,
            amountUsd,
            destination: platform.payoutDestination ?? "Unassigned",
            usdPhpRateAtEntry: fx.rate,
            note: note ?? "",
            createdAt: new Date().toISOString(),
          };
          void supabase
            .from("tokentrack_payouts")
            .insert(payoutToDb(payout))
            .then(({ error }) => {
              if (error) console.error("Failed to persist payout:", error);
            });
          return { ...s, payouts: [...s.payouts, payout] };
        }),
      addRow: (row) =>
        setState((s) => {
          const now = new Date().toISOString();
          const full: EntryRow = {
            origin: "manual",
            verified: false,
            ...row,
            importKey: rowImportKey(row),
            id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            createdAt: now,
            updatedAt: now,
          };
          void supabase
            .from("tokentrack_entries")
            .insert(entryRowToDb(full))
            .then(({ error }) => {
              if (error) console.error("Failed to persist entry row:", error);
            });
          return { ...s, rows: [...s.rows, full] };
        }),
      importRows: (incoming, batchId) => {
        const stats = { inserted: 0, enriched: 0, unchanged: 0 };
        const toInsert: EntryRow[] = [];
        const toUpdate: { id: string; patch: Record<string, unknown> }[] = [];
        setState((s) => {
          const now = new Date().toISOString();
          const rows = [...s.rows];
          for (const item of incoming) {
            const key = item.importKey ?? rowImportKey({ startTime: null, ...item });
            const idx = rows.findIndex((r) => (r.importKey ?? rowImportKey(r)) === key);
            if (idx === -1) {
              const full: EntryRow = {
                startTime: null,
                endTime: null,
                timeOfDay: null,
                roomCount: null,
                followersStart: null,
                followersEnd: null,
                tokens: null,
                usdActual: null,
                followers: null,
                minutes: null,
                tokenValueUsdAtEntry: null,
                note: "",
                ...item,
                origin: "imported",
                verified: true,
                importKey: key,
                importBatchId: batchId,
                importedAt: now,
                id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                createdAt: now,
                updatedAt: now,
              } as EntryRow;
              rows.push(full);
              toInsert.push(full);
              stats.inserted += 1;
              continue;
            }
            const existing = rows[idx] as EntryRow;
            if (existing.verified && existing.importBatchId === batchId) {
              stats.unchanged += 1;
              continue;
            }
            const merged: EntryRow = {
              ...existing,
              ...Object.fromEntries(
                Object.entries(item).filter(([, v]) => v !== undefined && v !== null),
              ),
              id: existing.id,
              createdAt: existing.createdAt,
              origin: "imported",
              verified: true,
              importKey: key,
              importBatchId: batchId,
              importedAt: now,
              updatedAt: now,
            };
            rows[idx] = merged;
            toUpdate.push({ id: merged.id, patch: entryRowToDb(merged) });
            stats.enriched += 1;
          }
          // Persist asynchronously
          if (toInsert.length) {
            void supabase
              .from("tokentrack_entries")
              .insert(toInsert.map(entryRowToDb))
              .then(({ error }) => {
                if (error) console.error("Failed to persist imported rows:", error);
              });
          }
          for (const { id, patch } of toUpdate) {
            void supabase
              .from("tokentrack_entries")
              .update(patch)
              .eq("id", id)
              .then(({ error }) => {
                if (error) console.error("Failed to persist enriched row:", error);
              });
          }
          return { ...s, rows };
        });
        return stats;
      },
      updateRow: (id, patch) => {
        const now = new Date().toISOString();
        setState((s) => ({
          ...s,
          rows: s.rows.map((r) =>
            r.id === id ? { ...r, ...patch, updatedAt: now } : r,
          ),
        }));
        void supabase
          .from("tokentrack_entries")
          .update({ ...entryPatchToDb(patch), updated_at: now })
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("Failed to persist row update:", error);
          });
      },
      deleteRow: (id) => {
        setState((s) => ({ ...s, rows: s.rows.filter((r) => r.id !== id) }));
        void supabase
          .from("tokentrack_entries")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("Failed to delete row:", error);
          });
      },
      updatePlatform: (id, patch) => {
        setState((s) => ({
          ...s,
          platforms: s.platforms.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
        void supabase
          .from("tokentrack_platforms")
          .update(platformPatchToDb(patch))
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("Failed to persist platform update:", error);
          });
      },
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
    [
      ready,
      state,
      fx,
      workingDate,
      rowsFor,
      summaryFor,
      currentTotalFor,
      currentFollowersFor,
      lastEntryFor,
      totalTokensFor,
      totalUsdFor,
      payoutsFor,
    ],
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
  inactive: "Inactive",
};
