// This URL is public configuration, never an email-provider credential.
const configuredOrigin = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/+$/,
  "",
);
const staticOnly =
  !configuredOrigin &&
  (import.meta.env.VITE_STATIC_SITE === "true" ||
    location.hostname.endsWith(".github.io"));
const notConfigured =
  "Sending isn’t configured yet. Maddy needs to connect the email service. Your request has not been sent.";

function endpoint(path) {
  if (configuredOrigin) return `${configuredOrigin}${path}`;
  return path;
}
export async function getEmailStatus() {
  if (staticOnly) return false;
  const response = await fetch(endpoint("/api/status"), {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return false;
  const status = await response.json();
  return status.emailConfigured === true;
}
export async function sendRequest(payload) {
  if (staticOnly) throw new Error(notConfigured);
  let response;
  try {
    response = await fetch(endpoint("/api/requests"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    if (error.name === "TimeoutError") throw error;
    throw new Error(
      "We couldn’t reach the email service. Your request is still here. Please try again.",
    );
  }
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(notConfigured);
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || "We couldn’t send this just yet. Please try again.",
    );
  if (data.accepted !== true)
    throw new Error(
      "Delivery could not be confirmed. Your request is still here.",
    );
  return data;
}
