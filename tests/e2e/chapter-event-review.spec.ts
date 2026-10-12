import { expect, test } from "@playwright/test";
import { loadEnv } from "vite";
import { prepareMemberBrowser } from "./fixtures/member-browser";

const env = loadEnv("development", process.cwd(), "VITE_");
const apiHost = new URL(process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL).host;
const chapterId = "99100000-0000-4000-8000-000000000001";
const eventId = "99200000-0000-4000-8000-000000000001";

test("@member-ui chapter event review sends the inspected revision and supports a fresh review after a stale decision", async ({
  page,
  context,
  baseURL,
}) => {
  const state = await prepareMemberBrowser(context, baseURL);
  let revision = 3;
  let published = false;
  const decisions: Record<string, unknown>[] = [];
  await context.route(
    (url) => url.host === apiHost,
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/rest/v1/chapter_members") {
        await route.fulfill({
          json: [{ chapter_id: chapterId, role: "lead", membership_state: "active" }],
        });
      } else if (path === "/rest/v1/chapters") {
        await route.fulfill({
          json: [
            {
              id: chapterId,
              name: "Community chapter",
              description: "A synthetic chapter",
              city: "Delhi",
              country: "India",
              chapter_members: [],
            },
          ],
        });
      } else if (path.endsWith("/get_chapter_event_review_queue")) {
        await route.fulfill({
          json: published
            ? []
            : [
                {
                  id: eventId,
                  title: "Chapter gathering",
                  description: "The complete invitation body for this gathering.",
                  start_time: "2099-10-15T10:00:00Z",
                  end_time: "2099-10-15T12:00:00Z",
                  timezone: "Asia/Kolkata",
                  location_type: "virtual",
                  public_location: "Online",
                  location: null,
                  join_url: "https://example.test/private-meeting",
                  chapter_id: chapterId,
                  host_name: "Approved host",
                  revision,
                },
              ],
        });
      } else if (path.endsWith("/review_event_revision")) {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        decisions.push(body);
        if (decisions.length === 1) {
          revision = 4;
          await route.fulfill({
            status: 409,
            json: {
              code: "40001",
              message: "This event changed. Refresh the review before deciding",
            },
          });
        } else {
          published = true;
          await route.fulfill({ json: null });
        }
      } else await route.fallback();
    },
  );
  await page.goto("/app/chapter-admin", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Chapter Administration", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Chapter gathering", { exact: true })).toBeVisible();
  await page.getByText("Review invitation details", { exact: true }).click();
  await expect(page.getByRole("link", { name: "Review private access link" })).toHaveAttribute(
    "href",
    "https://example.test/private-meeting",
  );
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(
    page.getByText("This event changed. Refresh the review before deciding", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Chapter gathering", { exact: true })).toBeVisible();
  expect(decisions[0]).toMatchObject({
    _event_id: eventId,
    _expected_revision: 3,
    _approved: true,
  });
  await page.getByRole("button", { name: "Refresh submissions" }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("Event approved", { exact: true })).toBeVisible();
  await expect(page.getByText("Chapter gathering", { exact: true })).toHaveCount(0);
  expect(decisions[1]).toMatchObject({
    _event_id: eventId,
    _expected_revision: 4,
    _approved: true,
  });
  expect(state.unexpectedMutations).toEqual([]);
});
