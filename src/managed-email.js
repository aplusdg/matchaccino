import {
  categories,
  prompts,
  coffeeTypes,
  temperatures,
  iceLevels,
  coffeeDescription,
  sydneyInstant,
  formatSydney,
} from "./shared.js";
const memory = new Map();
export const isFormEndpoint = (url) =>
  /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(url || "");
const uncertain =
  "Delivery could not be confirmed. Your draft is safe. Please check with Maddy before creating another request.";
function load(id, storage) {
  try {
    return (
      JSON.parse(storage.getItem(`matchaccino-send-${id}`)) || memory.get(id)
    );
  } catch {
    return memory.get(id);
  }
}
function save(id, record, storage) {
  memory.set(id, record);
  try {
    storage.setItem(`matchaccino-send-${id}`, JSON.stringify(record));
  } catch {}
}
function formatTime(date) {
  return `${formatSydney(date, { year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })} (Australia/Sydney)`;
}
export async function sendManagedRequest(
  payload,
  endpoint,
  storage = localStorage,
) {
  if (!isFormEndpoint(endpoint))
    throw new Error(
      "The email form is not connected. Your request has not been sent.",
    );
  if (!/^[a-f0-9-]{36}$/i.test(payload.id || ""))
    throw new Error("This request needs a valid submission ID.");
  if (payload.website) throw new Error("Unable to accept this request.");
  let details, subject;
  if (payload.kind === "coffee") {
    if (
      !coffeeTypes.includes(payload.coffeeType) ||
      !temperatures.includes(payload.temperature) ||
      !["Regular", "Strong"].includes(payload.strength) ||
      !["now", "scheduled"].includes(payload.when) ||
      (payload.temperature === "Iced" && !iceLevels.includes(payload.ice))
    )
      throw new Error("Choose valid coffee options.");
    const instant =
      payload.when === "scheduled"
        ? sydneyInstant(payload.date, payload.time)
        : null;
    if (payload.when === "scheduled" && (!instant || instant <= new Date()))
      throw new Error("Choose a valid future date and time in Sydney.");
    const when = instant ? formatTime(instant) : "Now";
    subject = `[Matchaccino] Coffee — ${coffeeDescription(payload.coffeeType, payload.temperature)} — ${payload.strength} — ${when}`;
    details = `Coffee: ${coffeeDescription(payload.coffeeType, payload.temperature)}\nStrength: ${payload.strength}${payload.temperature === "Iced" ? `\nIce: ${payload.ice}` : ""}\nRequested preparation time: ${when}`;
  } else if (
    payload.kind === "note" &&
    categories.includes(payload.category) &&
    typeof payload.text === "string" &&
    payload.text.trim() &&
    payload.text.length <= 3000
  ) {
    subject = `[Matchaccino] Note — ${payload.category}`;
    details = `Request category: ${payload.category}\nComplete request:\n${prompts[categories.indexOf(payload.category)]}\n${payload.text.trim()}`;
  } else
    throw new Error("Choose an opening and add your request before sending.");
  const fingerprint = Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(payload)),
      ),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  const existing = load(payload.id, storage);
  if (existing && existing.fingerprint !== fingerprint)
    throw new Error("This request changed. Please create a fresh request.");
  if (existing?.status === "accepted")
    return { accepted: true, id: payload.id };
  if (existing?.status === "uncertain" || existing?.status === "pending")
    throw new Error(uncertain);
  const submittedAt = existing?.submittedAt || Date.now();
  const record = { status: "pending", fingerprint, submittedAt };
  save(payload.id, record, storage);
  let response, result;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: subject,
        subject,
        requested_by: "Kaichi",
        message: `Requested by: Kaichi\n${details}\n\nSubmission timestamp: ${formatTime(new Date(submittedAt))}\nRequest ID: ${payload.id}`,
        _gotcha: payload.website || "",
      }),
      signal: AbortSignal.timeout(25000),
    });
    result = await response.json();
  } catch {
    save(payload.id, { ...record, status: "uncertain" }, storage);
    throw new Error(uncertain);
  }
  if (response.ok && result.ok === true) {
    save(payload.id, { ...record, status: "accepted" }, storage);
    return { accepted: true, id: payload.id };
  }
  if (response.status >= 400 && response.status < 500) {
    save(payload.id, { ...record, status: "failed" }, storage);
    throw new Error(
      response.status === 429
        ? "The email form is busy. Please wait a little before retrying."
        : "The email form did not accept this request. Maddy may need to activate or check the form. Your draft is still here.",
    );
  }
  save(payload.id, { ...record, status: "uncertain" }, storage);
  throw new Error(uncertain);
}
