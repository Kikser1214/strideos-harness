# StrideOS athlete-and-coach Sites demo

This is the unbound ChatGPT Sites template for the StrideOS shared athlete dashboard. It uses only synthetic data: an established runner with four years of training and a 3:20 marathon best.

The mock demonstrates the intended Work-to-Sites flow:

- onboarding replay in plain language;
- source-labeled Garmin and subjective evidence;
- today and four-week plan views;
- two strength sessions inside the running plan;
- athlete annotation and coach comment;
- an exact proposed training revision;
- athlete-only approval;
- responsive desktop and mobile navigation.

Comments, the role preview and the approval interaction are client-side mock state and reset on refresh. The template does not claim live coach identity, persistence, Garmin access or external writes. See [`../../docs/CHATGPT_SITES.md`](../../docs/CHATGPT_SITES.md) for the durable D1, authentication and permission contract.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Then open the Local URL printed by the development server. Validate the production build and rendered product contract with:

```bash
npm test
```

## Create a personal Site

`.openai/hosting.json` intentionally contains no `project_id`. A new installer must create their own private Sites project and keep the generated binding in their copy. Never point an athlete at the demo author's deployment.

Owner-only access is the default. Add a coach only after the athlete requests it. A coach may comment but cannot activate plan changes or authorize Garmin/calendar writes.

## Main files

- `app/page.tsx` — synthetic interactive product mock
- `app/globals.css` — desktop and mobile visual system
- `app/layout.tsx` — site metadata and social preview wiring
- `public/og.png` — generated share preview
- `.openai/hosting.json` — unbound Sites capability declaration
- `tests/rendered-html.test.mjs` — server-rendered product checks
