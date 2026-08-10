import { useState } from "react";
import { X } from "lucide-react";
import { useTokenTrack } from "@/lib/tokentrack/store";
import type { Platform } from "@/lib/tokentrack/types";

interface Props {
  platform: Platform;
  date: string;
  onClose: () => void;
}

const field =
  "w-full rounded-md border border-input bg-console px-3 py-2 text-sm numeric outline-none focus:border-ring";

export function AddRowDialog({ platform, date, onClose }: Props) {
  const { addRow } = useTokenTrack();
  const [rowDate, setRowDate] = useState(date);
  const [tokens, setTokens] = useState("");
  const [usd, setUsd] = useState("");
  const [followers, setFollowers] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");

  const showTokens = platform.inputMode !== "usd";
  const showUsd = platform.inputMode !== "tokens";

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = (num(hours) ?? 0) * 60 + (num(minutes) ?? 0);
    addRow({
      platformId: platform.id,
      date: rowDate,
      tokens: showTokens ? num(tokens) : null,
      usdActual: showUsd ? num(usd) : null,
      followers: num(followers),
      minutes: mins || null,
      tokenValueUsdAtEntry: platform.tokenValueUsd,
      note: note.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-100 grid place-items-center bg-console/80 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-xl border border-border bg-panel shadow-panel-lift"
      >
        <header className="flex items-center justify-between border-b border-border bg-panel-header px-4 py-3">
          <div>
            <p className="label-micro">New row for</p>
            <h2 className="text-sm font-semibold">{platform.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel"
            className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="space-y-4 p-4">
          <div>
            <label className="label-micro" htmlFor="row-date">
              Date
            </label>
            <input
              id="row-date"
              type="date"
              value={rowDate}
              onChange={(e) => setRowDate(e.target.value)}
              className={field}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {showTokens && (
              <div>
                <label className="label-micro" htmlFor="row-tokens">
                  Actual tokens
                </label>
                <input
                  id="row-tokens"
                  inputMode="numeric"
                  value={tokens}
                  onChange={(e) => setTokens(e.target.value)}
                  placeholder="0"
                  className={`${field} text-token`}
                />
              </div>
            )}
            {showUsd && (
              <div>
                <label className="label-micro" htmlFor="row-usd">
                  Actual USD earned
                </label>
                <input
                  id="row-usd"
                  inputMode="decimal"
                  value={usd}
                  onChange={(e) => setUsd(e.target.value)}
                  placeholder="0.00"
                  className={field}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-micro" htmlFor="row-followers">
                Followers
              </label>
              <input
                id="row-followers"
                inputMode="numeric"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                placeholder="0"
                className={field}
              />
            </div>
            <div>
              <label className="label-micro" htmlFor="row-hours">
                Hours
              </label>
              <input
                id="row-hours"
                inputMode="numeric"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0"
                className={field}
              />
            </div>
            <div>
              <label className="label-micro" htmlFor="row-minutes">
                Minutes
              </label>
              <input
                id="row-minutes"
                inputMode="numeric"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="0"
                className={field}
              />
            </div>
          </div>

          <div>
            <label className="label-micro" htmlFor="row-note">
              Note (optional)
            </label>
            <input
              id="row-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Source of these figures"
              className={`${field} font-sans`}
            />
          </div>

          {showUsd && showTokens && (
            <p className="rounded-md border border-border bg-console/60 p-2 text-[11px] text-muted-foreground">
              Enter the figures the platform actually reported. If you leave USD blank it is
              calculated from tokens at the rate stored with this row, and clearly labelled as
              calculated.
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90"
          >
            Save row
          </button>
        </footer>
      </form>
    </div>
  );
}
