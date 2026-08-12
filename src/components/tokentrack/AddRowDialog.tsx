import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, X } from "lucide-react";
import { durationMinutes, fmtHours, fmtUsd, timeOfDayFrom, useTokenTrack } from "@/lib/tokentrack/store";
import type { Platform } from "@/lib/tokentrack/types";

interface Props {
  platform: Platform;
  date: string;
  onClose: () => void;
}


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
  const previewTimeOfDay = timeOfDayFrom(startTime || null);
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
      timeOfDay: previewTimeOfDay,
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

  const compactField =
    "w-full rounded-md border border-input bg-console px-2 py-1 text-xs numeric outline-none focus:border-ring h-8";

  const textAreaField =
    "w-full rounded-md border border-input bg-console px-2 py-1 text-xs outline-none focus:border-ring h-8 min-h-[32px] resize-y font-sans";

  return (
    <div className="fixed inset-0 z-100 grid place-items-center overflow-hidden bg-console/80 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-[980px] rounded-xl border border-border bg-panel shadow-panel-lift"
      >
        <header className="flex items-center justify-between border-b border-border bg-panel-header px-3 py-2">
          <div>
            <p className="label-micro">New row for</p>
            <h2 className="text-sm font-semibold">{platform.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cancel"
              className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="p-3">
          <div className="grid grid-cols-3 gap-2">
            {/* Row 1 */}
            <div>
              <label className="label-micro" htmlFor="row-date">
                Date
              </label>
              <input
                id="row-date"
                type="date"
                value={rowDate}
                onChange={(e) => setRowDate(e.target.value)}
                className={compactField}
              />
            </div>

            <div>
              <label className="label-micro" htmlFor="row-start">
                Start time
              </label>
              <input
                id="row-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={compactField}
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
                className={compactField}
              />
            </div>

            {/* Row 2 */}
            <div>
              <label className="label-micro" htmlFor="row-fol-start">
                Followers at Start
              </label>
              <input
                id="row-fol-start"
                inputMode="numeric"
                value={followersStart}
                onChange={(e) => setFollowersStart(e.target.value)}
                placeholder="0"
                className={compactField}
              />
            </div>

            <div>
              <label className="label-micro" htmlFor="row-fol-end">
                Followers at End
              </label>
              <input
                id="row-fol-end"
                inputMode="numeric"
                value={followersEnd}
                onChange={(e) => setFollowersEnd(e.target.value)}
                placeholder="0"
                className={compactField}
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
                className={compactField}
              />
            </div>

            {/* Row 3 */}
            <div>
              <label className="label-micro" htmlFor="row-tokens">
                Tokens
              </label>
              <input
                id="row-tokens"
                inputMode="numeric"
                value={tokens}
                onChange={(e) => setTokens(e.target.value)}
                placeholder="n/a"
                className={`${compactField} text-token`}
              />
            </div>

            <div>
              <label className="label-micro" htmlFor="row-usd">
                USD Earned
              </label>
              <input
                id="row-usd"
                inputMode="decimal"
                value={usd}
                onChange={(e) => setUsd(e.target.value)}
                placeholder="n/a"
                className={compactField}
              />
            </div>

            <div>
              <label className="label-micro" htmlFor="row-tod">
                Time of Day
              </label>
              <input
                id="row-tod"
                readOnly
                tabIndex={-1}
                value={previewTimeOfDay ?? "—"}
                aria-label="Time of day, derived from start time"
                className={`${compactField} text-muted-foreground`}
              />
            </div>

            {/* Notes spans full width */}
            <div className="col-span-3">
              <div className="flex items-center justify-between">
                <label className="label-micro" htmlFor="row-note">
                  Notes
                </label>
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    aria-label={listening ? "Stop dictation" : "Dictate notes"}
                    className={`rounded border border-border px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      listening ? "border-token/40 text-token" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {listening ? <MicOff className="size-3" /> : <Mic className="size-3" />}
                  </button>
                )}
              </div>
              <textarea
                id="row-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={1}
                placeholder="Notes"
                className={textAreaField}
              />
            </div>

            {/* Row 4 — save */}
            <div className="col-span-3 flex justify-end">
              <button
                type="submit"
                className="h-8 rounded-md bg-primary px-6 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90"
              >
                Save Row
              </button>
            </div>
          </div>


          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-console/60 px-3 py-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="label-micro">Duration</span>
              <span className="numeric">
                {previewMinutes === null ? "—" : fmtHours(previewMinutes)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="label-micro">Follower change</span>
              <span className="numeric">
                {previewFollowerChange === null
                  ? "—"
                  : `${previewFollowerChange >= 0 ? "+" : ""}${previewFollowerChange}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="label-micro">Per hour</span>
              <span className="numeric">
                {previewPerHour === null ? "—" : fmtUsd(previewPerHour)}
              </span>
            </div>
          </div>

          <p className="mt-2 rounded-md border border-border bg-console/60 px-3 py-1.5 text-[11px] text-muted-foreground">
            Record only what the platform actually reported. Tokens or USD may be left blank — no
            conversion rate is invented. Derived figures are always recalculated from these
            originals.
          </p>
        </div>
      </form>
    </div>
  );
}
