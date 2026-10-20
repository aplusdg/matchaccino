export const TIMEZONE = "Australia/Sydney";
export const prompts = [
  "I want to review…",
  "I need IT support with…",
  "May I please have…",
];
export const categories = ["Review", "IT Support", "Request"];
export const coffeeTypes = ["Cappuccino", "Flat white", "Latte", "Long black"];
export const temperatures = ["Hot", "Warm", "Iced"];
export const iceLevels = ["Regular ice", "Less ice", "No ice"];
export function coffeeDescription(type = "Cappuccino", temperature = "Hot") {
  return `${temperature} ${type}`;
}
export function sydneyParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}
export function sydneyInstant(date, time) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
    !/^\d{2}:\d{2}$/.test(time || "")
  )
    return null;
  const wall = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(wall)) return null;
  let instant = wall;
  for (let i = 0; i < 3; i++) {
    const p = sydneyParts(new Date(instant));
    instant += wall - Date.parse(`${p.date}T${p.time}:00Z`);
  }
  const p = sydneyParts(new Date(instant));
  return p.date === date && p.time === time ? new Date(instant) : null;
}
export function formatSydney(date = new Date(), options = {}) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "long",
    ...options,
  }).format(date);
}
const colours = [
  ["Sage green", "#8b9b79"],
  ["Warm terracotta", "#ba7a5e"],
  ["Cornflower blue", "#829bb2"],
  ["Honey gold", "#c4a16c"],
  ["Soft lavender", "#a098b0"],
  ["Forest green", "#526957"],
  ["Coffee brown", "#8a6a50"],
];
const fortunes = [
  [
    "Giving a promising idea a little room to grow.",
    "Saying yes before checking your calendar.",
    "A small beginning can make a rather lovely difference. Start with the idea you keep coming back to.",
  ],
  [
    "Making the complicated feel wonderfully simple.",
    "Perfecting something that only needs a first draft.",
    "Your next good idea might need less thinking and one more sip. Leave a little space for it.",
  ],
  [
    "A thoughtful conversation and a fresh perspective.",
    "Sending that reply before your coffee.",
    "A well-timed question can open more doors than a very long meeting. Ask the curious one.",
  ],
  [
    "Connecting the dots on a half-finished idea.",
    "Opening twelve more tabs for clarity.",
    "Clarity has a habit of arriving when you make a little room. One thing at a time looks good on you.",
  ],
  [
    "Sharing an idea before it feels entirely ready.",
    "Mistaking a busy day for a productive one.",
    "A fresh pair of eyes could be just the magic your idea needs. Good things are rarely made alone.",
  ],
  [
    "Turning a small detail into something memorable.",
    "Overthinking a perfectly good decision.",
    "Trust your eye for the little things. Today, the finishing touch might be the beginning of something.",
  ],
  [
    "Clearing the desk and making room for inspiration.",
    "Rushing the part that deserves a pause.",
    "There is a good rhythm to be found today. A little focus, a little breathing room, and perhaps a cappuccino.",
  ],
];
export function dailyFortune(date = new Date()) {
  const day = sydneyParts(date).date;
  let seed = 2166136261;
  for (const c of `1976-10-22:${day}`)
    seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  const [good, less, message] = fortunes[seed % fortunes.length];
  const [colour, swatch] = colours[(seed >>> 4) % colours.length];
  return {
    day,
    good,
    less,
    message,
    colour,
    swatch,
    number: ((seed >>> 8) % 99) + 1,
  };
}
