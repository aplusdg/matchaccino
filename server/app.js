import express from "express";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  categories,
  coffeeTypes,
  temperatures,
  iceLevels,
  coffeeDescription,
  prompts,
  sydneyInstant,
  formatSydney,
} from "../src/shared.js";

const RECIPIENTS = ["maddykittyw@gmail.com", "terrinobb@gmail.com"];
const windowMs = 15 * 60 * 1000;
const timestamp = (date) =>
  `${formatSydney(date, { year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short" })} (Australia/Sydney)`;
export function validate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("Please send a valid request.");
  if (typeof body.id !== "string" || !/^[a-f0-9-]{36}$/i.test(body.id))
    throw new Error(
      "This request needs a valid submission ID. Refresh and try again.",
    );
  if (body.website) throw new Error("Unable to accept this request.");
  if (body.kind === "coffee") {
    const coffeeType = body.coffeeType ?? "Cappuccino";
    const temperature = body.temperature ?? "Hot";
    const ice =
      temperature === "Iced" ? (body.ice ?? "Regular ice") : undefined;
    if (
      !coffeeTypes.includes(coffeeType) ||
      !temperatures.includes(temperature) ||
      (ice && !iceLevels.includes(ice))
    )
      throw new Error("Choose a valid coffee, temperature, and ice level.");
    if (!["Regular", "Strong"].includes(body.strength))
      throw new Error("Choose Regular or Strong coffee.");
    if (!["now", "scheduled"].includes(body.when))
      throw new Error("Choose when you would like your coffee.");
    let instant;
    if (body.when === "scheduled") {
      instant = sydneyInstant(body.date, body.time);
      if (!instant) throw new Error("Choose a valid date and time in Sydney.");
    }
    return {
      kind: "coffee",
      coffeeType,
      temperature,
      ...(ice ? { ice } : {}),
      strength: body.strength,
      when: body.when,
      ...(instant
        ? { date: body.date, time: body.time, instant: instant.toISOString() }
        : {}),
    };
  }
  if (body.kind === "note") {
    if (!categories.includes(body.category))
      throw new Error("Choose an opening for your note.");
    if (typeof body.text !== "string" || !body.text.trim())
      throw new Error("Add a little detail before sending your note.");
    if (body.text.length > 3000)
      throw new Error("Please keep your note to 3,000 characters.");
    return { kind: "note", category: body.category, text: body.text.trim() };
  }
  throw new Error("Choose a coffee request or a note.");
}
export function messageFor(data, submittedAt) {
  const requestedTime =
    data.when === "scheduled" ? timestamp(new Date(data.instant)) : "Now";
  return data.kind === "coffee"
    ? {
        subject: `[Matchaccino] Coffee — ${coffeeDescription(data.coffeeType, data.temperature)} — ${data.strength} — ${data.when === "now" ? "Now" : `${data.date} ${data.time} Sydney`}`,
        text: `A coffee request from Kaichi\n\nRequested by: Kaichi\nCoffee: ${coffeeDescription(data.coffeeType, data.temperature)}${data.ice ? `\nIce: ${data.ice}` : ""}\nStrength: ${data.strength}\nRequested preparation time: ${requestedTime}\nSubmission timestamp: ${timestamp(new Date(submittedAt))}\n\nSent with a little care, from Matchaccino.`,
      }
    : {
        subject: `[Matchaccino] Note — ${data.category}`,
        text: `A note from Kaichi\n\nRequested by: Kaichi\nRequest category: ${data.category}\nSelected opening: ${prompts[categories.indexOf(data.category)]}\n\nComplete request:\n${prompts[categories.indexOf(data.category)]}\n${data.text}\n\nSubmission timestamp: ${timestamp(new Date(submittedAt))}\n\nSent with a little care, from Matchaccino.`,
      };
}
export async function resendEmail(
  message,
  key,
  { apiKey, from, recipient = RECIPIENTS[0] },
) {
  if (!RECIPIENTS.includes(recipient))
    throw new Error("Recipient must be one of Maddy’s configured addresses.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: JSON.stringify({ ...message, from, to: [recipient] }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok || !result.id)
    throw new Error("Email provider did not confirm acceptance.");
  return { id: result.id };
}
export function createApp({
  dbPath = ".data/requests.sqlite",
  apiKey = process.env.RESEND_API_KEY,
  from = process.env.EMAIL_FROM,
  recipient = process.env.REQUEST_RECIPIENT || RECIPIENTS[0],
  appOrigin = process.env.APP_ORIGIN || "",
  emailClient,
  now = () => Date.now(),
  rateLimit = 10,
} = {}) {
  if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(
    "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, digest TEXT NOT NULL, status TEXT NOT NULL, submitted_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, provider_id TEXT);",
  );
  const app = express();
  app.disable("x-powered-by");
  const ready = Boolean(
    apiKey &&
      from &&
      RECIPIENTS.includes(recipient) &&
      /^[^\r\n]+@[^\s<>]+\.[^\s<>]+>?$/.test(from),
  );
  const deliver =
    emailClient ||
    ((message, key) => resendEmail(message, key, { apiKey, from, recipient }));
  const limits = new Map();
  app.locals.close = () => db.close();
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "X-Frame-Options": "DENY",
    });
    next();
  });
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    const origin = req.get("origin");
    let permitted = !origin;
    if (origin) {
      try {
        permitted =
          new URL(origin).host === req.get("host") ||
          (appOrigin && origin === appOrigin);
      } catch {}
    }
    if (origin && appOrigin && origin === appOrigin) {
      res.set("Access-Control-Allow-Origin", origin);
      res.vary("Origin");
      res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS")
      return permitted
        ? res.sendStatus(204)
        : res
            .status(403)
            .json({ error: "Please send your request from Matchaccino." });
    if (!permitted)
      return res
        .status(403)
        .json({ error: "Please send your request from Matchaccino." });
    next();
  });
  app.get("/api/status", (_req, res) => res.json({ emailConfigured: ready }));
  app.use("/api", express.json({ limit: "16kb" }));
  app.post("/api/requests", async (req, res) => {
    if (!req.is("application/json"))
      return res.status(415).json({ error: "Please use a JSON request." });
    const ip = req.ip;
    const current = now();
    for (const [k, v] of limits)
      if (current - v.start >= windowMs) limits.delete(k);
    let limit = limits.get(ip);
    if (!limit) {
      limit = { start: current, count: 0 };
      limits.set(ip, limit);
    }
    if (++limit.count > rateLimit) {
      res.set(
        "Retry-After",
        String(Math.ceil((windowMs - (current - limit.start)) / 1000)),
      );
      return res.status(429).json({
        error:
          "A few too many requests. Please take a little break and try again in 15 minutes.",
      });
    }
    let data;
    try {
      data = validate(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    const id = req.body.id;
    const digest = createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex");
    const existing = db.prepare("SELECT * FROM requests WHERE id=?").get(id);
    if (existing && existing.digest !== digest)
      return res.status(409).json({
        error: "This submission changed. Please make a fresh request.",
      });
    if (existing?.status === "accepted")
      return res.json({ accepted: true, id });
    if (existing?.status === "sending" && current - existing.updated_at < 30000)
      return res.status(409).json({
        error:
          "Your request is already sending. Please wait a moment before retrying.",
      });
    if (!ready)
      return res.status(503).json({
        error:
          "Sending isn’t configured yet. Maddy needs to connect the email service. Your request has not been sent.",
      });
    if (
      !existing &&
      data.kind === "coffee" &&
      data.when === "scheduled" &&
      new Date(data.instant).getTime() <= current
    )
      return res
        .status(400)
        .json({ error: "Choose a future date and time in Sydney." });
    // Resend retains provider idempotency keys for 24 hours. Never re-send an uncertain request after that window.
    if (existing && current - existing.submitted_at > 23 * 60 * 60 * 1000)
      return res.status(409).json({
        error:
          "This request is over a day old. Please check with Maddy before creating a new request.",
      });
    const submittedAt = existing?.submitted_at ?? current;
    db.prepare(
      "INSERT INTO requests (id,digest,status,submitted_at,updated_at) VALUES (?,?,'sending',?,?) ON CONFLICT(id) DO UPDATE SET status='sending',updated_at=excluded.updated_at",
    ).run(id, digest, submittedAt, current);
    try {
      const result = await deliver(
        messageFor(data, submittedAt),
        `matchaccino/${id}`,
      );
      if (!result?.id) throw new Error("Acceptance unconfirmed");
      db.prepare(
        "UPDATE requests SET status='accepted',provider_id=?,updated_at=? WHERE id=?",
      ).run(result.id, now(), id);
      return res.json({ accepted: true, id });
    } catch {
      db.prepare(
        "UPDATE requests SET status='failed',updated_at=? WHERE id=?",
      ).run(now(), id);
      return res.status(502).json({
        error:
          "We couldn’t confirm the send. Your request is still here. Please try again; retries are protected against duplicates.",
      });
    }
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "That endpoint does not exist." }),
  );
  app.use((error, _req, res, next) => {
    if (!error) return next();
    res.status(error.status || 500).json({
      error:
        error.type === "entity.too.large"
          ? "This request is too long. Please shorten it."
          : error instanceof SyntaxError
            ? "Please send valid JSON."
            : "Something went wrong. Please try again.",
    });
  });
  return app;
}
