import assert from "node:assert/strict";
import express from "express";
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";

// Serve exactly the built Pages artifact under the repository subdirectory.
const app = express();
app.use("/matchaccino", express.static(resolve("site")));
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  await page.route("https://formsubmit.co/**", (route) =>
    route.abort("blockedbyclient"),
  );
  // Explicitly exercise the disconnected state without contacting a real inbox.
  await page.route("**/email-settings.json", (route) =>
    route.fulfill({ json: { formEndpoint: "" } }),
  );
  const errors = [];
  const failed = [];
  const apiRequests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });
  page.on("request", (r) => {
    if (r.url().includes("/api/")) apiRequests.push(r.url());
  });
  const url = `http://127.0.0.1:${server.address().port}/matchaccino/`;
  await page.goto(url);
  await page.getByRole("heading", { name: "Coffee, your way" }).waitFor();
  await page.getByText("Email setup needed").waitFor();
  await page.getByRole("button", { name: "Strong", exact: true }).click();
  await page.getByRole("button", { name: "Make a little coffee" }).click();
  await page.getByText("Made just the way you like it").waitFor();
  await page.getByRole("button", { name: "I want to review…" }).click();
  await page
    .getByRole("textbox")
    .fill("My request must survive an unconfigured send.");
  await page.getByRole("button", { name: "Send note", exact: true }).click();
  await page
    .getByText("Sending isn’t configured yet.", { exact: false })
    .waitFor();
  assert.equal(
    await page.getByRole("textbox").inputValue(),
    "My request must survive an unconfigured send.",
  );
  await page
    .getByRole("button", { name: "Draw today’s fortune", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Today's daily inspiration" })
    .waitFor();
  await page.screenshot({ path: "/tmp/matchaccino-pages.png", fullPage: true });
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  assert.deepEqual(apiRequests, []);
  // Exercise the currently configured branch-based Pages entry as well.
  const legacy = await browser.newPage({ reducedMotion: "reduce" });
  await legacy.route("https://formsubmit.co/**", (route) =>
    route.abort("blockedbyclient"),
  );
  const sourceIndex = await readFile("index.html", "utf8");
  await legacy.route("https://aplusdg.github.io/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/matchaccino/")
      return route.fulfill({ contentType: "text/html", body: sourceIndex });
    const localPath = path.replace("/matchaccino/site/", "/matchaccino/");
    const response = await legacy.request.get(
      `http://127.0.0.1:${server.address().port}${localPath}`,
    );
    return route.fulfill({ response });
  });
  await legacy.goto("https://aplusdg.github.io/matchaccino/");
  await legacy.waitForURL("https://aplusdg.github.io/matchaccino/site/");
  await legacy.getByRole("heading", { name: "Coffee, your way" }).waitFor();
  await legacy
    .getByRole("button", { name: "Draw today’s fortune", exact: true })
    .click();
  await legacy
    .getByRole("region", { name: "Today's daily inspiration" })
    .waitFor();
  const connected = await browser.newPage({ reducedMotion: "reduce" });
  let notification;
  await connected.route("https://formsubmit.co/**", (route) => {
    assert.equal(
      route.request().url(),
      "https://formsubmit.co/ajax/terrinobb@gmail.com",
    );
    notification = route.request().postDataJSON();
    return route.fulfill({ json: { success: "true" } });
  });
  await connected.goto(url);
  await connected.getByText("Email service configured").waitFor();
  await connected.getByRole("button", { name: "May I please have…" }).click();
  await connected
    .getByRole("textbox")
    .fill("Static artifact email test (mock provider).");
  await connected
    .getByRole("button", { name: "Send note", exact: true })
    .click();
  await connected.getByText("Your note is with Maddy.").waitFor();
  assert.ok(notification.message.includes("Static artifact email test"));
  assert.equal(notification._captcha, "false");
  console.log(
    "Pages artifact passed: assets, both publishing paths, disconnected drafts, and the configured FormSubmit delivery flow (mocked).",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
