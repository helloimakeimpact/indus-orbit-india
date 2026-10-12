import { expect, test } from "@playwright/test";
import { loadEnv } from "vite";
import { prepareMemberBrowser } from "./fixtures/member-browser";
const env = loadEnv("development", process.cwd(), "VITE_");
const apiHost = new URL(process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL).host;
const eventId = "98800000-0000-4000-8000-000000000001";
test("@member-ui host editing preserves registration conditions and a stale-write rejection preserves the draft", async ({
  page,
  context,
  baseURL,
}) => {
  await prepareMemberBrowser(context, baseURL);
  let revision = 0;
  const submissions: Record<string, unknown>[] = [];
  await context.route(
    (url) => url.host === apiHost,
    async (route) => {
      const name = new URL(route.request().url()).pathname.split("/").at(-1);
      if (name === "get_my_event_workspace")
        await route.fulfill({
          json: {
            approvedHost: true,
            canReviewHosts: false,
            review: [],
            hosted: [
              {
                id: eventId,
                title: "An original gathering",
                status: "approved",
                lifecycle: "scheduled",
                start_time: "2099-10-03T10:00:00Z",
              },
            ],
          },
        });
      else if (name === "discover_communities") await route.fulfill({ json: [] });
      else if (name === "get_host_event_draft")
        await route.fulfill({
          json: {
            id: eventId,
            revision,
            history: [],
            draft: {
              title: "An original gathering",
              description: "A complete description of our gathering.",
              startTime: "2099-10-03T10:00:00Z",
              endTime: "2099-10-03T12:00:00Z",
              timezone: "Asia/Kolkata",
              locationType: "virtual",
              location: "",
              link: "https://example.test/private-event",
              publicLocation: "Online",
              chapterId: "",
              coverTemplate: "dawn",
              visibility: "public",
              registrationScope: "public",
              capacity: "25",
              requiresApproval: false,
            },
          },
        });
      else if (name === "update_hosted_event") {
        const body = route.request().postDataJSON()._input;
        submissions.push(body);
        expect(body.expectedUserId).toBe("00000000-0000-4000-8000-000000000001");
        expect(body).not.toHaveProperty("capacity");
        expect(body).not.toHaveProperty("registrationScope");
        expect(body).not.toHaveProperty("status");
        expect(body.clientRequestId).toMatch(/^[a-f0-9-]{36}$/);
        if (submissions.length === 1) {
          revision = 1;
          await route.fulfill({
            status: 409,
            json: { code: "40001", message: "This event changed. Reopen the editor before saving" },
          });
        } else {
          expect(body.expectedRevision).toBe(1);
          await route.fulfill({ json: { id: eventId, revision: 2, status: "approved" } });
        }
      } else await route.fallback();
    },
  );
  await page.goto("/app/events/hosting", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Edit event", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Update your gathering." });
  await expect(dialog.getByLabel("Event name")).toHaveValue("An original gathering");
  await expect(dialog.getByLabel("Guest capacity")).toBeDisabled();
  await expect(dialog.getByLabel("Who can register?")).toBeDisabled();
  await expect(dialog.getByRole("combobox", { name: "Discovery", exact: true })).toBeDisabled();
  await dialog.getByLabel("Event name").fill("Updated gathering");
  await dialog.getByLabel("Change reason").fill("A clearer name for the event");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Reopen the editor");
  await expect(dialog.getByLabel("Event name")).toHaveValue("Updated gathering");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit event", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Edit event", exact: true }).click();
  await dialog.getByLabel("Event name").fill("Updated gathering");
  await dialog.getByLabel("Change reason").fill("A clearer name for the event");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toBeHidden();
  expect(submissions).toHaveLength(2);
});
