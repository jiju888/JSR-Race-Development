"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Flag,
  Gauge,
  Play,
  Plus,
  Trash2,
  Crosshair,
  Activity,
} from "lucide-react";
import type { Session } from "@/lib/schema";
const seconds = (n: number) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, "0")}:${(n % 60).toFixed(1).padStart(4, "0")}`;
export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]),
    [selected, setSelected] = useState<Session | null>(null),
    [tab, setTab] = useState("Overview"),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [start, setStart] = useState(0),
    [end, setEnd] = useState(6),
    [name, setName] = useState("Corner 1"),
    [time, setTime] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  async function request(url: string, options?: RequestInit) {
    const r = await fetch(url, options);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Request failed.");
    return data;
  }
  async function refresh() {
    try {
      setSessions(await request("/api/sessions"));
    } catch (e) {
      setError(String(e));
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  function open(s: Session) {
    setSelected(s);
    setStart(s.segment?.start || 0);
    setEnd(s.segment?.end || Math.min(6, s.duration));
    setName(s.segment?.name || "Corner 1");
    setError("");
    setTab("Session");
  }
  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("Uploading and validating video…");
    setError("");
    try {
      const data = await request("/api/sessions", {
        method: "POST",
        body: new FormData(e.currentTarget),
      });
      await refresh();
      open(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy("");
    }
  }
  async function analyze() {
    if (!selected) return;
    setBusy("Extracting 6 frames and requesting AI coaching…");
    setError("");
    try {
      const s = await request(`/api/sessions/${selected.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, start, end }),
      });
      setSelected(s);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setBusy("");
    }
  }
  async function remove(s: Session) {
    if (
      !confirm(
        "Delete this video, extracted frames, and coaching report permanently?",
      )
    )
      return;
    try {
      await request(`/api/sessions/${s.id}`, { method: "DELETE" });
      if (selected?.id === s.id) {
        setSelected(null);
        setTab("Overview");
      }
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  }
  const completed = sessions.filter((s) => s.report);
  return (
    <div className="shell">
      <aside>
        <a className="brand" href="/">
          JSR<span>RACE INTELLIGENCE</span>
        </a>
        <div className="workspace">DRIVER WORKSPACE</div>
        <nav>
          {["Overview", "Analyze Session", "Progress"].map((t, i) => (
            <button
              className={tab === t ? "active" : ""}
              onClick={() => {
                setTab(t);
                setError("");
              }}
              key={t}
            >
              {i === 0 ? (
                <Gauge size={18} />
              ) : i === 1 ? (
                <Crosshair size={18} />
              ) : (
                <Activity size={18} />
              )}{" "}
              {t}
            </button>
          ))}
        </nav>
        <div className="aside-bottom">
          <span className="dot" /> LOCAL WORKSPACE
          <p>Your footage. Your development.</p>
          <small>
            Independent software.
            <br />
            No hardware affiliation.
          </small>
        </div>
      </aside>
      <main>
        <header>
          <span>
            WORKSPACE <span className="slash">/</span> {tab.toUpperCase()}
          </span>
          <span className="version">
            V0.1 <span className="dot" /> MILESTONE 01
          </span>
        </header>
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        {busy && (
          <div role="status" className="notice">
            {busy} Please keep this page open.
          </div>
        )}
        {(tab === "Overview" || tab === "Progress") && (
          <>
            <section className="hero">
              <div>
                <p className="eyebrow">THE NEXT LAP STARTS HERE</p>
                <h1>
                  {tab === "Progress" ? (
                    "Every session. A step forward."
                  ) : (
                    <>
                      Find your edge.
                      <br />
                      <span>Understand every corner.</span>
                    </>
                  )}
                </h1>
                <p className="muted">
                  Turn your simulator footage into focused, evidence-based
                  coaching.
                  <br />
                  Analyze. Understand. Improve.
                </p>
                <button
                  className="primary"
                  onClick={() => setTab("Analyze Session")}
                >
                  Analyze a session <ArrowUpRight size={17} />
                </button>
              </div>
              <div className="track-art" aria-hidden="true">
                <svg viewBox="0 0 300 240">
                  <path d="M65 190 Q20 180 50 140 L95 95 Q110 70 100 40 Q100 10 140 25 L220 65 Q250 80 220 110 L180 135 Q170 145 190 175 Q210 210 170 215 L65 190Z" />
                  <circle cx="72" cy="192" r="6" />
                </svg>
                <span>YOUR LINE. REFINED.</span>
              </div>
            </section>
            <section className="stats">
              {[
                [String(sessions.length), "RECORDED SESSIONS"],
                [String(completed.length), "AI COACHING REPORTS"],
                [
                  String(
                    sessions.reduce((n, s) => n + (s.frames?.length || 0), 0),
                  ),
                  "EVIDENCE FRAMES",
                ],
              ].map(([v, l]) => (
                <div key={l}>
                  <span>{l}</span>
                  <strong>{v.padStart(2, "0")}</strong>
                </div>
              ))}
            </section>
            <div className="section-heading">
              <h2>
                {tab === "Progress" ? "Driver journal" : "Session library"}
              </h2>
              <span>LOCAL STORAGE</span>
            </div>
            <section className="panel">
              {sessions.length === 0 ? (
                <div className="empty">
                  <Flag size={32} />
                  <h3>Your first session starts the story.</h3>
                  <p>
                    Upload a recording and select a corner to get a focused
                    coaching report.
                  </p>
                  <button
                    onClick={() => setTab("Analyze Session")}
                    className="secondary"
                  >
                    <Plus size={16} /> Add your first session
                  </button>
                </div>
              ) : (
                sessions.map((s) => (
                  <div className="session-row" key={s.id}>
                    <button onClick={() => open(s)}>
                      <span className="session-icon">
                        <Play size={18} />
                      </span>
                      <span>
                        <strong>{s.track}</strong>
                        <small>
                          {s.simulator} · {s.vehicle} ·{" "}
                          {new Date(s.createdAt).toLocaleDateString()}
                        </small>
                      </span>
                    </button>
                    <span className="muted">
                      {s.lapTime || seconds(s.duration) + " video"}
                    </span>
                    <span className={s.report ? "badge" : "badge pending"}>
                      {s.report ? "ANALYZED" : "READY TO ANALYZE"}
                    </span>
                    <button
                      aria-label={`Delete ${s.track}`}
                      onClick={() => remove(s)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </section>
            <div className="footnote">
              AI observations are interpretations of sampled video frames.
              Quantitative telemetry and progress trends are planned for a later
              milestone.
            </div>
          </>
        )}
        {tab === "Analyze Session" && (
          <>
            <p className="eyebrow">01 / BRING THE EVIDENCE</p>
            <h1>Analyze a session.</h1>
            <p className="muted">
              Start with your footage. Select a driving segment after upload.
            </p>
            <form onSubmit={upload} className="panel upload-form">
              <label className="dropzone">
                <Plus size={28} />
                <strong>Choose your gameplay recording</strong>
                <span>MP4 or MOV · Maximum 100 MB · Up to 30 minutes</span>
                <input
                  required
                  type="file"
                  name="video"
                  accept=".mp4,.mov,video/mp4,video/quicktime"
                />
              </label>
              <div className="form-grid">
                {[
                  ["simulator", "Simulator", "Assetto Corsa"],
                  ["track", "Track", "Brands Hatch"],
                  ["vehicle", "Vehicle / class", "GT3"],
                  ["lapTime", "Lap time (optional)", "1:32.450"],
                ].map(([key, label, placeholder]) => (
                  <label key={key}>
                    {label}
                    <input
                      name={key}
                      placeholder={placeholder}
                      required={key !== "lapTime"}
                      maxLength={1000}
                    />
                  </label>
                ))}
              </div>
              <label>
                Driver comments or questions (optional)
                <textarea
                  name="comments"
                  maxLength={1000}
                  placeholder="What would you like to understand about this session?"
                />
              </label>
              <p className="muted small">
                Videos stay on this server. Only six sampled frames and session
                details are sent to OpenAI when you start an analysis. API usage
                may incur charges.
              </p>
              <button disabled={!!busy} className="primary">
                Upload recording <ArrowUpRight size={17} />
              </button>
            </form>
          </>
        )}
        {tab === "Session" && selected && (
          <>
            <div className="section-heading">
              <div>
                <p className="eyebrow">SESSION ENGINEERING</p>
                <h1>{selected.track}</h1>
                <p className="muted">
                  {selected.simulator} / {selected.vehicle}{" "}
                  {selected.lapTime &&
                    `/ ${selected.lapTime} (driver reported)`}
                </p>
              </div>
              <button onClick={() => remove(selected)} className="secondary">
                <Trash2 size={16} /> Delete session
              </button>
            </div>
            <div className="review-grid">
              <section>
                <video
                  key={selected.id}
                  ref={video}
                  controls
                  preload="metadata"
                  src={`/api/sessions/${selected.id}/media`}
                  onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                />
                <div className="panel segment">
                  <div className="section-heading">
                    <h2>Select a corner</h2>
                    <span>
                      {seconds(time)} / {seconds(selected.duration)}
                    </span>
                  </div>
                  <label>
                    Segment name
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={80}
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      Start (seconds)
                      <input
                        type="number"
                        min={0}
                        max={selected.duration}
                        step="0.1"
                        value={start}
                        onChange={(e) => setStart(Number(e.target.value))}
                      />
                      <button
                        className="text-button"
                        onClick={() => setStart(Number(time.toFixed(1)))}
                      >
                        Use playhead
                      </button>
                    </label>
                    <label>
                      End (seconds)
                      <input
                        type="number"
                        min={0}
                        max={selected.duration}
                        step="0.1"
                        value={end}
                        onChange={(e) => setEnd(Number(e.target.value))}
                      />
                      <button
                        className="text-button"
                        onClick={() => setEnd(Number(time.toFixed(1)))}
                      >
                        Use playhead
                      </button>
                    </label>
                  </div>
                  <p className="small muted">
                    Select up to 30 seconds. Analysis samples six still frames;
                    it cannot measure precise inputs or braking distances.
                  </p>
                  <button
                    className="primary"
                    disabled={
                      !!busy ||
                      end <= start ||
                      end - start > 30 ||
                      end > selected.duration ||
                      start < 0
                    }
                    onClick={analyze}
                  >
                    {selected.report
                      ? "Reanalyze segment"
                      : "Generate AI coaching"}{" "}
                    <ArrowUpRight size={17} />
                  </button>
                </div>
              </section>
              <section className="panel report">
                <p className="eyebrow">YOUR VIRTUAL RACE ENGINEER</p>
                <h2>Coaching report</h2>
                {!selected.report ? (
                  <div className="empty">
                    <Crosshair size={30} />
                    <h3>Evidence before advice.</h3>
                    <p>
                      Select a segment and generate an analysis. Your report
                      will appear here.
                    </p>
                    <small>An OpenAI API key is required on the server.</small>
                  </div>
                ) : (
                  <>
                    <span className="badge">
                      AI GENERATED · {selected.segment?.name}
                    </span>
                    <p>{selected.report.summary}</p>
                    {[
                      ["Strengths", selected.report.strengths],
                      ["Areas for improvement", selected.report.improvements],
                      ["Next session plan", selected.report.nextSessionPlan],
                      ["Limitations", selected.report.limitations],
                    ].map(([title, items]) => (
                      <div key={String(title)}>
                        <h3>{title as string}</h3>
                        <ul>
                          {(items as string[]).map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {selected.report.corners.map((c, i) => (
                      <article className="corner" key={i}>
                        <div className="section-heading">
                          <h3>{c.name}</h3>
                          <span className="badge">
                            {c.confidence} confidence
                          </span>
                        </div>
                        <p>{c.observation}</p>
                        <p>
                          <b>Evidence:</b> {c.evidence}
                        </p>
                        <p>
                          <b>Possible explanation:</b> {c.explanation}
                        </p>
                        <p>
                          <b>Try next:</b> {c.suggestion}
                        </p>
                      </article>
                    ))}
                  </>
                )}
              </section>
            </div>
            {!!selected.frames?.length && (
              <>
                <div className="section-heading">
                  <h2>Supporting frames</h2>
                  <span>CLICK TO SEEK VIDEO</span>
                </div>
                <div className="frames">
                  {selected.frames.map((f) => (
                    <button
                      key={f.name}
                      onClick={() => {
                        if (video.current) video.current.currentTime = f.time;
                      }}
                    >
                      <img
                        alt={`Gameplay at ${seconds(f.time)}`}
                        src={`/api/sessions/${selected.id}/media?frame=${f.name}`}
                      />
                      <span>{seconds(f.time)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        <footer>
          JSR RACE INTELLIGENCE <span>Analyze. Understand. Improve.</span>
        </footer>
      </main>
    </div>
  );
}
