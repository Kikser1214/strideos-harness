"use client";

import { useMemo, useState } from "react";

type View = "today" | "plan" | "coach" | "onboarding";
type Role = "athlete" | "coach";

const week = [
  { day: "MON", date: "20", type: "Recovery", title: "Rest + mobility", meta: "20 min · optional", tone: "rest" },
  { day: "TUE", date: "21", type: "Threshold", title: "4 × 2 km controlled", meta: "14 km · 4:10–4:15/km", tone: "quality" },
  { day: "WED", date: "22", type: "Easy + strength", title: "Aerobic maintenance", meta: "10 km easy · 35 min strength", tone: "easy" },
  { day: "THU", date: "23", type: "Easy + strides", title: "Relaxed mechanics", meta: "12 km · 6 × 20 sec strides", tone: "easy" },
  { day: "FRI", date: "24", type: "Strength", title: "Technique + durability", meta: "40 min · no run", tone: "strength" },
  { day: "SAT", date: "25", type: "Marathon specific", title: "Steady progression", meta: "16 km · final 8 km @ 4:35–4:40", tone: "quality" },
  { day: "SUN", date: "26", type: "Long run", title: "Aerobic durability", meta: "24 km · 5:05–5:25/km", tone: "long" },
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
  const [notes, setNotes] = useState([
    { author: "Milan · athlete", time: "18 min ago", text: "The 24 km Sunday feels ambitious after last week's calf tightness. I can do it, but I would rather finish the week healthy.", role: "athlete" },
    { author: "Coach Elena", time: "7 min ago", text: "Agree. Keep the stimulus, reduce the cost: 21 km total and only 6 km at marathon effort on Saturday. Reassess after Tuesday's threshold.", role: "coach" },
  ]);
  const [decision, setDecision] = useState<"pending" | "approved" | "declined">("pending");

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

function TodayView({ role, notes, draft, setDraft, addNote, decision, setDecision }: any) {
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
          <p className="session-lead">Protect Tuesday's threshold session. Twenty minutes of easy mobility is optional; extra mileage is not needed.</p>
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
            {notes.slice(-2).map((note: any, index: number) => <Comment key={`${note.author}-${index}`} note={note} />)}
            <Composer role={role} draft={draft} setDraft={setDraft} addNote={addNote} compact />
          </div>
          <DecisionCard role={role} decision={decision} setDecision={setDecision} />
        </div>
      </section>
    </div>
  );
}

function PlanView({ week, decision }: { week: typeof week; decision: string }) {
  return (
    <div className="content">
      <PageIntro eyebrow="TRAINING PLAN · WEEK 1" title="Specific enough to progress. Conservative enough to repeat." copy="The agent proposed this block from four years of history, recent Garmin volume, your schedule, recovery and strength availability." />
      <div className="plan-summary">
        <Metric label="Running" value={decision === "approved" ? "62 km" : "66 km"} meta="5 sessions" />
        <Metric label="Strength" value="2 sessions" meta="75 min total" />
        <Metric label="Quality" value="2 exposures" meta="Separated by 3 days" />
        <Metric label="Long run" value={decision === "approved" ? "21 km" : "24 km"} meta={decision === "approved" ? "Approved revision" : "Revision proposed"} />
      </div>
      <section className="week-list">
        {week.map((item) => <article className="day-row" key={item.day}><div className="date-box"><span>{item.day}</span><strong>{item.date}</strong></div><span className={`tone-dot ${item.tone}`} /><div className="day-main"><p>{item.type}</p><h3>{item.title}</h3></div><div className="day-meta">{item.meta}</div><button aria-label={`Open ${item.day} session`}>→</button></article>)}
      </section>
      <div className="plan-principles"><div><span>01</span><h3>One central pace model</h3><p>Quality paces scale with repetition length. Long-run pace remains durability-led, not inferred from interval speed.</p></div><div><span>02</span><h3>Strength is part of the plan</h3><p>Two technique-first sessions target calf, soleus, hip and trunk durability without stealing from key runs.</p></div><div><span>03</span><h3>Week four unloads</h3><p>The next block is proposed only after Garmin evidence, subjective effort, pain and schedule adherence are reviewed.</p></div></div>
    </div>
  );
}

function CoachView({ role, notes, draft, setDraft, addNote, decision, setDecision }: any) {
  return (
    <div className="content">
      <PageIntro eyebrow="COACH ROOM · SHARED PRIVATELY" title="One plan. Two perspectives. Athlete in control." copy="Comments are attached to an exact workout snapshot. Feedback can trigger a proposal, never a silent change." />
      <div className="coach-layout">
        <section className="comment-panel">
          <div className="card-heading"><div><p>Sunday · long run</p><h3>24 km aerobic durability</h3></div><span className="status-badge warning">Review open</span></div>
          <div className="comment-stack">{notes.map((note: any, index: number) => <Comment key={`${note.author}-${index}`} note={note} />)}</div>
          <Composer role={role} draft={draft} setDraft={setDraft} addNote={addNote} />
        </section>
        <aside className="decision-panel"><DecisionCard role={role} decision={decision} setDecision={setDecision} /><div className="permission-card"><p>PERMISSIONS</p><h3>{role === "athlete" ? "You decide what changes." : "You can advise, not activate."}</h3><ul><li>Both can comment and annotate</li><li>Agent can draft an exact revision</li><li>Only athlete can approve the plan</li><li>Garmin write needs separate approval</li></ul></div></aside>
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

function Comment({ note }: { note: any }) {
  return <article className={`comment ${note.role}`}><div className="comment-avatar">{note.role === "coach" ? "CE" : "MK"}</div><div><p><strong>{note.author}</strong><span>{note.time}</span></p><div>{note.text}</div></div></article>;
}

function Composer({ role, draft, setDraft, addNote, compact = false }: any) {
  return <div className={`composer ${compact ? "compact" : ""}`}><label htmlFor={compact ? "quick-note" : "coach-note"}>Add as {role === "athlete" ? "athlete" : "coach"}</label><textarea id={compact ? "quick-note" : "coach-note"} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={role === "athlete" ? "How did this feel, or what does not fit?" : "Leave precise feedback on this session…"} /><button onClick={addNote}>Add comment</button></div>;
}

function DecisionCard({ role, decision, setDecision }: any) {
  return <article className={`decision-card ${decision}`}><div className="decision-top"><span>AGENT PROPOSAL · REVISION 01</span><em>{decision === "pending" ? "Awaiting athlete" : decision}</em></div><h3>Reduce weekend cost, keep the stimulus.</h3><div className="diff-row"><span>Saturday</span><del>8 km @ MP</del><b>→</b><ins>6 km @ MP</ins></div><div className="diff-row"><span>Sunday</span><del>24 km</del><b>→</b><ins>21 km</ins></div><p className="decision-reason">Why: athlete-reported calf tightness + coach agreement. Tuesday remains a checkpoint. No Garmin action is included.</p>{decision === "pending" && role === "athlete" ? <div className="decision-actions"><button className="approve" onClick={() => setDecision("approved")}>Approve plan change</button><button onClick={() => setDecision("declined")}>Keep original</button></div> : decision === "pending" ? <div className="coach-lock">Coach feedback recorded · athlete approval required</div> : <button className="reset-decision" onClick={() => setDecision("pending")}>Reset demo decision</button>}</article>;
}
