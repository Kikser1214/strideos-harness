# Privacy and data handling

StrideOS is local-first by design. The public repository and judge demo use synthetic athlete data only.

## In the included demo

- Athlete and training signals come from `data/demo-athlete.json`.
- Meal images selected in the browser are held in memory for the request and are not written to disk.
- Decisions, onboarding answers, confirmed normalized activity summaries, and manual check-ins are stored in the configured local state file. The default is an operating-system temporary file and can be replaced with `STRIDEOS_STATE_FILE`.
- Demo Garmin actions are simulated and labeled as such.
- Activity-file preview does not persist the uploaded bytes. After explicit import confirmation, StrideOS stores normalized summaries and discards the raw FIT, GPX, TCX, or CSV request bytes.
- Every imported summary and manual check-in has a delete control in **Data sources**.

## In live GPT-5.6 mode

- The server sends the user message, supplied athlete context, and—only for meal analysis—the selected image to the OpenAI Responses API.
- The API key stays on the server and is never returned to the browser.
- This starter does not persist uploaded meal images or raw activity files. It does persist the local decision ledger and athlete-selected normalized data described above.
- Operators are responsible for providing appropriate notice and consent, securing transport, controlling access, and complying with the terms of any connected data provider.

Never commit `.env`, Garmin credentials or tokens, private athlete exports, real meal images, or application logs containing personal data.
