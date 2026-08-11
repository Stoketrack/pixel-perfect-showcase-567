import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, X } from "lucide-react";
import { durationMinutes, fmtHours, fmtUsd, useTokenTrack } from "@/lib/tokentrack/store";
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
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [roomCount, setRoomCount] = useState("");
  const [followersStart, setFollowersStart] = useState("");
  const [followersEnd, setFollowersEnd] = useState("");
  const [tokens, setTokens] = useState("");
  const [usd, setUsd] = useState("");
  const [note, setNote] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
    setVoiceSupported(Boolean(SR));
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* nothing to stop */
      }
    };
  }, []);

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (event: any) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) text += event.results[i][0].transcript;
      }
      if (text) setNote((n) => (n ? `${n.trim()} ${text.trim()}` : text.trim()));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  // Live preview of the values that will be derived from this row.
  const previewMinutes = durationMinutes(startTime || null, endTime || null);
  const previewUsd = num(usd) ?? (num(tokens) !== null && platform.tokenValueUsd
    ? (num(tokens) as number) * platform.tokenValueUsd
    : null);
  const previewFollowerChange =
    num(followersStart) !== null && num(followersEnd) !== null
      ? (num(followersEnd) as number) - (num(followersStart) as number)
      : null;
  const previewPerHour =
    previewMinutes && previewMinutes > 0 && previewUsd !== null
      ? previewUsd / (previewMinutes / 60)
      : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* already stopped */
    }
    addRow({
      platformId: platform.id,
      date: rowDate,
      startTime: startTime || null,
      endTime: endTime || null,
      roomCount: num(roomCount),
      followersStart: num(followersStart),
      followersEnd: num(followersEnd),
      tokens: num(tokens),
      usdActual: num(usd),
      followers: previewFollowerChange,
      minutes: previewMinutes,
      tokenValueUsdAtEntry: platform.tokenValueUsd,
      note: note.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-100 grid place-items-center overflow-y-auto bg-console/80 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="my-auto w-full max-w-md rounded-xl border border-border bg-panel shadow-panel-lift"
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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-micro" htmlFor="row-start">
                Start time
              </label>
              <input
                id="row-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={field}
              />
            </div>
            <div>
              <label className="label-micro" htmlFor="row-end">
                End time
              </label>
              <input
                id="row-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={field}
              />
            </div>
            <div>
              <label className="label-micro" htmlFor="row-rooms">
                Room count
              </label>
              <input
                id="row-rooms"
                inputMode="numeric"
                value={roomCount}
                onChange={(e) => setRoomCount(e.target.value)}
                placeholder="0"
                className={field}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-micro" htmlFor="row-fol-start">
                Followers at start
              </label>
              <input
                id="row-fol-start"
                inputMode="numeric"
                value={followersStart}
                onChange={(e) => setFollowersStart(e.target.value)}
                placeholder="0"
                className={field}
              />
            </div>
            <div>
              <label className="label-micro" htmlFor="row-fol-end">
                Followers at end
              </label>
              <input
                id="row-fol-end"
                inputMode="numeric"
                value={followersEnd}
                onChange={(e) => setFollowersEnd(e.target.value)}
                placeholder="0"
                className={field}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-micro" htmlFor="row-tokens">
                Tokens
              </label>
              <input
                id="row-tokens"
                inputMode="numeric"
                value={tokens}
                onChange={(e) => setTokens(e.target.value)}
                placeholder="leave blank if n/a"
                className={`${field} text-token`}
              />
            </div>
            <div>
              <label className="label-micro" htmlFor="row-usd">
                USD earned
              </label>
              <input
                id="row-usd"
                inputMode="decimal"
                value={usd}
                onChange={(e) => setUsd(e.target.value)}
                placeholder="leave blank if n/a"
                className={field}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="label-micro" htmlFor="row-note">
                Notes
              </label>
              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  aria-label={listening ? "Stop dictation" : "Dictate notes"}
                  className={`flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                    listening ? "border-token/40 text-token" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {listening ? <MicOff className="size-3" /> : <Mic className="size-3" />}
                  {listening ? "Listening" : "Dictate"}
                </button>
              )}
            </div>
            <textarea
              id="row-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Session notes, source of these figures"
              className={`${field} font-sans resize-y`}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-md border border-border bg-console/60 p-2 text-center">
            <div>
              <p className="label-micro">Duration</p>
              <p className="numeric text-xs">
                {previewMinutes === null ? "—" : fmtHours(previewMinutes)}
              </p>
            </div>
            <div>
              <p className="label-micro">Follower change</p>
              <p className="numeric text-xs">
                {previewFollowerChange === null
                  ? "—"
                  : `${previewFollowerChange >= 0 ? "+" : ""}${previewFollowerChange}`}
              </p>
            </div>
            <div>
              <p className="label-micro">Per hour</p>
              <p className="numeric text-xs">
                {previewPerHour === null ? "—" : fmtUsd(previewPerHour)}
              </p>
            </div>
          </div>

          <p className="rounded-md border border-border bg-console/60 p-2 text-[11px] text-muted-foreground">
            Record only what the platform actually reported. Tokens or USD may be left blank — no
            conversion rate is invented. Derived figures are always recalculated from these
            originals.
          </p>
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
