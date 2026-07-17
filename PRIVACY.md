# Privacy and data handling

StrideOS is local-first by design. The public repository and judge demo use synthetic athlete data only.

## In the included demo

- Athlete and training signals come from `data/demo-athlete.json`.
- Meal images selected in the browser are held in memory for the request and are not written to disk.
- Demo decisions are held in browser state and are not persisted.
- Demo Garmin actions are simulated and labeled as such.

## In live GPT-5.6 mode

- The server sends the user message, supplied athlete context, and—only for meal analysis—the selected image to the OpenAI Responses API.
- The API key stays on the server and is never returned to the browser.
- This starter does not persist API responses or uploaded images.
- Operators are responsible for providing appropriate notice and consent, securing transport, controlling access, and complying with the terms of any connected data provider.

Never commit `.env`, Garmin credentials or tokens, private athlete exports, real meal images, or application logs containing personal data.
