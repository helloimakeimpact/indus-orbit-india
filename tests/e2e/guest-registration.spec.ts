import { expect, test } from "@playwright/test";
import { loadEnv } from "vite";
const env = loadEnv("development", process.cwd(), "VITE_");
const apiHost = new URL(process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL).host;
test.setTimeout(90_000);
const eventId = "99100000-0000-4000-8000-000000000001";

test("@public @turnstile public guests verify email explicitly, preserve their draft, and manage a private receipt", async ({
  page,
}) => {
  test.skip(
    process.env.PLAYWRIGHT_TURNSTILE_CONFIGURED !== "1",
    "Requires isolated configured verification preview",
  );
  const actions: string[] = [];
  let attempts = 0,
    confirmed = false,
    cancelled = false;
  await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.turnstile={render:(el,options)=>{window.guestChallenge=options;options.callback('synthetic-token');return 'widget';},remove:()=>{},reset:()=>window.guestChallenge.callback('renewed-token')};window.indusOrbitCaptchaReady();`,
    }),
  );
  await page.route(
    (url) => url.host === apiHost,
    async (route) => {
      const name = new URL(route.request().url()).pathname.split("/").at(-1);
      if (name === "discover_events")
        await route.fulfill({
          json: [
            {
              id: eventId,
              title: "An open gathering",
              description: "An original gathering for people who build useful things together.",
              start_time: new Date(Date.now() + 3600000).toISOString(),
              end_time: new Date(Date.now() + 10800000).toISOString(),
              location_type: "virtual",
              public_location: "Online",
              timezone: "Asia/Kolkata",
              cover_template: "dawn",
              capacity: 1,
              requires_approval: false,
              registration_scope: "public",
              lifecycle: "scheduled",
              chapter_id: null,
              chapter_name: null,
              host_name: "A reviewed host",
              visibility: "public",
            },
          ],
        });
      else if (name === "event-guest-session") {
        const body = route.request().postDataJSON();
        actions.push(body.action);
        if (body.action === "request") {
          expect(body.email).toBe("guest@example.test");
          expect(body.name).toBe("A guest");
          expect(body.captchaToken).toBeTruthy();
          attempts++;
          await route.fulfill({
            status: attempts === 1 ? 503 : 200,
            json: {
              ok: attempts !== 1,
              code: attempts === 1 ? "request_unavailable" : "check_email",
            },
          });
        } else {
          expect(body.token).toBe("a".repeat(64));
          if (body.action === "confirm") confirmed = true;
          if (body.action === "cancel") cancelled = true;
          await route.fulfill({
            json: {
              ok: true,
              code: "registration",
              registration: {
                id: confirmed ? "guest-registration" : null,
                status: cancelled ? "cancelled" : confirmed ? "confirmed" : null,
                needsConfirmation: !confirmed,
                checkedInAt: null,
                location: null,
                joinUrl: confirmed && !cancelled ? "https://example.test/private-access" : null,
                canManage: false,
              },
            },
          });
        }
      } else await route.fulfill({ json: [] });
    },
  );
  await page.goto(`/events/${eventId}`);
  await expect(
    page.getByText("Register with your name and email. No Indus Orbit account is needed."),
  ).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Your name", { exact: true }).fill("A guest");
  await page.getByLabel("Email address", { exact: true }).fill("guest@example.test");
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(page.getByRole("alert")).toContainText("We couldn’t send the email");
  await expect(page.getByLabel("Email address", { exact: true })).toHaveValue("guest@example.test");
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("link", { name: "Open event link" })).toHaveCount(0);
  await page.goto(`/events/${eventId}#guest=${"a".repeat(64)}`);
  await expect(page.getByRole("heading", { name: "Confirm your registration" })).toBeVisible({
    timeout: 20_000,
  });
  expect(new URL(page.url()).hash).toBe("");
  expect(actions.filter((a) => a === "confirm")).toHaveLength(0);
  await page.getByRole("button", { name: "Confirm registration", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You’re going." })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("link", { name: "Open event link" })).toHaveAttribute(
    "href",
    "https://example.test/private-access",
  );
  await page.goto(`/events/${eventId}#guest=${"a".repeat(64)}`);
  await expect(page.getByRole("heading", { name: "You’re going." })).toBeVisible({
    timeout: 20_000,
  });
  expect(new URL(page.url()).hash).toBe("");
  await page.goto(`/events/${eventId}#public-content`);
  await expect(page.getByRole("link", { name: "Open event link" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "You’re going." })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "Cancel registration", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Registration cancelled" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("link", { name: "Open event link" })).toHaveCount(0);
});
