import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp, resendEmail } from "../server/app.js";
import { dailyFortune, sydneyParts, sydneyInstant } from "../src/shared.js";
async function fixture(t, options = {}) {
  const calls = [];
  const app = createApp({
    dbPath: ":memory:",
    apiKey: "test-key",
    from: "Matchaccino <desk@example.com>",
    emailClient: async (message, key) => {
      calls.push({ message, key });
      return { id: "test-provider-id" };
    },
    ...options,
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    app.locals.close();
  });
  return {
    calls,
    base,
    post: async (data, headers = {}) => {
      const res = await fetch(`${base}/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(data),
      });
      return { status: res.status, body: await res.json() };
    },
  };
}
const note = (extra = {}) => ({
  id: randomUUID(),
  kind: "note",
  category: "IT Support",
  text: "Please help with the meeting room display.",
  ...extra,
});
const coffee = (extra = {}) => ({
  id: randomUUID(),
  kind: "coffee",
  strength: "Strong",
  when: "now",
  ...extra,
});
test("accepted note has correct category, full opening, text, and Sydney timestamp", async (t) => {
  const f = await fixture(t);
  const res = await f.post(note());
  assert.equal(res.status, 200);
  assert.equal(res.body.accepted, true);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].message.subject, "[Matchaccino] Note — IT Support");
  assert.match(f.calls[0].message.text, /I need IT support with…\nPlease help/);
  assert.match(f.calls[0].message.text, /Australia\/Sydney/);
});
test("coffee uses fixed details and a future Sydney preparation time", async (t) => {
  const f = await fixture(t, { now: () => Date.parse("2026-10-19T22:00Z") });
  const res = await f.post(
    coffee({
      when: "scheduled",
      date: "2026-10-20",
      time: "15:30",
      to: "attacker@example.com",
    }),
  );
  assert.equal(res.status, 200);
  assert.match(f.calls[0].message.text, /Coffee: Hot Cappuccino/);
  assert.match(f.calls[0].message.text, /03:30:00 pm AEDT/i);
  assert.equal(f.calls[0].message.to, undefined);
});
test("missing email credentials never simulate acceptance", async (t) => {
  const f = await fixture(t, { apiKey: "" });
  const status = await (await fetch(`${f.base}/api/status`)).json();
  assert.equal(status.emailConfigured, false);
  const res = await f.post(note());
  assert.equal(res.status, 503);
  assert.equal(res.body.accepted, undefined);
  assert.equal(f.calls.length, 0);
});
test("validation rejects empty, oversized, invalid-category and bot notes", async (t) => {
  const f = await fixture(t);
  for (const payload of [
    note({ text: "  " }),
    note({ text: "a".repeat(3001) }),
    note({ category: "Other" }),
    note({ website: "spam" }),
    note({ id: "invalid" }),
  ])
    assert.equal((await f.post(payload)).status, 400);
  assert.equal(f.calls.length, 0);
});
test("past coffee times and DST gaps are rejected", async (t) => {
  const f = await fixture(t, { now: () => Date.parse("2026-10-20T00:00Z") });
  for (const data of [
    coffee({ when: "scheduled", date: "2026-10-19", time: "12:00" }),
    coffee({ when: "scheduled", date: "2026-10-04", time: "02:30" }),
    coffee({ strength: "Double" }),
  ])
    assert.equal((await f.post(data)).status, 400);
  assert.equal(f.calls.length, 0);
});
test("identical retries return accepted without another provider call; changed ID contents conflict", async (t) => {
  const f = await fixture(t);
  const data = note();
  assert.equal((await f.post(data)).status, 200);
  assert.equal((await f.post(data)).body.accepted, true);
  assert.equal(f.calls.length, 1);
  assert.equal((await f.post({ ...data, text: "Different" })).status, 409);
});
test("provider failures remain errors; retries retain payload timestamp and idempotency key", async (t) => {
  let clock = Date.parse("2026-10-20T00:00Z");
  const calls = [];
  const f = await fixture(t, {
    now: () => clock,
    emailClient: async (message, key) => {
      calls.push({ message, key });
      if (calls.length === 1) throw new Error("provider offline");
      return { id: "accepted" };
    },
  });
  const data = note();
  assert.equal((await f.post(data)).status, 502);
  clock += 120000;
  assert.equal((await f.post(data)).body.accepted, true);
  assert.deepEqual(calls[0], calls[1]);
});
test("concurrent duplicate sends are blocked", async (t) => {
  let resolve;
  const pending = new Promise((r) => (resolve = r));
  const f = await fixture(t, {
    emailClient: async () => {
      await pending;
      return { id: "accepted" };
    },
  });
  const data = note();
  const first = f.post(data);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal((await f.post(data)).status, 409);
  resolve();
  assert.equal((await first).status, 200);
});
test("uncertain submissions cannot be retried beyond provider idempotency window", async (t) => {
  let clock = Date.parse("2026-10-20T00:00Z");
  const f = await fixture(t, {
    now: () => clock,
    emailClient: async () => {
      throw new Error("unknown");
    },
  });
  const data = note();
  assert.equal((await f.post(data)).status, 502);
  clock += 24 * 60 * 60 * 1000;
  assert.equal((await f.post(data)).status, 409);
});
test("same-origin and rate protections are enforced", async (t) => {
  const f = await fixture(t, { rateLimit: 2 });
  assert.equal(
    (await f.post(note(), { Origin: "https://untrusted.example" })).status,
    403,
  );
  assert.equal((await f.post(note())).status, 200);
  assert.equal((await f.post(coffee())).status, 200);
  assert.equal((await f.post(note())).status, 429);
});
test("Sydney conversion respects summer, winter, and invalid dates", () => {
  assert.equal(
    sydneyInstant("2026-10-20", "09:00").toISOString(),
    "2026-10-19T22:00:00.000Z",
  );
  assert.equal(
    sydneyInstant("2026-06-20", "09:00").toISOString(),
    "2026-06-19T23:00:00.000Z",
  );
  assert.equal(sydneyInstant("2026-10-04", "02:30"), null);
  assert.equal(sydneyInstant("2026-02-30", "10:00"), null);
});
test("daily inspiration is stable within a Sydney day and rolls at local midnight", () => {
  const a = dailyFortune(new Date("2026-10-19T14:00Z"));
  const b = dailyFortune(new Date("2026-10-20T12:59Z"));
  assert.deepEqual(a, b);
  const c = dailyFortune(new Date("2026-10-20T13:00Z"));
  assert.notEqual(a.day, c.day);
  assert.deepEqual(a, dailyFortune(new Date("2026-10-19T14:00Z")));
  assert.equal(sydneyParts(new Date("2026-10-20T13:00Z")).date, "2026-10-21");
});

test("server rejects any recipient outside Maddy’s two inboxes", async (t) => {
  const f = await fixture(t, { recipient: "unapproved@example.com" });
  assert.equal((await f.post(note())).status, 503);
  assert.equal(f.calls.length, 0);
});
test("Resend sends to the server-selected inbox and ignores a message recipient override", async (t) => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...JSON.parse(options.body) });
    return { ok: true, json: async () => ({ id: "accepted" }) };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  for (const recipient of ["maddykittyw@gmail.com", "terrinobb@gmail.com"]) {
    await resendEmail(
      { subject: "Test", text: "Request", to: ["unapproved@example.com"] },
      "test-key",
      { apiKey: "test", from: "desk@example.com", recipient },
    );
    assert.deepEqual(requests.at(-1).to, [recipient]);
  }
  await assert.rejects(() =>
    resendEmail({ text: "Request" }, "test-key", {
      apiKey: "test",
      from: "desk@example.com",
      recipient: "unapproved@example.com",
    }),
  );
  assert.equal(requests.length, 2);
});

test("a configured Pages origin can preflight and submit; other origins stay blocked", async (t) => {
  const f = await fixture(t, { appOrigin: "https://aplusdg.github.io" });
  const allowed = await fetch(`${f.base}/api/requests`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://aplusdg.github.io",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  assert.equal(allowed.status, 204);
  assert.equal(
    allowed.headers.get("access-control-allow-origin"),
    "https://aplusdg.github.io",
  );
  assert.equal(
    (await f.post(note(), { Origin: "https://aplusdg.github.io" })).status,
    200,
  );
  assert.equal(
    (await f.post(note(), { Origin: "https://untrusted.example" })).status,
    403,
  );
  const denied = await fetch(`${f.base}/api/requests`, {
    method: "OPTIONS",
    headers: { Origin: "https://untrusted.example" },
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
});
