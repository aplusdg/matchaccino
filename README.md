# Matchaccino

A little initiative. A little intuition. Made for your day.

A single-page desk for Kaichi, made by Maddy: a 3D cappuccino, a writable notepad, and a daily fortune. React, Three.js, Vite, and an Express email backend. Fonts are bundled locally; no CDN is required.

## Run

Use Node.js **22.13+** (Node 24 recommended; the server uses built-in SQLite).

```sh
npm ci
cp .env.example .env
npm run dev
```

Open the app on port **3000**. The same server serves the UI and API. To build and run production:

```sh
npm run build
npm start
```

Set `PORT` as needed. Run from the repository root. Use a persistent, single Node server with writable `.data/` storage for the SQLite submission ledger; back it up and do not expose it publicly. Multiple instances need a shared rate limiter and durable database. The self-hosted Resend mode needs this Node server; the default FormSubmit mode also works on static GitHub Pages. Live processes need restarting after environment restoration.

## Default email: the same FormSubmit service as `aplusdg/coffee`

The published website is configured in `public/email-settings.json` to use **`https://formsubmit.co/ajax/terrinobb@gmail.com`**, the same fixed recipient and AJAX service used by the working coffee repository. No account, API key, sending domain or Node hosting is required for this mode. The only other permitted FormSubmit recipient is **maddykittyw@gmail.com**; browser request fields cannot override the configured destination.

FormSubmit may ask the inbox owner to activate a form or authorize a new page. If the website shows an activation message, open **terrinobb@gmail.com**, check Inbox and Spam, and click the FormSubmit confirmation link. Then retry the same request. Activation responses (even HTTP 200 with `success: true`) are never shown as a successful coffee or note request. Drafts remain intact. No Formspree signup is needed for the default setup.

Success requires FormSubmit's explicit acceptance response. Acceptance is not a guarantee of final inbox delivery. A browser-local submission ledger suppresses confirmed repeats; uncertain network outcomes cannot be automatically resent. Check the inbox before creating a fresh request after an uncertain result. FormSubmit provides the managed backend and its own service policies and limits; the client-side honeypot and validation do not replace server-side abuse controls. The optional self-hosted Resend backend below additionally supports durable server-side deduplication and rate limiting.

The browser uses the same captcha-free AJAX payload as the reference coffee site, with a honeypot, Sydney timestamps, request category or coffee details, and a request ID. See https://formsubmit.co/ for provider documentation. Local and CI tests mock email services and never send real mail.

## Optional alternative: Formspree

1. Sign up at **https://formspree.io/** and verify **maddykittyw@gmail.com** or **terrinobb@gmail.com** as your recipient inbox.
2. Create a form and copy its public endpoint, such as `https://formspree.io/f/your-form-id`. Use the real generated ID, not this example.
3. Set the repository’s **Settings → Secrets and variables → Actions → Variables → `VITE_FORM_ENDPOINT`** to that endpoint and rerun **Publish Matchaccino**. Alternatively, set `formEndpoint` in `public/email-settings.json`, run `npm run build:pages`, and commit/push both files and `site/`. This public URL is not a secret. Never put a provider API key in the browser.

Formspree is the server-side email service in this mode. The recipient stays fixed in the form dashboard; the browser supplies no recipient. Its acceptance response is required before showing success. Form activation, spam filtering and plan limits are managed by Formspree. A browser ledger prevents repeated confirmed sends; an uncertain network result is blocked from automatic retry to avoid sending twice. In that case check the inbox or Formspree submissions before creating another request. Known rejections preserve the draft and allow retry. The self-hosted option below additionally provides a durable server-side ledger and provider idempotency keys.

Until a real form endpoint or email backend is connected, the public website cannot send mail. “Draft saved · not sent” means browser storage only.

## Self-hosted email option: Resend

Create a Resend API key and verify a sending domain in Resend. Add these **server-only** values in `.env` or your deployment’s environment settings:

- `RESEND_API_KEY`: your Resend API key with email sending permission.
- `EMAIL_FROM`: your verified sender, e.g. `Matchaccino <desk@yourdomain.com>`.

All requests go to one of Maddy’s two approved addresses, enforced on the server. The default is **maddykittyw@gmail.com**; set `REQUEST_RECIPIENT=terrinobb@gmail.com` to use her other inbox. These are the only allowed destinations. The browser cannot select or override a recipient. Both are recipient addresses; `EMAIL_FROM` still needs an address on your verified sending domain. With no credentials, the app explicitly reports that sending is not configured; no requests are marked successful. Notes are saved locally until the provider confirms acceptance. A success indicates provider acceptance, not final inbox delivery or Maddy’s acceptance of a task. Monitor delivery in Resend if needed.

Emails are sent immediately, including scheduled coffee requests; the Sydney date/time is when the coffee is wanted. Server validation rejects past or nonexistent Sydney times, including daylight-saving gaps. Input limits, a honeypot, same-origin checks, an IP rate limit, a SQLite submission ledger, and Resend idempotency keys protect against basic abuse and retries. Do not use an untrusted reverse proxy’s forwarded IP headers. For broad public deployment, add deployment-level bot protection; the app is intended as a personal desk with no login. Keep `.data` persistent so accepted requests remain deduplicated across restarts. Retries retain the original email payload and timestamp. Uncertain submissions over 23 hours old require checking with Maddy before sending anew, respecting the provider’s 24-hour idempotency window.

## Interactions

- Hot Cappuccino with Regular strength is the default. Use “Fancy something different?” only to change to Flat white, Latte or Long black, or select Hot/Warm/Iced and an ice level. Choose Regular or Strong; “Make a little coffee” previews espresso, milk, and foam. Drag the cup gently to rotate it. Coffee requests do not require playing the preview first.
- Choose an opening on the notepad and type. “Change opening” keeps your text. Writing expands the sheet for longer notes; “Back to desk” folds it back without losing the draft. A local-save indicator confirms drafts stored in your browser. Pull the lower-right corner up and left: the front sheet clips along a reflected crease, reveals its back and the fresh sheet beneath, and follows your pointer. Release after the progress bar reaches the threshold to send; shorter pulls smoothly return. A failed send unfolds the same note. The sheet turns away only after confirmed acceptance. “Send note” and keyboard activation offer the same functionality. Failed sends keep the text and allow retry. Browser local storage preserves the draft on refresh.
- Click the fortune holder, use its keyboard-accessible button, or deliberately move back and forth over it while pressing to draw. The fortune uses a deterministic birthday + Sydney calendar date seed. It remains the same all day and updates at the next Sydney day (checked every 30 seconds).
- **No verified Chinese almanac source is connected.** The feature is explicitly “Daily inspiration”; all birthday-based colours, numbers, and messages are for entertainment. No traditional almanac claims are made.
- Touch, keyboard, reduced-motion preferences, and a CSS object fallback when WebGL is unavailable are supported. No sound or motion-sensor permission is required.

## Verify

```sh
npm test
npm run build
npx playwright install chromium
npx playwright test
```

If Chromium is already installed, skip the browser download and run `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test`. On restricted cloud machines, use `npm ci --cache /tmp/matchaccino-npm-cache` if the default npm cache is not writable.

Server tests use an injected email provider to exercise acceptance, validation, deduplication, retry, scheduling and failure paths without sending email. Browser tests verify the forms, draft preservation, gestures, daily result, and mobile layout; provider-success tests explicitly mock the API. Real inbox delivery is not claimed by those tests. The default FormSubmit mode requires an activated recipient; only the optional Resend mode requires email credentials.

## Publish the website at GitHub Pages

The cloud workspace and the public GitHub Pages site are separate. Running `npm run dev` or publishing a Codex environment does **not** deploy this website to GitHub Pages.

The included `.github/workflows/pages.yml` builds and publishes the interface on pushes to `main`. In the GitHub repository, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**. The “Publish Matchaccino” workflow then publishes the built `site` directory at **https://aplusdg.github.io/matchaccino/**. If needed, start the workflow from the Actions tab. The committed `site/` directory also supports the existing **Deploy from a branch → main → /(root)** setting: the root entry forwards to the compiled website at `/matchaccino/site/`. With Actions selected, the same compiled homepage is served directly at `/matchaccino/`. `npm run build:pages` refreshes this committed static artifact; run it after interface changes if retaining branch publishing. `node_modules` is never published. Vite uses relative asset paths so fonts, 3D code, and styles also work under `/matchaccino/`.

`npm run test:pages` builds the static artifact and checks it under the repository subpath using Chromium. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` when using system Chromium.

GitHub Pages only hosts static files. The default FormSubmit integration supplies the email backend externally, so the complete interface and notifications work from Pages once the receiving inbox is activated. If all email endpoints are removed, sending explicitly reports that it is not connected.

To use the optional self-hosted Resend backend instead of FormSubmit, clear `formEndpoint` in `public/email-settings.json`, then deploy the existing Express app on a Node 24 host with persistent `.data/` storage, set the server-only Resend credentials and `APP_ORIGIN=https://aplusdg.github.io`, then set the repository **Actions variable** `VITE_API_BASE_URL` to the backend’s public HTTPS origin (for example, your own deployment URL, without a trailing slash). Re-run the Pages workflow. This variable is public; never put an API key in a `VITE_` variable. The backend only allows the configured frontend origin and Maddy’s two approved recipient addresses. Hosting the whole app together on a Node host remains supported and does not require `VITE_API_BASE_URL` or cross-origin configuration.

## Themes, reading and music

Each page opening chooses one of five subtle pastel palettes (sage, powder blue, lilac, peach, butter). The previous palette is avoided when browser storage is available; fortunes remain tied to the Sydney date. Controls and body text are larger and darker for comfortable reading. The music button starts an original quiet instrumental generated locally with Web Audio; no external stream, API key or CDN is used. Music starts only after a click, can be muted immediately, and stops when the tab is hidden. Browsers restrict autoplay, so opening the page is silent.
