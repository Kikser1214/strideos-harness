import Image from "next/image";

const dashboardUrl = "https://strideos-coach-demo.gogov-nikola22.chatgpt.site/";
const githubUrl = "https://github.com/Kikser1214/strideos-harness";

const skills = [
  ["coach-athlete", "Learn the runner's goals, history, schedule, and preferences, then guide what happens next."],
  ["plan-training", "Build and adapt running, strength, recovery, and race plans."],
  ["use-training-data", "Use only the training data the runner chooses, and keep its source and age visible."],
  ["support-fueling", "Give optional, practical fueling guidance and say what is uncertain."],
  ["schedule-coaching", "Prepare optional morning, workout, and weekly check-ins."],
  ["build-coach-room", "Create the Training Circle for private review by people the runner trusts."],
];

const loop = [
  ["01", "Listen", "Only the training data you choose to share — your runs, your sleep, how you felt. Every piece keeps its source and its age."],
  ["02", "Understand", "It builds the full picture of your training, says what it's unsure about, and explains its recommendation."],
  ["03", "Ask", "Before anything changes — a plan, a workout on your watch — it asks. Your explicit yes, every time."],
  ["04", "Confirm", "It never claims something was done. It checks the result actually landed, then tells you."],
];

const capabilities = [
  ["Adaptive training", "Plans respond to recovery, pain, schedule, and confirmed work rather than a rigid calendar."],
  ["Strength included", "Running and technique-first strength live in one plan with a clear purpose and progression boundary."],
  ["Loose nutrition", "Use ordinary food, optional photos, and practical preferences without turning life into a spreadsheet."],
  ["Human coach review", "Invite a real coach or experienced friend to suggest precise edits. Only the runner can accept them."],
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
          <a href="#install">Plugin</a>
          <a href="#how-it-works">How it works</a>
          <a href="#coach-mode">Training Circle</a>
          <a href="#integrations">Your accounts</a>
          <a href="#roadmap">Roadmap</a>
        </nav>
        <a className="nav-cta" href={githubUrl} target="_blank" rel="noreferrer">
          View source <span aria-hidden="true">+</span>
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow">Six-skill ChatGPT + Codex plugin</p>
          <h1>The AI coach that asks first.</h1>
          <p className="hero-promise">Your training. Your data. Your call.</p>
          <p className="hero-lede">
            StrideOS installs six coaching skills in ChatGPT and Codex. It plans
            your running, strength, and fueling — but nothing activates and nothing
            reaches your watch without your explicit yes. When you want human eyes
            on the plan, invite your real coach or a trusted friend to review and suggest.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#install">
              Install the plugin <span aria-hidden="true">-&gt;</span>
            </a>
            <a className="button button-secondary" href={dashboardUrl} target="_blank" rel="noreferrer">
              Open the live demo
            </a>
          </div>
          <p className="hero-note">Six skills / Open source / Your data / Your decision</p>
        </div>

        <div className="hero-visual">
          <a className="real-dashboard" href={dashboardUrl} target="_blank" rel="noreferrer" aria-label="Open the live StrideOS reference dashboard">
            <Image src="/dashboard-plan.png" width={2747} height={1951} priority sizes="(max-width: 1100px) 92vw, 52vw" alt="Real StrideOS personal training view showing a four-week plan and detailed session" />
            <span className="real-dashboard-label"><b>LIVE REFERENCE VIEW</b><small>Training plan / weekly details / full block / history</small></span>
            <span className="open-dashboard-badge">Open live demo <b>+</b></span>
          </a>
        </div>
      </section>

      <section className="trust-strip" aria-label="Product principles">
        <span>Installable plugin</span><i />
        <span>Your data stays yours</span><i />
        <span>Nothing changes without yes</span><i />
        <span>Built for real runners</span>
      </section>

      <section className="plugin-section" id="install">
        <div className="plugin-intro">
          <p className="eyebrow light">The package</p>
          <h2>Six skills.<br />One system you control.</h2>
          <p>Add the GitHub-backed StrideOS marketplace, install `strideos@strideos`, restart the desktop app or CLI session, and begin in a new Work/Codex task. No wearable, database, hosted backend, or training account is required.</p>
          <a href={githubUrl} target="_blank" rel="noreferrer">Inspect the plugin source <span>-&gt;</span></a>
        </div>
        <div className="plugin-install" aria-label="StrideOS plugin installation command">
          <div className="install-title"><span>INSTALL / CODEX</span><b>strideos</b></div>
          <pre><code>{`codex plugin marketplace add Kikser1214/strideos-harness --ref main
codex plugin list
codex plugin add strideos@strideos`}</code></pre>
          <p>Restart ChatGPT desktop, install or enable StrideOS in Plugins Directory when applicable, open a new Work/Codex task, and begin with <code>@strideos Build my training profile.</code></p>
        </div>
        <div className="skill-list" aria-label="Six StrideOS skills">
          {skills.map(([name, body], index) => (
            <article key={name}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{name}</h3><p>{body}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section loop-section" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">The control loop</p>
          <h2>It knows where you are.<br />It tells you what&apos;s next.</h2>
          <p>What it knows, what it thinks, what it&apos;s allowed to do, and what it actually did — always kept separate, always visible.</p>
        </div>
        <div className="loop-grid">
          {loop.map(([number, title, body]) => (
            <article className="loop-card" key={number}>
              <div className="loop-number">{number}</div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="runner-section">
        <div className="runner-panel beginner-panel">
          <p className="panel-kicker">FROM THE FIRST RUN</p>
          <h2>A coach that knows when to simplify.</h2>
          <p>New runners need a calm starting point, plain language, strength support, and progression they can actually absorb.</p>
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
          <p>For established runners, StrideOS keeps speed and durability separate, learns from completed training, and changes the plan only when the runner agrees.</p>
          <div className="metric-row">
            <div><small>MARATHON</small><strong>3:20</strong></div>
            <div><small>QUALITY MODEL</small><strong>4:23/km</strong></div>
            <div><small>TRAINING AGE</small><strong>4 years</strong></div>
          </div>
        </div>
      </section>

      <section className="section capabilities-section" id="capabilities">
        <div className="section-heading compact">
          <p className="eyebrow">More than a running plan</p>
          <h2>The whole week belongs in the Training Circle.</h2>
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
          <p className="eyebrow">build-coach-room</p>
          <h2>Bring the people you trust into your Training Circle.</h2>
          <p className="collaboration-lede">You choose what a real coach, training partner, or experienced friend can see. They comment and suggest; only you can accept a change.</p>
          <div className="collaboration-steps">
            <article><span>01</span><div><h3>Invite privately</h3><p>Choose one person or a small trusted Training Circle and limit the shared fields.</p></div></article>
            <article><span>02</span><div><h3>Review the right workout</h3><p>Comments stay attached to the exact workout, week, or plan version they refer to.</p></div></article>
            <article><span>03</span><div><h3>Suggest an edit</h3><p>StrideOS creates a visible before-and-after proposal without touching the active plan.</p></div></article>
            <article><span>04</span><div><h3>You decide</h3><p>Reviewers can suggest. They cannot activate a plan, share your page, invite others, or send anything to an account.</p></div></article>
          </div>
        </div>

        <div className="coach-mode-board" aria-label="Training Circle review example">
          <div className="board-header">
            <div><span className="board-label">TRAINING CIRCLE</span><strong>Sunday / Aerobic durability</strong></div>
            <div className="reviewers"><span>MK</span><span>CE</span><span>+1</span></div>
          </div>
          <div className="board-workout">
            <div className="board-workout-title"><div><span>LONG RUN</span><h3>24 km / easy aerobic</h3></div><em>Review open</em></div>
            <div className="distance-line"><i /><i /><i /><i /><i /><i /><i /></div>
            <div className="board-metrics"><span><b>5:05-5:25</b><small>pace / km</small></span><span><b>40-50 g</b><small>carbs / hour</small></span><span><b>RPE 4</b><small>through 18 km</small></span></div>
          </div>
          <div className="board-comment athlete-comment"><span>MK</span><div><strong>Milan / athlete</strong><p>The distance feels ambitious after last week&apos;s calf tightness.</p></div></div>
          <div className="board-comment coach-comment"><span>CE</span><div><strong>Coach Elena</strong><p>Keep the stimulus, reduce the cost: 21 km and reassess after Tuesday.</p></div></div>
          <div className="proposal-preview">
            <div><span>AGENT PROPOSAL</span><em>Awaiting athlete</em></div>
            <strong>24 km <del>original</del> <b>-&gt;</b> 21 km <ins>proposed</ins></strong>
            <button type="button">Review exact change</button>
          </div>
          <p className="board-permission">Reviewers advise / StrideOS drafts / Athlete decides</p>
        </div>
      </section>

      <section className="integration-section" id="integrations">
        <div className="integration-copy">
          <p className="eyebrow light">Use the tools you already have</p>
          <h2>Keep your accounts. Add coaching skills.</h2>
          <p>StrideOS works alongside the accounts you already use. Choose an official export, a file, a check-in, or — when ChatGPT or Codex offers browser control — the page you signed into. You choose the method, and you can still use any other tool you want.</p>
          <a href={githubUrl} target="_blank" rel="noreferrer">See how your accounts work <span>-&gt;</span></a>
        </div>
        <div className="integration-list">
          <article><div className="connector-icon">G</div><div><h3>Garmin Connect</h3><p>Use an official export, or let the agent work in the Garmin page you signed into when ChatGPT or Codex offers browser control.</p></div><span>Export or signed-in page</span></article>
          <article><div className="connector-icon">A</div><div><h3>Apple Watch</h3><p>To read Apple Health automatically, you need an iPhone helper app you authorize. Apple Health XML import is not implemented in this release.</p></div><span>Helper app needed</span></article>
          <article><div className="connector-icon">H</div><div><h3>Health Connect</h3><p>To read Health Connect automatically, you need an Android helper app you authorize. Health Connect backup import is not implemented in this release.</p></div><span>Helper app needed</span></article>
          <article><div className="connector-icon">+</div><div><h3>Files and check-ins</h3><p>FIT, TCX, GPX, CSV, pain, effort, energy, sleep feel, and everyday notes work without signing into a training account.</p></div><span>Available now</span></article>
        </div>
      </section>

      <section className="control-section">
        <div className="control-card">
          <p className="eyebrow">You stay in control</p>
          <h2>The agent can propose.<br />Only you can approve.</h2>
          <p>Before the agent changes a plan or sends a workout, it shows exactly what will happen and asks for a separate yes — one visible action at a time. You can still use any browser, script, plugin, or other tool you choose.</p>
          <div className="control-tags"><span>Clear</span><span>Asks first</span><span>One action at a time</span><span>Checked afterward</span></div>
        </div>
        <div className="decision-card">
          <div className="decision-head"><span>PLAN PROPOSAL</span><span className="pending">Waiting for you</span></div>
          <h3>Move Thursday&apos;s quality session</h3>
          <p>Recovery has improved, but calf soreness is still present. Keep today easy and reassess tomorrow morning.</p>
          <div className="decision-reason"><b>Why</b><span>Protect the key session without stacking load onto a pain signal.</span></div>
          <div className="decision-actions"><button type="button" className="decline">Keep current plan</button><button type="button" className="approve">Approve change</button></div>
        </div>
      </section>

      <section className="roadmap-section" id="roadmap">
        <div className="roadmap-intro">
          <p className="eyebrow">Post-Build Week roadmap</p>
          <h2>The next loop<br />is longer.</h2>
          <p className="roadmap-lede">
            Today, StrideOS helps with the next decision. The research direction is
            to keep the training information you approve useful across a season — without
            pretending a pattern proves a cause or collecting more than you want.
          </p>
          <p className="roadmap-status"><span>Exploring</span> Not in the current release</p>
        </div>

        <div className="roadmap-evidence" aria-label="Example of training information becoming useful over time">
          <div className="horizon-head">
            <span>YOUR TRAINING / OVER TIME</span>
            <span>POSSIBLE PATTERNS / NOT DIAGNOSES</span>
          </div>
          <div className="horizon-track" aria-hidden="true">
            <i /><i /><i /><i />
          </div>
          <div className="horizon-grid">
            <article>
              <span>Today</span>
              <strong>Morning check-in</strong>
              <p>Legs calm. Sleep felt normal.</p>
            </article>
            <article>
              <span>1–3 weeks</span>
              <strong>Issue repeats</strong>
              <p>Side stitch appears late in hard blocks.</p>
            </article>
            <article>
              <span>2–3 months</span>
              <strong>Pattern is tested</strong>
              <p>Compare heat, fueling, load, and session timing.</p>
            </article>
            <article>
              <span>Season</span>
              <strong>Learning stays useful</strong>
              <p>Show what helped, what did not, and how sure the agent is.</p>
            </article>
          </div>

          <div className="roadmap-streams">
            <article>
              <span className="stream-index">01</span>
              <div><h3>Training history that remembers</h3><p>Sessions, check-ins, symptoms, fueling, recovery, and notes stay tied to dates for as long as the runner chooses.</p></div>
              <em>Across weeks and seasons</em>
            </article>
            <article>
              <span className="stream-index">02</span>
              <div><h3>Running form over time</h3><p>Compare videos the runner chooses to share, say how sure the analysis is, and suggest practical drills when useful.</p></div>
              <em>Movement, not diagnosis</em>
            </article>
            <article>
              <span className="stream-index">03</span>
              <div><h3>Flexible fueling history</h3><p>From simple meal photos to confirmed macros, with longer-term patterns kept as simple or detailed as the athlete wants.</p></div>
              <em>As simple as the athlete wants</em>
            </article>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <p className="eyebrow centered">Built in the open</p>
        <h2>See the full picture.<br />Make the final call.</h2>
        <p>Install the six coaching skills, inspect every rule, and build the Training Circle that fits your training life.</p>
        <div className="hero-actions centered-actions">
          <a className="button button-primary" href="#install">Install the plugin <span>-&gt;</span></a>
          <a className="button button-secondary" href={dashboardUrl} target="_blank" rel="noreferrer">Try the live demo</a>
        </div>
      </section>

      <footer>
        <a className="brand" href="#top"><span className="brand-mark">S/</span><span>StrideOS</span></a>
        <p>Open-source six-skill coaching plugin for runners.</p>
        <div><a href={githubUrl} target="_blank" rel="noreferrer">GitHub</a><a href={dashboardUrl} target="_blank" rel="noreferrer">Live demo</a></div>
        <small>Built for OpenAI Build Week / 2026</small>
      </footer>
    </main>
  );
}
