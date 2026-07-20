# StrideOS landing page

The public promotional site for [StrideOS](https://github.com/Kikser1214/strideos-harness), an open-source six-skill endurance coaching plugin package for ChatGPT and Codex.

The landing page explains the product control loop, athlete approval model, beginner and experienced-runner use cases, and optional device integrations. It links to the live coach dashboard without changing or replacing that demo.

## Run locally

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

The development server prints the local URL. To verify the production artifact and rendered HTML:

```bash
npm test
```

## Project principles

- All public product copy is English.
- Device integrations are optional and user-owned.
- Training changes and external writes require explicit approval.
- Recommendations should be explainable, reversible, and auditable.

## Hosting

This site is configured for ChatGPT Sites through `.openai/hosting.json`.
