import { useState } from "react";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { fmtHours, fmtNum, fmtUsd, useTokenTrack } from "@/lib/tokentrack/store";
import type { EntryRow, Platform } from "@/lib/tokentrack/types";

interface Props {
  platform: Platform;
  onClose: () => void;
}

const cellInput =
  "w-20 rounded border border-input bg-console px-1.5 py-1 text-xs numeric outline-none focus:border-ring";

export function PlatformDetail({ platform, onClose }: Props) {
  const { rowsFor, updateRow, deleteRow, workingDate } = useTokenTrack();
  const rows = rowsFor(platform.id);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<EntryRow>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const beginEdit = (row: EntryRow) => {
    setEditing(row.id);
    setDraft({ tokens: row.tokens, usdActual: row.usdActual, followers: row.followers, minutes: row.minutes });
  };

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  return (
    <aside className="flex h-full w-full flex-col border-l border-border bg-panel lg:w-[440px]">
      <header className="flex items-center justify-between border-b border-border bg-panel-header px-4 py-3">
        <div className="min-w-0">
          <p className="label-micro">Platform detail</p>
          <h2 className="truncate text-sm font-semibold">{platform.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail"
          className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="grid grid-cols-2 gap-px border-b border-border bg-border">
        <div className="bg-panel p-3">
          <p className="label-micro">Opening balance</p>
          <p className="numeric text-sm">{fmtUsd(platform.openingBalanceUsd)}</p>
          <p className="text-[10px] text-muted-foreground">as of {platform.openingDate}</p>
        </div>
        <div className="bg-panel p-3">
          <p className="label-micro">Token rule</p>
          <p className="numeric text-sm text-token">
            {platform.tokenValueUsd ? `$${platform.tokenValueUsd.toFixed(3)} / token` : "not applicable"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {platform.inputMode === "usd" ? "USD is authoritative" : "stored per row at entry"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-xs text-muted-foreground">
            No records yet. Use “Add new row” on the {platform.name} panel.
          </p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-panel-header">
              <tr className="label-micro">
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-2 py-2 font-semibold">Session</th>
                <th className="px-2 py-2 font-semibold">Tokens</th>
                <th className="px-2 py-2 font-semibold">USD</th>
                <th className="px-2 py-2 font-semibold">Fol.</th>
                <th className="px-2 py-2 font-semibold">Hrs</th>
                <th className="px-2 py-2 font-semibold">$/hr</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isEditing = editing === row.id;
                return (
                  <tr
                    key={row.id}
                    className={`border-t border-border ${row.date === workingDate ? "bg-secondary/30" : ""}`}
                  >
                    <td className="numeric px-3 py-2 text-muted-foreground">{row.date}</td>
                    <td className="numeric px-2 py-2 text-muted-foreground">
                      {row.startTime && row.endTime ? `${row.startTime}–${row.endTime}` : "—"}
                      {row.roomCount ? (
                        <span className="ml-1 text-[9px] uppercase">{row.roomCount} rm</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 text-token">
                      {isEditing ? (
                        <input
                          className={cellInput}
                          defaultValue={row.tokens ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, tokens: num(e.target.value) }))}
                        />
                      ) : row.tokens === null ? (
                        "—"
                      ) : (
                        <span className="numeric">{fmtNum(row.tokens)}</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {isEditing ? (
                        <input
                          className={cellInput}
                          defaultValue={row.usdActual ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, usdActual: num(e.target.value) }))}
                        />
                      ) : (
                        <span className="numeric">
                          {fmtUsd(row.usdValue)}
                          <span className="ml-1 text-[9px] uppercase text-muted-foreground">
                            {row.usdSource === "actual" ? "act" : "calc"}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="numeric px-2 py-2">
                      {row.followerChange >= 0 ? `+${row.followerChange}` : row.followerChange}
                      {row.followersStart !== null && row.followersStart !== undefined && (
                        <span className="ml-1 text-[9px] text-muted-foreground">
                          {row.followersStart}→{row.followersEnd}
                        </span>
                      )}
                    </td>
                    <td className="numeric px-2 py-2">{fmtHours(row.minutesValue)}</td>
                    <td className="numeric px-2 py-2">
                      {row.usdPerHour === null ? "—" : fmtUsd(row.usdPerHour)}
                    </td>

                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <button
                            type="button"
                            aria-label="Save changes"
                            onClick={() => {
                              updateRow(row.id, draft);
                              setEditing(null);
                            }}
                            className="grid size-6 place-items-center rounded text-status-active hover:bg-secondary"
                          >
                            <Check className="size-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label="Edit row"
                            onClick={() => beginEdit(row)}
                            className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={confirmDelete === row.id ? "Confirm delete" : "Delete row"}
                          onClick={() =>
                            confirmDelete === row.id
                              ? (deleteRow(row.id), setConfirmDelete(null))
                              : setConfirmDelete(row.id)
                          }
                          className={`grid size-6 place-items-center rounded hover:bg-secondary ${
                            confirmDelete === row.id
                              ? "text-destructive"
                              : "text-muted-foreground hover:text-destructive"
                          }`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <footer className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
        Click delete twice to confirm. Edits update every dependent figure immediately.
      </footer>
    </aside>
  );
}
