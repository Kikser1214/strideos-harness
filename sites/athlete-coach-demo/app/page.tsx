"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";

type View = "today" | "plan" | "coach" | "onboarding";
type Role = "athlete" | "coach";
type PlanScope = "week" | "block" | "history";

type Session = {
  day: string;
  date: string;
  type: string;
  title: string;
  meta: string;
  tone: string;
};

type Note = { author: string; time: string; text: string; role: Role };
type Decision = "pending" | "approved" | "declined";
type SharedReviewProps = {
  role: Role;
  notes: Note[];
  draft: string;
  setDraft: Dispatch<SetStateAction<string>>;
  addNote: () => void;
  decision: Decision;
  setDecision: Dispatch<SetStateAction<Decision>>;
};

const week: Session[] = [
  { day: "MON", date: "20", type: "Recovery", title: "Rest + mobility", meta: "20 min · optional", tone: "rest" },
  { day: "TUE", date: "21", type: "Threshold", title: "4 × 2 km controlled", meta: "14 km · 4:10–4:15/km", tone: "quality" },
  { day: "WED", date: "22", type: "Easy + strength", title: "Aerobic maintenance", meta: "10 km easy · 35 min strength", tone: "easy" },
  { day: "THU", date: "23", type: "Easy + strides", title: "Relaxed mechanics", meta: "12 km · 6 × 20 sec strides", tone: "easy" },
  { day: "FRI", date: "24", type: "Strength", title: "Technique + durability", meta: "40 min · no run", tone: "strength" },
  { day: "SAT", date: "25", type: "Marathon specific", title: "Steady progression", meta: "16 km · final 8 km @ 4:35–4:40", tone: "quality" },
  { day: "SUN", date: "26", type: "Long run", title: "Aerobic durability", meta: "24 km · 5:05–5:25/km", tone: "long" },
];

const sessionDetails: Record<string, {
  purpose: string;
  structure: string[];
  targets: string[];
  notes: string;
}> = {
  "Rest + mobility": {
    purpose: "Absorb the previous week before Tuesday's threshold work.",
    structure: ["No running required", "10 min hip and ankle mobility", "2 × 45 sec relaxed calf isometrics"],
    targets: ["RPE 1–2", "Pain no higher than baseline", "Finish fresher than you started"],
    notes: "Skip the mobility if it feels like another task. Recovery is the session.",
  },
  "4 × 2 km controlled": {
    purpose: "Raise sustainable speed without turning the session into a race.",
    structure: ["3 km easy + drills", "4 × 2 km at 4:10–4:15/km", "2 min easy jog recovery", "2 km easy cooldown"],
    targets: ["RPE 7/10", "HR settles below threshold early", "Final rep matches the first"],
    notes: "If calf discomfort reaches 3/10 or changes your stride, stop the repetitions and jog home.",
  },
  "Aerobic maintenance": {
    purpose: "Keep frequency and mechanics while restoring from threshold work.",
    structure: ["10 km conversational running", "35 min strength later in the day", "Soleus, split squat, hinge, trunk"],
    targets: ["Run at 5:15–5:40/km", "RPE 3/10", "Leave 3 reps in reserve in the gym"],
    notes: "Strength quality matters more than load. Do not chase soreness.",
  },
  "Relaxed mechanics": {
    purpose: "Rehearse quick, relaxed mechanics without adding metabolic cost.",
    structure: ["10 km easy", "6 × 20 sec relaxed strides", "60–80 sec walk or jog between strides"],
    targets: ["Easy running fully conversational", "Strides fast but smooth", "No straining"],
    notes: "Use flat ground. These are not sprints and there is no pace target.",
  },
  "Technique + durability": {
    purpose: "Build calf, hip and trunk capacity that supports the running block.",
    structure: ["Soleus raise 3 × 10", "Rear-foot elevated split squat 3 × 6", "Romanian deadlift 3 × 6", "Side plank 3 × 30 sec"],
    targets: ["RPE 6/10", "Controlled tempo", "2–3 reps in reserve"],
    notes: "Reduce load if technique changes. This session supports Sunday; it should not compromise it.",
  },
  "Steady progression": {
    purpose: "Introduce marathon-specific rhythm on controlled legs.",
    structure: ["8 km easy", "8 km at 4:35–4:40/km", "Optional 5 min walk after"],
    targets: ["RPE 6/10", "No pace chasing uphill", "Fuel once before the faster section"],
    notes: "The approved coach revision shortens the faster segment to 6 km when calf risk remains elevated.",
  },
  "Aerobic durability": {
    purpose: "Extend comfortable time on feet without borrowing from next week.",
    structure: ["24 km continuous easy", "Water every 20–25 min", "40–50 g carbohydrate per hour"],
    targets: ["5:05–5:25/km by feel", "RPE 4/10 through 18 km", "No fast finish"],
    notes: "Long-run pace is durability-led. It is not inferred from Tuesday's interval speed.",
  },
};

const blockWeeks = [
  { label: "Week 1", dates: "Jul 20–26", theme: "Establish the rhythm", volume: "66 km", status: "Current", days: ["Rest + mobility", "4 × 2 km threshold", "10 km easy + strength", "12 km easy + strides", "Strength", "16 km progression", "24 km long run"] },
  { label: "Week 2", dates: "Jul 27–Aug 2", theme: "Extend controlled work", volume: "70 km", status: "Planned", days: ["8 km recovery", "5 × 2 km threshold", "11 km easy + strength", "13 km easy + strides", "Rest", "12 km aerobic", "26 km long run"] },
  { label: "Week 3", dates: "Aug 3–9", theme: "Peak specificity", volume: "74 km", status: "Planned", days: ["Rest + mobility", "3 × 3 km threshold", "12 km easy + strength", "13 km easy + strides", "Strength", "18 km with 10 km steady", "28 km long run"] },
  { label: "Week 4", dates: "Aug 10–16", theme: "Unload and absorb", volume: "54 km", status: "Provisional", days: ["Rest", "6 × 1 km controlled", "9 km easy + light strength", "10 km easy + strides", "Rest", "10 km aerobic", "19 km relaxed long run"] },
];

const history = [
  { date: "JUL 18", title: "Aerobic long run", type: "Long run", distance: "22.4 km", duration: "1:55:42", pace: "5:10/km", hr: "143 bpm", rpe: "5/10", status: "Completed", execution: "Even effort with a small HR rise after 18 km. Calf tightness appeared late but did not change mechanics.", splits: ["First 8 km · 5:16/km", "Middle 8 km · 5:09/km", "Final 6.4 km · 5:04/km"] },
  { date: "JUL 16", title: "Easy + strides", type: "Easy", distance: "11.8 km", duration: "1:00:31", pace: "5:08/km", hr: "136 bpm", rpe: "3/10", status: "Completed", execution: "Comfortable throughout. Six strides stayed relaxed and symmetrical.", splits: ["Easy run · 56:20", "6 × 20 sec strides", "Pain · 0/10"] },
  { date: "JUL 14", title: "Cruise intervals", type: "Threshold", distance: "13.9 km", duration: "1:06:18", pace: "4:46/km", hr: "151 bpm", rpe: "7/10", status: "Completed", execution: "All four repetitions landed inside the target range. The final rep was fastest without an HR spike.", splits: ["2 km · 4:16/km", "2 km · 4:14/km", "2 km · 4:13/km", "2 km · 4:11/km"] },
  { date: "JUL 12", title: "Steady aerobic", type: "Aerobic", distance: "15.2 km", duration: "1:15:44", pace: "4:59/km", hr: "141 bpm", rpe: "4/10", status: "Completed", execution: "Good aerobic control on rolling terrain. No residual fatigue the following morning.", splits: ["First half · 5:04/km", "Second half · 4:54/km", "Elevation · 142 m"] },
  { date: "JUL 11", title: "Strength durability", type: "Strength", distance: "—", duration: "38 min", pace: "—", hr: "—", rpe: "6/10", status: "Completed", execution: "Technique remained stable. Left soleus was slightly weaker in the final set.", splits: ["Soleus raise · 3 × 10", "Split squat · 3 × 6", "RDL · 3 × 6"] },
];

const onboardingSections = [
  ["Goal & experience", "4 years consistent · marathon PB 3:20 · improve sustainably toward the next performance level"],
  ["Current training", "6 days · 58–72 km in the last 6 weeks · one quality session + long run"],
  ["Health & recovery", "No current injury · previous mild calf tightness · sleep 7–8 h · moderate work stress"],
  ["Data connection", "Garmin primary · manual RPE and pain check-in after every key session"],
  ["Strength", "1 inconsistent session/week · gym access · wants two short, technique-first sessions"],
  ["Nutrition", "Loose guidance · no calorie target · protein and carbohydrate timing only"],
  ["Coaching style", "StrideOS recommends the method · explain the why · athlete approves every plan change"],
  ["Sharing", "Private Sites dashboard · invite one human coach · comments allowed, plan approval reserved for athlete"],
];

export default function Home() {
  const [view, setView] = useState<View>("today");
  const [role, setRole] = useState<Role>("athlete");
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState<Note[]>([
    { author: "Milan · athlete", time: "18 min ago", text: "The 24 km Sunday feels ambitious after last week's calf tightness. I can do it, but I would rather finish the week healthy.", role: "athlete" },
    { author: "Coach Elena", time: "7 min ago", text: "Agree. Keep the stimulus, reduce the cost: 21 km total and only 6 km at marathon effort on Saturday. Reassess after Tuesday's threshold.", role: "coach" },
  ]);
  const [decision, setDecision] = useState<Decision>("pending");

  const activeWeek = useMemo(() => {
    if (decision !== "approved") return week;
    return week.map((item) => {
      if (item.day === "SAT") return { ...item, meta: "15 km · final 6 km @ 4:35–4:40" };
      if (item.day === "SUN") return { ...item, meta: "21 km · 5:05–5:25/km" };
      return item;
    });
  }, [decision]);

  function addNote() {
    const text = draft.trim();
    if (!text) return;
    setNotes((current) => [
      ...current,
      {
        author: role === "athlete" ? "Milan · athlete" : "Coach Elena",
        time: "now",
        text,
        role,
      },
    ]);
    setDraft("");
  }

  return (
    <main className="shell">
      <aside className="rail">
        <button className="brand" onClick={() => setView("today")} aria-label="StrideOS home">
          <span className="brand-mark">S</span>
          <span>StrideOS</span>
        </button>

        <nav className="primary-nav" aria-label="Main navigation">
          <NavButton active={view === "today"} label="Today" glyph="01" onClick={() => setView("today")} />
          <NavButton active={view === "plan"} label="Training plan" glyph="02" onClick={() => setView("plan")} />
          <NavButton active={view === "coach"} label="Coach room" glyph="03" badge="2" onClick={() => setView("coach")} />
          <NavButton active={view === "onboarding"} label="Onboarding replay" glyph="04" onClick={() => setView("onboarding")} />
        </nav>

        <div className="rail-spacer" />
        <div className="source-card">
          <div className="source-row"><span className="status-dot" /> Garmin synced</div>
          <p>Last activity · 2h ago</p>
          <p>Manual check-in · today</p>
        </div>
        <div className="profile-mini">
          <div className="avatar">MK</div>
          <div><strong>Milan K.</strong><span>Mock athlete</span></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">S</span> StrideOS</div>
          <div className="mock-label"><span /> SYNTHETIC DEMO · NO PERSONAL DATA</div>
          <div className="role-switch" aria-label="Preview role">
            <button className={role === "athlete" ? "selected" : ""} onClick={() => setRole("athlete")}>Athlete</button>
            <button className={role === "coach" ? "selected" : ""} onClick={() => setRole("coach")}>Coach view</button>
          </div>
        </header>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <button className={view === "today" ? "active" : ""} onClick={() => setView("today")}><span>01</span>Today</button>
          <button className={view === "plan" ? "active" : ""} onClick={() => setView("plan")}><span>02</span>Plan</button>
          <button className={view === "coach" ? "active" : ""} onClick={() => setView("coach")}><span>03</span>Coach</button>
          <button className={view === "onboarding" ? "active" : ""} onClick={() => setView("onboarding")}><span>04</span>Onboarding</button>
        </nav>

        {view === "today" && <TodayView role={role} notes={notes} draft={draft} setDraft={setDraft} addNote={addNote} decision={decision} setDecision={setDecision} />}
        {view === "plan" && <PlanView week={activeWeek} decision={decision} />}
        {view === "coach" && <CoachView role={role} notes={notes} draft={draft} setDraft={setDraft} addNote={addNote} decision={decision} setDecision={setDecision} />}
        {view === "onboarding" && <OnboardingView />}
      </section>
    </main>
  );
}

function NavButton({ active, label, glyph, badge, onClick }: { active: boolean; label: string; glyph: string; badge?: string; onClick: () => void }) {
  return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}><span>{glyph}</span><strong>{label}</strong>{badge && <em>{badge}</em>}</button>;
}

function PageIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div className="page-intro"><p>{eyebrow}</p><h1>{title}</h1><span>{copy}</span></div>;
}

function TodayView({ role, notes, draft, setDraft, addNote, decision, setDecision }: SharedReviewProps) {
  return (
    <div className="content">
      <PageIntro eyebrow="MONDAY · JULY 20" title="Good morning, Milan." copy="You are in week 1 of a four-week progression block. Nothing is auto-changed; you remain in control." />

      <div className="evidence-strip">
        <Metric label="Current block" value="Marathon progression" meta="Week 1 of 4" />
        <Metric label="Recent volume" value="64 km / week" meta="6-week median · Garmin" />
        <Metric label="Marathon best" value="3:20:00" meta="4:44/km · athlete confirmed" />
        <Metric label="Evidence status" value="Good coverage" meta="Garmin + RPE · no score" />
      </div>

      <div className="today-grid">
        <article className="hero-session">
          <div className="card-kicker"><span className="pill rest">RECOVERY</span><span>Today</span></div>
          <h2>Rest + mobility</h2>
          <p className="session-lead">Protect Tuesday’s threshold session. Twenty minutes of easy mobility is optional; extra mileage is not needed.</p>
          <div className="session-specs">
            <div><span>Duration</span><strong>20 min</strong></div>
            <div><span>Intensity</span><strong>Very easy</strong></div>
            <div><span>Purpose</span><strong>Absorb load</strong></div>
          </div>
          <div className="coach-why"><span>COACH WHY</span><p>Your last six weeks support more specificity, but not more density. The plan adds quality while keeping two low-cost days around it.</p></div>
        </article>

        <aside className="checkin-card">
          <div className="card-heading"><div><p>Morning check-in</p><h3>How are you arriving?</h3></div><span className="status-badge">Saved</span></div>
          <div className="checkin-row"><span>Sleep</span><strong>7h 32m</strong><em>Garmin · today</em></div>
          <div className="checkin-row"><span>Energy</span><strong>7 / 10</strong><em>Athlete · today</em></div>
          <div className="checkin-row"><span>Pain</span><strong>1 / 10</strong><em>Calf · athlete</em></div>
          <div className="checkin-row"><span>Stress</span><strong>Moderate</strong><em>Athlete · today</em></div>
          <button className="quiet-button">Update check-in</button>
        </aside>
      </div>

      <section className="shared-review">
        <div className="section-heading"><div><p>SHARED REVIEW</p><h2>One concern, one precise proposal</h2></div><button className="text-button">Open coach room →</button></div>
        <div className="review-grid">
          <div className="thread-preview">
            {notes.slice(-2).map((note, index) => <Comment key={`${note.author}-${index}`} note={note} />)}
            <Composer role={role} draft={draft} setDraft={setDraft} addNote={addNote} compact />
          </div>
          <DecisionCard role={role} decision={decision} setDecision={setDecision} />
        </div>
      </section>
    </div>
  );
}

function PlanView({ week, decision }: { week: Session[]; decision: string }) {
  const [scope, setScope] = useState<PlanScope>("week");
  const [selectedSession, setSelectedSession] = useState(week[1].title);
  const [selectedHistory, setSelectedHistory] = useState(0);
  const detail = sessionDetails[selectedSession] ?? sessionDetails["Aerobic durability"];
  const completed = history[selectedHistory];

  return (
    <div className="content">
      <PageIntro eyebrow="TRAINING PLAN · FOUR-WEEK BLOCK" title="Past work, this week, and what comes next." copy="Open any session for its structure, targets, rationale and safety boundary. Look beyond this week without pretending the future is fixed." />
      <div className="plan-tabs" role="tablist" aria-label="Training plan range">
        <button className={scope === "week" ? "active" : ""} onClick={() => setScope("week")}>This week <span>7 sessions</span></button>
        <button className={scope === "block" ? "active" : ""} onClick={() => setScope("block")}>Full block <span>4 weeks</span></button>
        <button className={scope === "history" ? "active" : ""} onClick={() => setScope("history")}>Training history <span>Completed</span></button>
      </div>
      <div className="plan-summary">
        <Metric label="Running" value={decision === "approved" ? "62 km" : "66 km"} meta="5 sessions" />
        <Metric label="Strength" value="2 sessions" meta="75 min total" />
        <Metric label="Quality" value="2 exposures" meta="Separated by 3 days" />
        <Metric label="Long run" value={decision === "approved" ? "21 km" : "24 km"} meta={decision === "approved" ? "Approved revision" : "Revision proposed"} />
      </div>

      {scope === "week" && <div className="plan-detail-layout">
        <section className="week-list">
          {week.map((item) => <button className={`day-row ${selectedSession === item.title ? "selected" : ""}`} key={item.day} onClick={() => setSelectedSession(item.title)}><div className="date-box"><span>{item.day}</span><strong>{item.date}</strong></div><span className={`tone-dot ${item.tone}`} /><div className="day-main"><p>{item.type}</p><h3>{item.title}</h3></div><div className="day-meta">{item.meta}</div><span className="open-arrow" aria-hidden="true">→</span></button>)}
        </section>
        <SessionDetail title={selectedSession} detail={detail} />
      </div>}

      {scope === "block" && <section className="block-grid">
        {blockWeeks.map((block, index) => <article className={`block-card ${index === 0 ? "current" : ""}`} key={block.label}>
          <div className="block-top"><div><span>{block.label} · {block.dates}</span><h3>{block.theme}</h3></div><em>{block.status}</em></div>
          <div className="block-volume"><strong>{block.volume}</strong><span>planned running</span></div>
          <ol>{block.days.map((day, dayIndex) => <li key={day}><span>{["M","T","W","T","F","S","S"][dayIndex]}</span><p>{day}</p><button onClick={() => { setScope("week"); setSelectedSession(day.includes("threshold") ? "4 × 2 km controlled" : day.includes("long run") ? "Aerobic durability" : day.includes("strength") || day === "Strength" ? "Technique + durability" : "Aerobic maintenance"); }} aria-label={`Open ${day}`}>→</button></li>)}</ol>
          <p className="block-note">{index === 3 ? "Provisional until the week-three review." : index === 0 ? "Current week. One coach revision is awaiting athlete approval." : "Future load adapts after each weekly review."}</p>
        </article>)}
      </section>}

      {scope === "history" && <div className="history-layout">
        <section className="history-list">
          <div className="history-heading"><span>LAST 30 DAYS</span><strong>5 representative sessions</strong></div>
          {history.map((item, index) => <button className={`history-row ${selectedHistory === index ? "selected" : ""}`} key={`${item.date}-${item.title}`} onClick={() => setSelectedHistory(index)}><span className="history-date">{item.date}</span><div><small>{item.type}</small><strong>{item.title}</strong></div><p>{item.distance}</p><p>{item.duration}</p><em>{item.status}</em></button>)}
        </section>
        <article className="history-detail">
          <div className="detail-kicker"><span>COMPLETED SESSION</span><em>Garmin + athlete RPE</em></div>
          <h2>{completed.title}</h2>
          <p className="history-execution">{completed.execution}</p>
          <div className="history-metrics"><Metric label="Distance" value={completed.distance} meta="Recorded" /><Metric label="Duration" value={completed.duration} meta="Elapsed" /><Metric label="Average pace" value={completed.pace} meta="By terrain" /><Metric label="Average HR" value={completed.hr} meta="Garmin" /><Metric label="RPE" value={completed.rpe} meta="Athlete" /></div>
          <div className="split-list"><span>SESSION DETAIL</span>{completed.splits.map((split, index) => <div key={split}><b>{String(index + 1).padStart(2,"0")}</b><p>{split}</p></div>)}</div>
          <div className="agent-read"><span>STRIDEOS READ</span><p>Execution matched the session’s purpose. Keep this evidence in the model; do not use one good day to raise the whole pace ladder.</p></div>
        </article>
      </div>}

      <div className="plan-principles"><div><span>01</span><h3>One central pace model</h3><p>Quality paces scale with repetition length. Long-run pace remains durability-led, not inferred from interval speed.</p></div><div><span>02</span><h3>Strength is part of the plan</h3><p>Two technique-first sessions target calf, soleus, hip and trunk durability without stealing from key runs.</p></div><div><span>03</span><h3>The future stays provisional</h3><p>Later weeks remain visible, but the next load is confirmed only after completed work, recovery, pain and schedule adherence are reviewed.</p></div></div>
    </div>
  );
}

function SessionDetail({ title, detail }: { title: string; detail: (typeof sessionDetails)[string] }) {
  return <aside className="session-detail">
    <div className="detail-kicker"><span>SESSION DETAILS</span><em>Planned · editable by proposal</em></div>
    <h2>{title}</h2>
    <p className="detail-purpose">{detail.purpose}</p>
    <div className="detail-group"><span>STRUCTURE</span>{detail.structure.map((line, index) => <div key={line}><b>{String(index + 1).padStart(2, "0")}</b><p>{line}</p></div>)}</div>
    <div className="target-grid">{detail.targets.map((target) => <span key={target}>{target}</span>)}</div>
    <div className="safety-note"><strong>COACHING NOTE</strong><p>{detail.notes}</p></div>
    <button className="annotate-button">Annotate this session</button>
  </aside>;
}

function CoachView({ role, notes, draft, setDraft, addNote, decision, setDecision }: SharedReviewProps) {
  const [inviteState, setInviteState] = useState<"idle" | "ready">("idle");
  return (
    <div className="content">
      <PageIntro eyebrow="COACH ROOM · SHARED PRIVATELY" title="One plan. Two perspectives. Athlete in control." copy="Comments are attached to an exact workout snapshot. Feedback can trigger a proposal, never a silent change." />
      <div className="coach-layout">
        <section className="comment-panel">
          <div className="card-heading"><div><p>Sunday · long run</p><h3>24 km aerobic durability</h3></div><span className="status-badge warning">Review open</span></div>
          <div className="comment-stack">{notes.map((note, index) => <Comment key={`${note.author}-${index}`} note={note} />)}</div>
          <Composer role={role} draft={draft} setDraft={setDraft} addNote={addNote} />
        </section>
        <aside className="decision-panel">
          <div className="invite-card">
            <div><p>TRAINING CIRCLE</p><h3>Invite a coach or experienced friend.</h3></div>
            <div className="member-stack"><span>MK</span><span>CE</span><button onClick={() => setInviteState("ready")} aria-label="Invite another reviewer">+</button></div>
            {inviteState === "ready" ? <div className="invite-ready"><strong>Invite link ready</strong><span>Reviewer access · comments and proposals only</span></div> : <button className="invite-button" onClick={() => setInviteState("ready")}>Create private invite</button>}
          </div>
          <DecisionCard role={role} decision={decision} setDecision={setDecision} />
          <div className="permission-card"><p>PERMISSIONS</p><h3>{role === "athlete" ? "You decide what changes." : "You can advise, not activate."}</h3><ul><li>Invite a real coach or experienced friend</li><li>Reviewers annotate exact sessions</li><li>Agent converts feedback into a visible proposal</li><li>Only athlete can approve the plan</li><li>Device writes need separate approval</li></ul></div>
        </aside>
      </div>
    </div>
  );
}

function OnboardingView() {
  const [step, setStep] = useState(0);
  const current = onboardingSections[step];
  return (
    <div className="content onboarding-content">
      <PageIntro eyebrow="FIRST RUN · CHATGPT WORK" title="A conversation first. A dashboard after." copy="The runner never configures a server. StrideOS asks one plain-language section at a time, explains why it matters and saves a resumable draft." />
      <div className="onboarding-layout">
        <aside className="steps-list">
          {onboardingSections.map((item, index) => <button className={step === index ? "active" : ""} key={item[0]} onClick={() => setStep(index)}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item[0]}</strong><em>{index <= step ? "Captured" : "Next"}</em></div></button>)}
        </aside>
        <section className="conversation-mock">
          <div className="agent-message"><span className="agent-avatar">S</span><div><p>StrideOS</p><h2>{questionForStep(step)}</h2><span>{whyForStep(step)}</span></div></div>
          <div className="athlete-answer"><p>Milan</p><span>{current[1]}</span></div>
          <div className="captured-card"><span>CAPTURED</span><p>{current[1]}</p><em>Editable later · source: athlete answer</em></div>
          <div className="onboarding-actions"><button disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>← Back</button><span>{step + 1} of {onboardingSections.length}</span><button onClick={() => setStep((value) => Math.min(onboardingSections.length - 1, value + 1))}>{step === onboardingSections.length - 1 ? "Create athlete map" : "Next section →"}</button></div>
        </section>
      </div>
      <section className="flow-band"><span>GitHub / plugin</span><b>→</b><span>Work conversation</span><b>→</b><span>Athlete map</span><b>→</b><span>Plan proposal</span><b>→</b><span>Private Site</span><b>→</b><span>Shared coach loop</span></section>
    </div>
  );
}

function questionForStep(step: number) {
  return [
    "What are you training for, and what would meaningful progress look like to you?",
    "Walk me through a normal training week and what the last six weeks actually looked like.",
    "Any current pain, recent injury, medical restriction, or recovery issue I must respect?",
    "Where does your training data live today—Garmin, Apple Watch, another source, or manual notes?",
    "What strength work have you done, what equipment do you have, and how confident is your technique?",
    "Would you like loose fuel guidance, detailed tracking, or no nutrition coaching for now?",
    "Do you want me to recommend the training approach, or is there a method you want researched for you?",
    "Would a private dashboard help, and do you want to invite a human coach to review and comment?",
  ][step];
}

function whyForStep(step: number) {
  return [
    "A PB is context, not the whole goal. I also need to know the cost you are willing to carry.",
    "Recent consistency is more useful than one best race when setting the starting load.",
    "Pain and medical constraints override performance goals. Prescription pauses when review is needed.",
    "Every signal stays labeled by source and freshness; missing wearable data lowers confidence, not access.",
    "Strength is a core input, not optional decoration. Technique and recovery room set the dose.",
    "Nutrition is opt-in. Photos are estimates and nothing is logged without confirmation.",
    "A named method is researched for suitability. If you do not know, StrideOS recommends and explains.",
    "The dashboard is optional. Sharing is private, role-based, and never transfers approval authority.",
  ][step];
}

function Metric({ label, value, meta }: { label: string; value: string; meta: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><em>{meta}</em></div>;
}

function Comment({ note }: { note: Note }) {
  return <article className={`comment ${note.role}`}><div className="comment-avatar">{note.role === "coach" ? "CE" : "MK"}</div><div><p><strong>{note.author}</strong><span>{note.time}</span></p><div>{note.text}</div></div></article>;
}

function Composer({ role, draft, setDraft, addNote, compact = false }: Pick<SharedReviewProps, "role" | "draft" | "setDraft" | "addNote"> & { compact?: boolean }) {
  return <div className={`composer ${compact ? "compact" : ""}`}><label htmlFor={compact ? "quick-note" : "coach-note"}>Add as {role === "athlete" ? "athlete" : "coach"}</label><textarea id={compact ? "quick-note" : "coach-note"} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={role === "athlete" ? "How did this feel, or what does not fit?" : "Leave precise feedback on this session…"} /><button onClick={addNote}>Add comment</button></div>;
}

function DecisionCard({ role, decision, setDecision }: Pick<SharedReviewProps, "role" | "decision" | "setDecision">) {
  return <article className={`decision-card ${decision}`}><div className="decision-top"><span>AGENT PROPOSAL · REVISION 01</span><em>{decision === "pending" ? "Awaiting athlete" : decision}</em></div><h3>Reduce weekend cost, keep the stimulus.</h3><div className="diff-row"><span>Saturday</span><del>8 km @ MP</del><b>→</b><ins>6 km @ MP</ins></div><div className="diff-row"><span>Sunday</span><del>24 km</del><b>→</b><ins>21 km</ins></div><p className="decision-reason">Why: athlete-reported calf tightness + coach agreement. Tuesday remains a checkpoint. No Garmin action is included.</p>{decision === "pending" && role === "athlete" ? <div className="decision-actions"><button className="approve" onClick={() => setDecision("approved")}>Approve plan change</button><button onClick={() => setDecision("declined")}>Keep original</button></div> : decision === "pending" ? <div className="coach-lock">Coach feedback recorded · athlete approval required</div> : <button className="reset-decision" onClick={() => setDecision("pending")}>Reset demo decision</button>}</article>;
}
