const dashboardUrl =
  "https://strideos-coach-demo.gogov-nikola22.chatgpt.site/";
const githubUrl = "https://github.com/Kikser1214/strideos-harness";

const loop = [
  {
    number: "01",
    title: "Sense",
    body: "Bring workouts, recovery, meals, pain, and context together—from a watch, a file, a photo, or a conversation.",
  },
  {
    number: "02",
    title: "Reason",
    body: "The agent turns scattered signals into one athlete model, then explains what matters before proposing a change.",
  },
  {
    number: "03",
    title: "Gate",
    body: "Your rules stay in control. Training changes and external writes wait for explicit approval.",
  },
  {
    number: "04",
    title: "Act",
    body: "Approve the next session, send it to your training stack, and keep the decision trail visible.",
  },
];

const capabilities = [
  ["Adaptive training", "Plans respond to readiness, pain, schedule, and completed work—not a rigid calendar."],
  ["Strength included", "Running and strength live in one plan, with beginner-safe progressions and clear intent."],
  ["Loose nutrition", "Use meal photos and simple preferences for practical guidance without turning life into a spreadsheet."],
  ["Coach review", "Share a readable dashboard, collect feedback, and keep the athlete in charge of the final decision."],
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="StrideOS home">
          <span className="brand-mark">S/</span>
          <span>StrideOS</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#coach-mode">Coach Mode</a>
          <a href="#capabilities">Capabilities</a>
          <a href="#integrations">Integrations</a>
        </nav>
        <a className="nav-cta" href={githubUrl} target="_blank" rel="noreferrer">
          View source <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Open-source agentic coaching</p>
          <h1>Your training,<br />finally connected.</h1>
          <p className="hero-lede">
            StrideOS is a rule-governed AI coaching harness that turns your
            training, recovery, nutrition, and real life into one explainable
            plan—without taking control away from you.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href={dashboardUrl} target="_blank" rel="noreferrer">
              Open the live coach <span aria-hidden="true">→</span>
            </a>
            <a className="button button-secondary" href={githubUrl} target="_blank" rel="noreferrer">
              Explore on GitHub
            </a>
          </div>
          <p className="hero-note">Built for Codex and ChatGPT · Watch optional · Athlete approved</p>
        </div>

        <div className="hero-visual" aria-label="StrideOS training dashboard preview">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="dash-shell">
            <div className="dash-topbar">
              <div className="mini-brand"><span>S/</span> Athlete room</div>
              <div className="live-pill"><span /> Synced</div>
            </div>
            <div className="readiness-row">
              <div>
                <p>Today · Tuesday</p>
                <strong>Ready to build</strong>
              </div>
              <div className="readiness-score">84<span>/100</span></div>
            </div>
            <div className="workout-card">
              <div className="workout-head">
                <div><span className="label">KEY SESSION</span><h2>Threshold intervals</h2></div>
                <span className="duration">58 min</span>
              </div>
              <div className="workout-chart" aria-hidden="true">
                <span className="warmup" />
                <span className="rep tall" />
                <span className="rest" />
                <span className="rep taller" />
                <span className="rest" />
                <span className="rep tall" />
                <span className="cooldown" />
              </div>
              <div className="workout-meta"><span>3 × 10 min</span><span>Controlled threshold</span></div>
            </div>
            <div className="coach-note">
              <span className="coach-avatar">AI</span>
              <p><strong>Why this session?</strong><br />Your recovery is stable and the last two quality sessions were controlled. Keep the final rep honest, not heroic.</p>
            </div>
            <div className="approval-row">
              <span>Plan change requires your approval</span>
              <button type="button">Review proposal</button>
            </div>
          </div>
          <div className="signal-card signal-top"><span>↗</span><div><strong>Durability</strong><small>Trending up</small></div></div>
          <div className="signal-card signal-bottom"><span>✓</span><div><strong>Coach reviewed</strong><small>2 notes resolved</small></div></div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Product principles">
        <span>Open source</span><i />
        <span>Local-first</span><i />
        <span>Approval-gated</span><i />
        <span>Built for real athletes</span>
      </section>

      <section className="section loop-section" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow"><span /> The control loop</p>
          <h2>One athlete map.<br />One clear next step.</h2>
          <p>StrideOS connects the parts traditional training apps leave scattered, then makes every recommendation inspectable.</p>
        </div>
        <div className="loop-grid">
          {loop.map((item) => (
            <article className="loop-card" key={item.number}>
              <div className="loop-number">{item.number}</div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="runner-section">
        <div className="runner-panel beginner-panel">
          <p className="panel-kicker">FROM THE FIRST RUN</p>
          <h2>A coach that knows when to simplify.</h2>
          <p>New runners do not need a menu of training philosophies. They need a calm starting point, plain language, and progression they can actually absorb.</p>
          <div className="week-preview">
            <div><b>M</b><span>Run/walk</span></div>
            <div><b>T</b><span>Strength</span></div>
            <div><b>W</b><span>Recover</span></div>
            <div><b>T</b><span>Run/walk</span></div>
            <div><b>F</b><span>Strength</span></div>
            <div><b>S</b><span>Run/walk</span></div>
            <div><b>S</b><span>Optional bike</span></div>
          </div>
        </div>
        <div className="runner-panel performance-panel">
          <p className="panel-kicker">TO THE NEXT BREAKTHROUGH</p>
          <h2>A system that respects experience.</h2>
          <p>For established runners, StrideOS preserves the difference between speed and durability, learns from execution, and changes the plan only with evidence.</p>
          <div className="metric-row">
            <div><small>MARATHON</small><strong>3:20</strong></div>
            <div><small>QUALITY MODEL</small><strong>4:23/km</strong></div>
            <div><small>TRAINING AGE</small><strong>4 years</strong></div>
          </div>
        </div>
      </section>

      <section className="section capabilities-section" id="capabilities">
        <div className="section-heading compact">
          <p className="eyebrow"><span /> More than a running plan</p>
          <h2>The whole week belongs in the room.</h2>
        </div>
        <div className="capability-grid">
          {capabilities.map(([title, body], index) => (
            <article key={title}>
              <span className="cap-index">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="collaboration-section" id="coach-mode">
        <div className="collaboration-copy">
          <p className="eyebrow"><span /> Coach Mode</p>
          <h2>Bring the people you trust into the loop.</h2>
          <p className="collaboration-lede">Invite a real coach, training partner, or experienced friend to review the same plan you see. They can annotate exact sessions, question the load, and suggest precise edits—without silently changing your training.</p>
          <div className="collaboration-steps">
            <article><span>01</span><div><h3>Invite privately</h3><p>Share reviewer access with one person or a small training circle.</p></div></article>
            <article><span>02</span><div><h3>Review in context</h3><p>Comments stay attached to the workout, week, or training decision they refer to.</p></div></article>
            <article><span>03</span><div><h3>Suggest an edit</h3><p>StrideOS turns feedback into a visible before-and-after proposal with a reason.</p></div></article>
            <article><span>04</span><div><h3>Athlete approves</h3><p>Only the athlete activates plan changes or sends an update to a device.</p></div></article>
          </div>
        </div>

        <div className="coach-mode-board" aria-label="Shared athlete and coach review example">
          <div className="board-header">
            <div><span className="board-label">SHARED TRAINING ROOM</span><strong>Sunday · Aerobic durability</strong></div>
            <div className="reviewers"><span>MK</span><span>CE</span><span>+1</span></div>
          </div>
          <div className="board-workout">
            <div className="board-workout-title"><div><span>LONG RUN</span><h3>24 km · easy aerobic</h3></div><em>Review open</em></div>
            <div className="distance-line"><i /><i /><i /><i /><i /><i /><i /></div>
            <div className="board-metrics"><span><b>5:05–5:25</b><small>pace / km</small></span><span><b>40–50 g</b><small>carbs / hour</small></span><span><b>RPE 4</b><small>through 18 km</small></span></div>
          </div>
          <div className="board-comment athlete-comment"><span>MK</span><div><strong>Milan · athlete</strong><p>The distance feels ambitious after last week’s calf tightness.</p></div></div>
          <div className="board-comment coach-comment"><span>CE</span><div><strong>Coach Elena</strong><p>Agree. Keep the stimulus, reduce the cost: 21 km and reassess after Tuesday.</p></div></div>
          <div className="proposal-preview">
            <div><span>AGENT PROPOSAL</span><em>Awaiting athlete</em></div>
            <strong>24 km <del>original</del> <b>→</b> 21 km <ins>proposed</ins></strong>
            <button type="button">Review exact change</button>
          </div>
          <p className="board-permission">Reviewers advise · StrideOS drafts · Athlete decides</p>
        </div>
      </section>

      <section className="integration-section" id="integrations">
        <div className="integration-copy">
          <p className="eyebrow light"><span /> Bring your own stack</p>
          <h2>Your watch is a connector, not a requirement.</h2>
          <p>Start manually, import files, or connect the tools you already use. StrideOS keeps each integration optional and makes every external write visible before it happens.</p>
          <a href={githubUrl} target="_blank" rel="noreferrer">Read the integration guides <span>→</span></a>
        </div>
        <div className="integration-list">
          <article><div className="connector-icon">G</div><div><h3>Garmin</h3><p>Official pathway or an opt-in local community bridge.</p></div><span>Optional</span></article>
          <article><div className="connector-icon">◉</div><div><h3>Apple Watch</h3><p>A companion pathway through Apple Health and WorkoutKit.</p></div><span>Optional</span></article>
          <article><div className="connector-icon">H</div><div><h3>Health Connect</h3><p>Android health data through a user-owned companion.</p></div><span>Optional</span></article>
          <article><div className="connector-icon">+</div><div><h3>Files & manual check-ins</h3><p>Useful coaching even when no wearable is connected.</p></div><span>Always available</span></article>
        </div>
      </section>

      <section className="control-section">
        <div className="control-card">
          <p className="eyebrow"><span /> Human control plane</p>
          <h2>The agent can propose.<br />Only you can approve.</h2>
          <p>Plans, device writes, automations, and shared data remain behind explicit consent. Every important recommendation carries its reason and its boundary.</p>
          <div className="control-tags"><span>Explainable</span><span>Reversible</span><span>Consent-first</span><span>Auditable</span></div>
        </div>
        <div className="decision-card">
          <div className="decision-head"><span>PLAN PROPOSAL</span><span className="pending">Pending approval</span></div>
          <h3>Move Thursday’s quality session</h3>
          <p>Recovery has improved, but calf soreness is still present. Keep today easy and reassess tomorrow morning.</p>
          <div className="decision-reason"><b>Why</b><span>Protect the key session without stacking load onto a pain signal.</span></div>
          <div className="decision-actions"><button type="button" className="decline">Keep current plan</button><button type="button" className="approve">Approve change</button></div>
        </div>
      </section>

      <section className="final-cta">
        <p className="eyebrow centered"><span /> Built in the open</p>
        <h2>Train with context.<br />Decide with confidence.</h2>
        <p>Explore the working coach, inspect every rule, and build the version that fits your training life.</p>
        <div className="hero-actions centered-actions">
          <a className="button button-primary" href={dashboardUrl} target="_blank" rel="noreferrer">Try the live demo <span>→</span></a>
          <a className="button button-secondary" href={githubUrl} target="_blank" rel="noreferrer">Fork StrideOS</a>
        </div>
      </section>

      <footer>
        <a className="brand" href="#top"><span className="brand-mark">S/</span><span>StrideOS</span></a>
        <p>Open-source agentic coaching for runners.</p>
        <div><a href={githubUrl} target="_blank" rel="noreferrer">GitHub</a><a href={dashboardUrl} target="_blank" rel="noreferrer">Live demo</a></div>
        <small>Built for the OpenAI Buildathon · 2026</small>
      </footer>
    </main>
  );
}
