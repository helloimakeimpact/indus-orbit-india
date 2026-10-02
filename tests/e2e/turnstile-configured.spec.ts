import { expect, test } from "@playwright/test";
// Opt-in: run against an isolated preview started with a synthetic public
// sitekey. The official SDK and all persistence are intercepted.
test("@public @turnstile configured forms verify automatically and retain a draft after server rejection", async ({
  page,
}) => {
  test.skip(
    process.env.PLAYWRIGHT_TURNSTILE_CONFIGURED !== "1",
    "Requires isolated configured verification preview",
  );
  let scriptLoads = 0;
  let attempts = 0;
  let resetCalls = 0;
  await page.exposeFunction("recordTurnstileReset", () => {
    resetCalls += 1;
  });
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js**", async (route) => {
    scriptLoads += 1;
    await route.fulfill({
      contentType: "application/javascript",
      body: `window.turnstile={render:(container,options)=>{container.dataset.action=options.action;window.testTurnstileOptions=options;options.callback('synthetic-single-use-token');return 'widget';},remove:()=>{},reset:()=>{window.recordTurnstileReset();window.testTurnstileOptions['expired-callback']();}};window.indusOrbitCaptchaReady();`,
    });
  });
  await page.route("**/functions/v1/public-form-submit", async (route) => {
    attempts += 1;
    expect(route.request().postDataJSON().captchaToken).toBe("synthetic-single-use-token");
    await route.fulfill({ status: 403, json: { ok: false, code: "verification_failed" } });
  });
  await page.goto("/contact");
  expect(scriptLoads).toBe(0);
  await page.getByLabel("Your name", { exact: true }).fill("Synthetic builder");
  await page.getByLabel("Email", { exact: true }).fill("builder@example.test");
  await page.getByLabel("Message", { exact: true }).fill("An unsent draft remains available.");
  await expect(page.getByRole("button", { name: "Verify you’re human" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Send to the orbit" })).toBeEnabled();
  await page.getByRole("button", { name: "Send to the orbit" }).click();
  await expect(page.getByRole("button", { name: "Send to the orbit" })).toBeDisabled();
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    "An unsent draft remains available.",
  );
  expect(scriptLoads).toBe(1);
  expect(attempts).toBe(1);
  expect(resetCalls).toBeGreaterThanOrEqual(1);
});
