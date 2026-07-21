import Image from "next/image";

const dashboardUrl = "https://strideos-coach-demo.gogov-nikola22.chatgpt.site/";
const githubUrl = "https://github.com/Kikser1214/strideos-harness";

const skills = [
  ["coach-athlete", "Onboard, resume, and coordinate the athlete relationship."],
  ["plan-training", "Build and adapt running, strength, recovery, and race plans."],
  ["use-training-data", "Recommend official routes and use athlete-selected host tools."],
  ["support-fueling", "Give optional practical fueling with explicit uncertainty."],
  ["schedule-coaching", "Prepare read-only morning, workout, and weekly rhythms."],
  ["build-coach-room", "Create the athlete-controlled Training Circle for human review."],
];

const loop = [
  ["01", "Sense", "Use only evidence the athlete chooses. Preserve source, observation time, retrieval time, and freshness."],
  ["02", "Reason", "Turn the evidence into one athlete map, state what is uncertain, and explain the next recommendation."],
  ["03", "Gate", "Check the exact intended action against safety, privacy, the selected tool, host permissions, and approval."],
  ["04", "Verify", "Call a change performed only after the resulting local or external state is read back and confirmed."],
];

const capabilities = [
  ["Adaptive training", "Plans respond to recovery, pain, schedule, and confirmed work rather than a rigid calendar."],
  ["Strength included", "Running and technique-first strength live in one plan with a clear purpose and progression boundary."],
  ["Loose nutrition", "Use ordinary food, optional photos, and practical preferences without turning life into a spreadsheet."],
  ["Human coach review", "Invite a real coach or experienced friend to suggest precise edits while the athlete keeps final authority."],
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
          <p className="eyebrow"><span /> Six-skill ChatGPT + Codex plugin</p>
          <h1>Train with AI.<br />Keep your people in the loop.</h1>
          <p className="hero-lede">
            StrideOS installs six focused endurance-coaching skills in ChatGPT Work mode and Codex.
            Build an athlete map, plan running and strength, use athlete-selected
            evidence, support fueling, prepare read-only coaching rhythms, and
            invite a real human into a Training Circle without giving the agent control of your accounts.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#install">
              Install the plugin <span aria-hidden="true">-&gt;</span>
            </a>
            <a className="button button-secondary" href={dashboardUrl} target="_blank" rel="noreferrer">
              Open the live demo
            </a>
          </div>
          <p className="hero-note">Six skills / Open source / Local-first / Athlete controlled</p>
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
        <span>Local-first</span><i />
        <span>Approval-gated</span><i />
        <span>Built for real athletes</span>
      </section>

      <section className="plugin-section" id="install">
        <div className="plugin-intro">
          <p className="eyebrow light"><span /> The package</p>
          <h2>Six skills.<br />One athlete-controlled system.</h2>
          <p>Add the GitHub-backed StrideOS marketplace, install `strideos@strideos`, restart the desktop app or CLI session, and begin in a new Work/Codex task. No wearable, database, hosted backend, or provider account is required.</p>
          <a href={githubUrl} target="_blank" rel="noreferrer">Inspect the plugin source <span>-&gt;</span></a>
        </div>
        <div className="plugin-install" aria-label="StrideOS plugin installation command">
          <div className="install-title"><span>INSTALL / CODEX</span><b>strideos</b></div>
          <pre><code>{`codex plugin marketplace add Kikser1214/strideos-harness --ref main
codex plugin list
codex plugin add strideos@strideos`}</code></pre>
          <p>Restart ChatGPT desktop, install or enable StrideOS in Plugins Directory when applicable, open a new Work/Codex task, and begin with <code>@strideos Build my athlete map.</code></p>
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
          <p className="eyebrow"><span /> The control loop</p>
          <h2>One athlete map.<br />One clear next step.</h2>
          <p>Evidence, model reasoning, deterministic authority, and performed actions remain separate and inspectable.</p>
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
          <p className="eyebrow"><span /> build-coach-room</p>
          <h2>Bring the people you trust into the loop.</h2>
          <p className="collaboration-lede">The athlete chooses what a real coach, training partner, or experienced friend can see. Reviewers comment and suggest; only the athlete can activate a change.</p>
          <div className="collaboration-steps">
            <article><span>01</span><div><h3>Invite privately</h3><p>Choose one person or a small trusted Training Circle and limit the shared fields.</p></div></article>
            <article><span>02</span><div><h3>Review in context</h3><p>Comments stay attached to the exact workout, week, or plan version they refer to.</p></div></article>
            <article><span>03</span><div><h3>Suggest an edit</h3><p>StrideOS creates a visible before-and-after proposal without touching the active plan.</p></div></article>
            <article><span>04</span><div><h3>Athlete approves</h3><p>Reviewers never receive plan activation, sharing, invitation, or provider authority.</p></div></article>
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
          <p className="eyebrow light"><span /> Use the tools you already have</p>
          <h2>Keep your accounts. Add coaching skills.</h2>
          <p>StrideOS recommends official provider routes and, when your current AI surface exposes it, attended browser or computer use in a session you sign into. These recommendations are not an allowlist, and StrideOS never disables another tool you choose.</p>
          <a href={githubUrl} target="_blank" rel="noreferrer">Read the provider playbooks <span>-&gt;</span></a>
        </div>
        <div className="integration-list">
          <article><div className="connector-icon">G</div><div><h3>Garmin Connect</h3><p>Use an official export, or ask the agent to work in the Garmin session you signed into when the current host offers attended browser or computer use.</p></div><span>Official / attended</span></article>
          <article><div className="connector-icon">A</div><div><h3>Apple Watch</h3><p>An authorized user-owned iOS companion is required. Apple Health XML import is not implemented in this release.</p></div><span>Companion required</span></article>
          <article><div className="connector-icon">H</div><div><h3>Health Connect</h3><p>An authorized Android companion is required. Health Connect backup import is not implemented in this release.</p></div><span>Companion required</span></article>
          <article><div className="connector-icon">+</div><div><h3>Files and check-ins</h3><p>FIT, TCX, GPX, CSV, pain, effort, energy, sleep feel, and context work without a provider session.</p></div><span>Available now</span></article>
        </div>
      </section>

      <section className="control-section">
        <div className="control-card">
          <p className="eyebrow"><span /> Human control plane</p>
          <h2>The agent can propose.<br />Only you can approve.</h2>
          <p>A provider write needs a real tool on the current host, an exact dry-run preview, and one approval for one visible action. StrideOS never turns its recommendations into a veto over browser use, computer use, scripts, or plugins you select.</p>
          <div className="control-tags"><span>Explainable</span><span>Reversible</span><span>Consent-first</span><span>Auditable</span></div>
        </div>
        <div className="decision-card">
          <div className="decision-head"><span>PLAN PROPOSAL</span><span className="pending">Pending approval</span></div>
          <h3>Move Thursday&apos;s quality session</h3>
          <p>Recovery has improved, but calf soreness is still present. Keep today easy and reassess tomorrow morning.</p>
          <div className="decision-reason"><b>Why</b><span>Protect the key session without stacking load onto a pain signal.</span></div>
          <div className="decision-actions"><button type="button" className="decline">Keep current plan</button><button type="button" className="approve">Approve change</button></div>
        </div>
      </section>

      <section className="roadmap-section" id="roadmap">
        <div className="roadmap-intro">
          <p className="eyebrow"><span /> Post-Build Week roadmap</p>
          <h2>The next loop<br />is longer.</h2>
          <p className="roadmap-lede">
            Today, StrideOS helps with the next decision. The research direction is
            to make athlete-approved evidence useful across a season—without
            mistaking correlation for causation or turning optional context into surveillance.
          </p>
          <p className="roadmap-status"><span>Exploring</span> Not in the current release</p>
        </div>

        <div className="roadmap-evidence" aria-label="Example of athlete evidence becoming useful over longer time horizons">
          <div className="horizon-head">
            <span>ATHLETE EVIDENCE / TIME HORIZON</span>
            <span>HYPOTHESES, NOT DIAGNOSES</span>
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
              <p>Show what helped, what did not, and confidence.</p>
            </article>
          </div>

          <div className="roadmap-streams">
            <article>
              <span className="stream-index">01</span>
              <div><h3>Longitudinal athlete memory</h3><p>Sessions, check-ins, symptoms, fueling, recovery, and context tied to dates with athlete-controlled retention.</p></div>
              <em>Across weeks and seasons</em>
            </article>
            <article>
              <span className="stream-index">02</span>
              <div><h3>Running form over time</h3><p>Athlete-supplied video comparisons, confidence-labelled observations, and practical drills when improvement is useful.</p></div>
              <em>Movement, not diagnosis</em>
            </article>
            <article>
              <span className="stream-index">03</span>
              <div><h3>Flexible fueling and body context</h3><p>From simple meal photos to confirmed macros, plus optional progress context without inferring body fat, health, or potential from appearance.</p></div>
              <em>As simple as the athlete wants</em>
            </article>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <p className="eyebrow centered"><span /> Built in the open</p>
        <h2>Train with context.<br />Decide with confidence.</h2>
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
