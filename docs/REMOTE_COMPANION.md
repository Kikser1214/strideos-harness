# Open StrideOS anywhere — private companion mode

StrideOS can run as a single-athlete private web companion on a persistent Node host. This is optional. The default remains `127.0.0.1`, where the app is reachable only from the same computer.

## What this mode adds

- the same responsive dashboard on phone, tablet, or desktop;
- an installable PWA shell;
- a private unlock screen backed by a server-side bearer key;
- workout annotations that return to the coaching loop;
- one durable JSON state file on a mounted volume.

It does **not** create multi-user accounts, password recovery, encrypted storage, connector OAuth, backups, or a managed cloud service. Use it as a personal instance, not a public signup product.

## Required environment

```dotenv
HOST=0.0.0.0
PORT=4173
STRIDEOS_ACCESS_TOKEN=replace-with-at-least-16-random-characters
STRIDEOS_PUBLIC_URL=https://stride.example.com
STRIDEOS_STATE_FILE=/data/strideos-state.json
```

Use HTTPS at the hosting platform or reverse proxy. Store the access key in the platform's secret manager, never in Git or a client-side build variable. Mount `/data` as a persistent volume and back it up according to your own privacy needs.

Run the setup doctor before launch:

```bash
npm run doctor
npm start
```

The doctor fails when a non-local host has no sufficiently long access key, and the server independently refuses to start if the doctor is skipped. `/api/health` exposes only `{ "ok": true }`; every athlete, plan, coaching, feedback, nutrition, connector, and decision endpoint requires the key.

## Container option

The included Dockerfile runs the Node server on port 4173. Provide the environment above and attach a persistent volume at `/data`. The repository intentionally avoids a platform-specific one-click deployment because persistent-volume and secret handling differ across hosts.

## Athlete flow

1. Open the HTTPS URL on any device.
2. Enter the private access key. It stays in browser session storage and is cleared when the session ends.
3. Install the companion when the browser offers **Install companion**.
4. Open today's approved session and choose **Add note**.
5. Save what does not fit, then choose **Ask coach to revise**.
6. Review and separately approve any resulting plan change.

Use **Lock** in the header on a shared device. It clears the key from browser session storage and returns to the unlock screen.

If the access key may have leaked, rotate it in the host's secret manager and restart the instance. Existing browser sessions will need the new key.
