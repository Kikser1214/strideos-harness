# OpenAI Build Week submission checklist

Official source: [OpenAI Build Week rules](https://openai.devpost.com/rules)

## Eligibility

- [x] North Macedonia is an eligible OpenAI API-supported territory.
- [ ] Entrant confirms they are at least the legal age of majority where they live.
- [ ] Entrant confirms no employment, judging, promotional, or other conflict listed in the official rules.
- [x] Project is newly created during the submission period, not an old-project submission.
- [x] Project is original work and MIT licensed.

## Timing

- Registration and submission deadline: **July 21, 2026 at 5:00 PM Pacific Time**.
- In Skopje: **July 22, 2026 at 2:00 AM CEST**.
- The optional $100 free-credit request deadline was July 17 at 12:00 PM PT and has passed. This does not affect eligibility.

## Submission requirements

- [ ] Join the hackathon on Devpost.
- [x] Working project built with Codex and GPT-5.6.
- [x] Category selected: **Apps for Your Life**.
- [x] English project description drafted in `DEVPOST.md`.
- [ ] Record a public YouTube demo shorter than three minutes, with audio explaining both Codex and GPT-5.6 use.
- [ ] Create and push the public GitHub repository.
- [x] README includes setup, demo data, testing, and Codex collaboration details.
- [x] Judges can run the project without a Garmin device, account, or API key.
- [ ] Run `/feedback` in the Codex task where the majority of the core functionality was built; add that session ID to Devpost.
- [ ] Add screenshots and the public demo URL to the submission.
- [ ] Submit before the deadline and verify the Devpost confirmation screen.

## Repository publishing blocker

The intended repository is `https://github.com/Kikser1214/strideos-harness`. The local GitHub CLI currently reports an invalid saved token. Re-authenticate with:

```powershell
gh auth login -h github.com
```

Then create and push the public repository:

```powershell
gh repo create Kikser1214/strideos-harness --public --source . --remote origin --push
```

## Prize reality check

Participation alone does not include ChatGPT Pro. The published prize table awards a one-year Pro account to each first- and second-place winning project in the four categories, alongside the applicable cash prize and other listed benefits.
