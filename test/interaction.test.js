import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pageFold, pullProgress } from "../src/paper.js";
import { isFormEndpoint, sendManagedRequest } from "../src/managed-email.js";
function storage() {
  const values = new Map();
  return {
    getItem: (k) => values.get(k) || null,
    setItem: (k, v) => values.set(k, v),
  };
}
function note() {
  return {
    id: randomUUID(),
    kind: "note",
    category: "Request",
    text: "A carrot cake, please.",
  };
}
const endpoint = "https://formspree.io/f/testform";
test("diagonal folding clips the written face and reflects the lifted corner", () => {
  const fold = pageFold(300, 400, 150, 150);
  assert.equal(fold.front.length, 5);
  assert.deepEqual(fold.tip, [150, 250]);
  assert.ok(fold.back.some(([x, y]) => x === 150 && y === 250));
  assert.ok(!fold.front.some(([x, y]) => x === 300 && y === 400));
  assert.ok(pullProgress(300, 400, 150, 150) >= 100);
  assert.ok(pullProgress(300, 400, 20, 20) < 100);
});
test("one-axis and full-sheet folds stay finite, including the zero-drag case", () => {
  for (const [dx, dy] of [
    [0, 0],
    [80, 0],
    [0, 80],
    [300, 400],
    [450, 560],
  ]) {
    const fold = pageFold(300, 400, dx, dy);
    for (const point of [...fold.front, ...fold.back])
      assert.ok(point.every(Number.isFinite));
  }
});
test("managed email requires actual acceptance and suppresses confirmed duplicate sends", async (t) => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, data: JSON.parse(opts.body) });
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  t.after(() => (globalThis.fetch = original));
  const body = note();
  const store = storage();
  assert.equal(
    (await sendManagedRequest(body, endpoint, store)).accepted,
    true,
  );
  assert.equal(
    (await sendManagedRequest(body, endpoint, store)).accepted,
    true,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, endpoint);
  assert.match(calls[0].data.message, /A carrot cake, please/);
  assert.match(calls[0].data.message, /Australia\/Sydney/);
  assert.equal(calls[0].data.to, undefined);
});
test("unknown delivery is never called success or automatically sent again", async (t) => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw Error("connection lost");
  };
  t.after(() => (globalThis.fetch = original));
  const body = note(),
    store = storage();
  await assert.rejects(
    () => sendManagedRequest(body, endpoint, store),
    /could not be confirmed/,
  );
  await assert.rejects(
    () => sendManagedRequest(body, endpoint, store),
    /check with Maddy/,
  );
  assert.equal(calls, 1);
});
test("a known provider rejection allows retry with the draft intact", async (t) => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return {
      ok: calls > 1,
      status: calls > 1 ? 200 : 422,
      json: async () =>
        calls > 1 ? { ok: true } : { errors: ["inactive form"] },
    };
  };
  t.after(() => (globalThis.fetch = original));
  const body = note(),
    store = storage();
  await assert.rejects(
    () => sendManagedRequest(body, endpoint, store),
    /did not accept/,
  );
  assert.equal(
    (await sendManagedRequest(body, endpoint, store)).accepted,
    true,
  );
  assert.equal(calls, 2);
});
test("unapproved managed URLs are rejected before any request", async () => {
  assert.equal(isFormEndpoint(endpoint), true);
  for (const url of [
    "https://untrusted.example/f/test",
    "http://formspree.io/f/test",
    "https://formspree.io/f/test?to=elsewhere",
  ]) {
    assert.equal(isFormEndpoint(url), false);
    await assert.rejects(
      () => sendManagedRequest(note(), url, storage()),
      /not connected/,
    );
  }
});

test("FormSubmit accepts boolean or string confirmation and sends complete note details", async (t) => {
  const original = globalThis.fetch;
  t.after(() => (globalThis.fetch = original));
  for (const success of [true, "true"]) {
    let sent;
    globalThis.fetch = async (url, opts) => {
      assert.equal(url, "https://formsubmit.co/ajax/terrinobb@gmail.com");
      sent = JSON.parse(opts.body);
      return { ok: true, status: 200, json: async () => ({ success }) };
    };
    const payload = note();
    assert.equal(
      (
        await sendManagedRequest(
          payload,
          "https://formsubmit.co/ajax/terrinobb@gmail.com",
          storage(),
        )
      ).accepted,
      true,
    );
    assert.equal(sent._captcha, "false");
    assert.equal(sent._template, "table");
    assert.equal(sent._honey, "");
    assert.match(sent.message, /A carrot cake, please/);
    assert.ok(sent.message.includes(payload.id));
    assert.match(sent._subject, /Matchaccino.*Note/);
    assert.equal(sent.to, undefined);
  }
});

test("FormSubmit activation never counts as delivery and permits retry after confirmation", async (t) => {
  const original = globalThis.fetch;
  t.after(() => (globalThis.fetch = original));
  let calls = 0;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () =>
      ++calls === 1
        ? {
            success: "true",
            message: "Please activate your form. Check your inbox.",
          }
        : { success: "true", message: "Form submitted successfully" },
  });
  const payload = note(),
    store = storage();
  const url = "https://formsubmit.co/ajax/terrinobb@gmail.com";
  await assert.rejects(() => sendManagedRequest(payload, url, store), {
    code: "EMAIL_ACTIVATION_REQUIRED",
  });
  assert.equal((await sendManagedRequest(payload, url, store)).accepted, true);
  assert.equal((await sendManagedRequest(payload, url, store)).accepted, true);
  assert.equal(calls, 2);
});

test("FormSubmit recipient allowlist rejects redirects and other inboxes", () => {
  assert.equal(
    isFormEndpoint("https://formsubmit.co/ajax/maddykittyw@gmail.com"),
    true,
  );
  for (const url of [
    "https://formsubmit.co/ajax/other@example.com",
    "https://formsubmit.co/ajax/terrinobb@gmail.com?redirect=elsewhere",
    "http://formsubmit.co/ajax/terrinobb@gmail.com",
  ]) {
    assert.equal(isFormEndpoint(url), false);
  }
});
