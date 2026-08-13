export type PlatformStatus = "active" | "testing" | "inactive";

/** How a platform reports its numbers. Drives which inputs are shown. */
export type InputMode = "tokens" | "usd" | "tokens_and_usd";

export interface Platform {
  /** Stable platform identity — never reused when a slot is reassigned. */
  id: string;
  /** Underlying platform identity (e.g. "Chaturbate"). Configured in Settings. */
  name: string;
  /** Short editable label shown on the dashboard (e.g. "CB"). */
  displayName: string;
  status: PlatformStatus;
  /** Dashboard display/order position 1..6. Separate from platform identity. */
  slot: number;
  inputMode: InputMode;
  /** USD per token — always platform-specific, never a global rate. */
  tokenValueUsd: number | null;
  /** Verified opening balance in USD as of the opening date. */
  openingBalanceUsd: number;
  openingDate: string;
  accent: string;
  /** Configured payout destination (set in Settings), e.g. "Coins.ph" or "Wise". */
  payoutDestination?: string | null;
  /** Free-text payout information: account reference, schedule, minimum, etc. */
  payoutInfo?: string | null;
}

/** A payout withdrawn from a platform balance. Stored separately from earnings rows. */
export interface Payout {
  id: string;
  platformId: string;
  /** ISO date (yyyy-mm-dd) of the payout. */
  date: string;
  /** Positive USD amount withdrawn. Never stores currency symbols. */
  amountUsd: number;
  /** Destination captured at payout time so history is never rewritten. */
  destination: string;
  /** USD/PHP rate captured at payout time. */
  usdPhpRateAtEntry: number | null;
  note: string;
  createdAt: string;
}

export type ValueSource = "actual" | "calculated" | "estimated";

export interface EntryRow {
  id: string;
  platformId: string;
  /** ISO date (yyyy-mm-dd) the record belongs to. */
  date: string;
  /** Session start/end as HH:mm (24h). Optional for legacy rows. */
  startTime?: string | null;
  endTime?: string | null;
  /** Derived from start time (Morning/Afternoon/Evening/Night). Never entered manually. */
  timeOfDay?: string | null;
  /** Number of rooms/shows in the session. */
  roomCount?: number | null;
  /** Follower snapshots — never overwritten, kept per session. */
  followersStart?: number | null;
  followersEnd?: number | null;
  tokens: number | null;
  usdActual: number | null;
  /** Legacy net follower change when start/end snapshots are absent. */
  followers: number | null;
  /** Legacy manual duration in minutes when start/end times are absent. */
  minutes: number | null;
  /** Rate captured at entry time so history is never rewritten. */
  tokenValueUsdAtEntry: number | null;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface DerivedRow extends EntryRow {
  usdValue: number;
  usdSource: ValueSource;
  /** Session duration in minutes, from start/end times when available. */
  minutesValue: number;
  /** Followers at end minus followers at start. */
  followerChange: number;
  /** USD earned per hour of session time; null when duration is zero. */
  usdPerHour: number | null;
}

