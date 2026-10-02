import { expect, test } from "@playwright/test";

test("@public unconfigured verification keeps forms closed and contact details available", async ({
  page,
}) => {
  let unsafeInsert = false;
  let captchaLoaded = false;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      /\/rest\/v1\/(contact_submissions|newsletter_subscriptions)/.test(request.url())
    )
      unsafeInsert = true;
    if (request.url().startsWith("https://js.hcaptcha.com/")) captchaLoaded = true;
  });
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/contact");
  // The standard public regression build intentionally has no production sitekey.
  await expect(
    page.getByText("This form is temporarily unavailable. Please try again later.").first(),
  ).toBeVisible();
  await page.getByLabel("Your name", { exact: true }).fill("Synthetic builder");
  await page.getByLabel("Email", { exact: true }).fill("builder@example.test");
  await page.getByLabel("Message", { exact: true }).fill("An unsent draft remains available.");
  await expect(page.getByRole("button", { name: "Send to the orbit" })).toBeDisabled();
  await expect(
    page.getByRole("link", { name: "hello@indusorbit.com", exact: true }),
  ).toHaveAttribute("href", "mailto:hello@indusorbit.com");
  await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
  await page.getByLabel("Email address for newsletter subscription").fill("reader@example.test");
  await expect(page.getByRole("button", { name: "Subscribe", exact: true })).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  expect(unsafeInsert).toBe(false);
  expect(captchaLoaded).toBe(false);
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    "An unsent draft remains available.",
  );
});
