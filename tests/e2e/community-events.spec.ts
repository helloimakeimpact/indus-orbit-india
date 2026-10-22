import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loadEnv } from "vite";
import { prepareMemberBrowser, broadcastMemberAuth } from "./fixtures/member-browser";
const environment = loadEnv("development", process.cwd(), "VITE_");
const apiHost = new URL(process.env.VITE_SUPABASE_URL ?? environment.VITE_SUPABASE_URL).host;
const eventId = "98200000-0000-4000-8000-000000000001";
const memberId = "00000000-0000-4000-8000-000000000001";
function invitation(id = eventId, title = "Builders at dawn") {
  return {
    id,
    title,
    description: "An original gathering for people who build useful things together.",
    start_time: new Date(Date.now() + 3600000).toISOString(),
    end_time: new Date(Date.now() + 10800000).toISOString(),
    location_type: "virtual",
    public_location: "Online",
    timezone: "Asia/Kolkata",
    cover_template: "dawn",
    capacity: 1,
    requires_approval: false,
    registration_scope: "community",
    lifecycle: "scheduled",
    chapter_id: null,
    chapter_name: null,
    host_name: "A reviewed host",
    visibility: "public",
  };
}

test("@public event discovery, search, invitation and community links fit 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  const calls: Record<string, unknown>[] = [];
  await page.route(
    (url) => url.host === apiHost,
    async (route) => {
      const name = new URL(route.request().url()).pathname.split("/").at(-1);
      if (name === "discover_events") {
        const body = route.request().postDataJSON();
        calls.push(body);
        await route.fulfill({ json: body._search ? [] : [invitation()] });
      } else if (name === "discover_communities")
        await route.fulfill({
          json: [
            {
              id: "98100000-0000-4000-8000-000000000001",
              name: "Bengaluru builders",
              city: "Bengaluru",
              country: "India",
              description: "An enduring home for builders and their gatherings.",
              upcoming_events: 1,
            },
          ],
        });
      else await route.fulfill({ json: [] });
    },
  );
  await page.goto("/events");
  await expect(page.getByRole("heading", { name: "Find your next gathering." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Builders at dawn" })).toBeVisible();
  await expect(page.getByText("Free · Community members", { exact: true })).toBeVisible();
  await page.getByLabel("Search events by title, city or community").fill("No matches");
  await expect(
    page.getByRole("heading", { name: "No gatherings match your search." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("heading", { name: "Builders at dawn" }).click();
  await expect(page.getByRole("heading", { name: "Join this gathering" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to register" })).toBeVisible();
  await expect(page.getByText("PRIVATE JOIN URL")).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add to calendar" }).click();
  await expect((await download).suggestedFilename()).toBe(`indus-orbit-${eventId}.ics`);
  const a11y = await new AxeBuilder({ page })
    .include("#public-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(a11y.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual(
    [],
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await page.goto("/communities");
  await expect(page.getByRole("heading", { name: "Bengaluru builders" })).toBeVisible();
  expect(calls.some((c) => c._search === "No matches")).toBe(true);
});

test("@member-ui native registration shows the server status and withholds access until confirmation", async ({
  page,
  context,
  baseURL,
}) => {
  await prepareMemberBrowser(context, baseURL);
  let status: string | null = null;
  const writes: Record<string, unknown>[] = [];
  await context.route(
    (url) => url.host === apiHost,
    async (route) => {
      const name = new URL(route.request().url()).pathname.split("/").at(-1);
      if (name === "discover_events") await route.fulfill({ json: [invitation()] });
      else if (name === "get_my_event_registration")
        await route.fulfill({
          json: {
            id: status ? "registration-id" : null,
            status,
            checkedInAt: null,
            location: null,
            joinUrl: status === "confirmed" ? "https://example.test/private-join" : null,
            canManage: false,
          },
        });
      else if (name === "register_for_event") {
        writes.push(route.request().postDataJSON());
        status = "waitlisted";
        await route.fulfill({ json: { id: "registration-id", status } });
      } else if (name === "cancel_my_event_registration") {
        writes.push(route.request().postDataJSON());
        status = "cancelled";
        await route.fulfill({ json: null });
      } else await route.fallback();
    },
  );
  await page.goto(`/app/events/${eventId}`);
  await page.getByRole("button", { name: "Register for free" }).click();
  await expect(page.getByRole("heading", { name: "You’re on the waitlist" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open event link" })).toHaveCount(0);
  expect(writes[0]._expected_user_id).toBe(memberId);
  await page.getByRole("button", { name: "Cancel registration" }).click();
  await expect(page.getByRole("button", { name: "Register for free" })).toBeEnabled();
  status = "confirmed";
  await page.reload();
  await expect(page.getByRole("heading", { name: "You’re going." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open event link" })).toHaveAttribute(
    "href",
    "https://example.test/private-join",
  );
  await broadcastMemberAuth(page, "SIGNED_OUT");
  await expect(page.getByRole("link", { name: "Open event link" })).toHaveCount(0);
});

test("@member-ui host creation has named fields, review copy and original cover options", async ({
  page,
  context,
  baseURL,
}) => {
  await prepareMemberBrowser(context, baseURL);
  await context.route(
    (url) => url.host === apiHost,
    async (route) => {
      const name = new URL(route.request().url()).pathname.split("/").at(-1);
      if (name === "discover_events" || name === "discover_communities")
        await route.fulfill({ json: [] });
      else await route.fallback();
    },
  );
  await page.goto("/app/events");
  await page.getByRole("button", { name: "Create an event" }).click();
  const dialog = page.getByRole("dialog", { name: "Bring people together." });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Event name")).toBeVisible();
  await expect(dialog.getByLabel("Private online join link")).toBeVisible();
  await expect(dialog.getByRole("radio", { name: "Dawn", exact: true })).toBeChecked();
  await dialog.getByRole("radio", { name: "Lotus", exact: true }).check();
  await expect(dialog.getByRole("radio", { name: "Lotus", exact: true })).toBeChecked();
  await expect(
    dialog.getByText(/New hosts and chapter submissions go through review/),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Create an event" })).toBeFocused();
});

test("@public open events offer name/email registration without membership or account creation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.route(
    (url) => url.host === apiHost,
    async (route) => {
      const name = new URL(route.request().url()).pathname.split("/").at(-1);
      await route.fulfill({
        json: name === "discover_events" ? [{ ...invitation(), registration_scope: "public" }] : [],
      });
    },
  );
  await page.goto("/events");
  await expect(page.getByText("Free · Everyone", { exact: true })).toBeVisible();
  await expect(page.getByText("Free · Community members", { exact: true })).toHaveCount(0);
  await page.goto(`/events/${eventId}`);
  await expect(
    page.getByText("Register with your name and email. No Indus Orbit account is needed."),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Your name", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to register" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open event link" })).toHaveCount(0);
  const a11y = await new AxeBuilder({ page })
    .include("#public-content")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(a11y.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual(
    [],
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
});
