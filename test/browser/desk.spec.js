import { test, expect } from "@playwright/test";
async function acceptApi(page) {
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { emailConfigured: true } }),
  );
  await page.route("**/api/requests", (route) =>
    route.fulfill({
      json: { accepted: true, id: JSON.parse(route.request().postData()).id },
    }),
  );
}
test("desktop shows a shared 3D desk without runtime errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Matchaccino" }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(2);
  await expect(page.getByText("Email setup needed")).toBeVisible();
  await page.waitForTimeout(1800);
  await page.screenshot({
    path: "/tmp/matchaccino-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  for (const feature of await page.locator(".feature").all()) {
    const box = await feature.boundingBox();
    expect(box.y).toBeLessThan(450);
  }
});
test("strength, full preparation, schedule and confirmed coffee request", async ({
  page,
}) => {
  await acceptApi(page);
  let payload;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/requests")) payload = r.postDataJSON();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Strong", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Strong", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Make a little coffee" }).click();
  await expect(page.getByText("A little espresso…")).toBeVisible();
  await expect(page.getByText("Made just the way you like it")).toBeVisible({
    timeout: 6000,
  });
  await page
    .getByRole("button", { name: "Choose a time", exact: true })
    .click();
  await page.getByLabel("Date", { exact: true }).fill("2099-10-22");
  await page.getByLabel("Time", { exact: true }).fill("15:30");
  await page.getByRole("button", { name: "Send my coffee request" }).click();
  await expect(
    page.getByText("Your coffee request is with Maddy."),
  ).toBeVisible();
  expect(payload).toMatchObject({
    kind: "coffee",
    strength: "Strong",
    when: "scheduled",
    date: "2099-10-22",
    time: "15:30",
  });
});
test("changing prompts retains content; failed send and refresh preserve draft", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "I want to review…" }).click();
  await page
    .getByRole("textbox", { name: "Your request to Maddy" })
    .fill("The new homepage\nEspecially the typography.");
  await page.getByRole("button", { name: "Change opening" }).click();
  await page.getByRole("button", { name: "I need IT support with…" }).click();
  await expect(page.getByRole("textbox")).toHaveValue(
    "The new homepage\nEspecially the typography.",
  );
  await page.getByRole("button", { name: "Send note", exact: true }).click();
  await expect(
    page.getByText("Sending isn’t configured yet.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveValue(
    "The new homepage\nEspecially the typography.",
  );
  await page.reload();
  await expect(page.getByRole("textbox")).toHaveValue(
    "The new homepage\nEspecially the typography.",
  );
});
test("tear threshold cancels short drags and sends once after a deliberate drag", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await acceptApi(page);
  let sends = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/requests")) sends++;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "May I please have…" }).click();
  await page.getByRole("textbox").fill("The design files before our meeting.");
  const corner = page.locator(".tear-corner");
  await corner.hover();
  let box = await corner.boundingBox();
  await page.mouse.move(box.x + 15, box.y + 15);
  await page.mouse.down();
  await page.mouse.move(box.x + 45, box.y + 15, { steps: 5 });
  await page.mouse.up();
  expect(sends).toBe(0);
  await expect(page.getByRole("textbox")).toHaveValue(
    "The design files before our meeting.",
  );
  box = await corner.boundingBox();
  await page.mouse.move(box.x + 15, box.y + 15);
  await page.mouse.down();
  await page.mouse.move(box.x + 150, box.y + 35, { steps: 12 });
  await expect(page.getByText("Release to send")).toBeVisible();
  await page.mouse.up();
  await expect(page.getByText("Your note is with Maddy.")).toBeVisible();
  expect(sends).toBe(1);
  await expect(
    page.getByRole("button", { name: "I want to review…" }),
  ).toBeVisible({ timeout: 4000 });
});
test("daily fortune is stable after reload and explicitly entertainment", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Draw today’s fortune", exact: true })
    .click();
  await expect(page.locator(".fortune-slip")).toBeVisible({ timeout: 6000 });
  const text = await page.locator(".fortune-slip").innerText();
  await expect(
    page.getByText("Not almanac guidance.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Draw today’s fortune", exact: true })
    .click();
  await expect(page.locator(".fortune-slip")).toBeVisible({ timeout: 6000 });
  expect(await page.locator(".fortune-slip").innerText()).toBe(text);
});
test("mobile touch forms, note keyboard, and fortune stay on one page", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await acceptApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Strong", exact: true }).tap();
  await page.getByRole("button", { name: "Send my coffee request" }).tap();
  await expect(
    page.getByText("Your coffee request is with Maddy."),
  ).toBeVisible();
  await page.getByRole("button", { name: "I want to review…" }).tap();
  await page.getByRole("textbox").fill("A mobile note.");
  await page.getByRole("button", { name: "Send note", exact: true }).tap();
  await expect(page.getByText("Your note is with Maddy.")).toBeVisible();
  await page
    .getByRole("button", { name: "Draw today’s fortune", exact: true })
    .tap();
  await expect(page.locator(".fortune-slip")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(new URL(page.url()).pathname).toBe("/");
  await page.screenshot({
    path: "/tmp/matchaccino-mobile.png",
    fullPage: true,
  });
  await context.close();
});
test("WebGL fallback preserves keyboard-accessible forms", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (String(type).includes("webgl")) return null;
      return original.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await expect(page.locator(".fallback-cup")).toBeVisible();
  await expect(page.locator(".fallback-holder")).toBeVisible();
  await page.getByRole("button", { name: "I want to review…" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox")).toBeFocused();
  await page.getByRole("textbox").fill("Keyboard works.");
  await expect(
    page.getByRole("button", { name: "Send note", exact: true }),
  ).toBeEnabled();
});
test("failed provider response keeps the note and retries with the same submission ID", async ({
  page,
}) => {
  const ids = [];
  await page.route("**/api/requests", (route) => {
    ids.push(route.request().postDataJSON().id);
    return ids.length === 1
      ? route.fulfill({
          status: 502,
          json: {
            error:
              "The email service is temporarily unavailable. Please retry.",
          },
        })
      : route.fulfill({ json: { accepted: true } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "I need IT support with…" }).click();
  await page.getByRole("textbox").fill("Please check my monitor.");
  await page.getByRole("button", { name: "Send note", exact: true }).click();
  await expect(
    page.getByText(
      "The email service is temporarily unavailable. Please retry.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveValue(
    "Please check my monitor.",
  );
  await page.getByRole("button", { name: "Send note", exact: true }).click();
  await expect(page.getByText("Your note is with Maddy.")).toBeVisible();
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
});
test("touch corner drag sends a note without scrolling or duplicating", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await acceptApi(page);
  let sends = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/requests")) sends++;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "May I please have…" }).tap();
  await page.getByRole("textbox").fill("A touch gesture note.");
  const corner = page.locator(".tear-corner");
  await corner.scrollIntoViewIfNeeded();
  const box = await corner.boundingBox();
  const session = await context.newCDPSession(page);
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= 12; i++)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + i * 11, y: y + i }],
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.getByText("Your note is with Maddy.")).toBeVisible();
  expect(sends).toBe(1);
  await context.close();
});

test("all three primary actions fit together on a standard desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  for (const name of [
    "Send my coffee request",
    "Send note",
    "Draw today’s fortune",
  ]) {
    const box = await page
      .getByRole("button", { name, exact: true })
      .boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(900);
  }
});
test("expanded writing can fold back to the desk without losing a saved note", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "I want to review…" }).click();
  await page
    .getByRole("textbox")
    .fill("A longer thought, with room to breathe.\nAnd a second line.");
  await expect(page.getByText("Saved on this device")).toBeVisible();
  expect(
    (await page.getByRole("textbox").boundingBox()).height,
  ).toBeGreaterThan(170);
  await page.getByRole("button", { name: "Back to desk", exact: true }).click();
  await expect
    .poll(async () => (await page.locator(".notepad").boundingBox()).height)
    .toBeLessThan(280);
  await expect(page.getByRole("textbox")).toHaveValue(
    "A longer thought, with room to breathe.\nAnd a second line.",
  );
  await page.getByRole("button", { name: "Keep writing", exact: true }).click();
  await expect(page.getByRole("textbox")).toBeFocused();
  await expect
    .poll(async () => (await page.locator(".notepad").boundingBox()).height)
    .toBeGreaterThan(350);
});
test("fortune reveal and fold preserve keyboard focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Draw today’s fortune", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  const result = page.getByRole("region", {
    name: "Today's daily inspiration",
  });
  await expect(result).toBeFocused();
  await page.getByRole("button", { name: "Fold fortune slip" }).click();
  await expect(
    page.getByRole("button", { name: "Read today’s fortune", exact: true }),
  ).toBeFocused();
});
