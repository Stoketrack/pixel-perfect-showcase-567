export type PlatformStatus = "active" | "testing" | "paused" | "retired";

/** How a platform reports its numbers. Drives which inputs are shown. */
export type InputMode = "tokens" | "usd" | "tokens_and_usd";

export interface Platform {
  /** Stable platform identity — never reused when a slot is reassigned. */
  id: string;
  name: string;
  status: PlatformStatus;
  /** Dashboard slot 1..6. Slot identity is separate from platform identity. */
  slot: number;
  inputMode: InputMode;
  /** USD per token, used only when inputMode includes tokens. */
  tokenValueUsd: number | null;
  /** Verified opening balance in USD as of the opening date. */
  openingBalanceUsd: number;
  openingDate: string;
  accent: string;
}

export type ValueSource = "actual" | "calculated" | "estimated";

export interface EntryRow {
  id: string;
  platformId: string;
  /** ISO date (yyyy-mm-dd) the record belongs to. */
  date: string;
  tokens: number | null;
  usdActual: number | null;
  followers: number | null;
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
}
