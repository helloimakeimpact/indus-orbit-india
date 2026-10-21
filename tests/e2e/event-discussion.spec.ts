import { expect, test, type BrowserContext } from "@playwright/test";
import { broadcastMemberAuth, prepareMemberBrowser } from "./fixtures/member-browser";
const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const eventId = "97300000-0000-4000-8000-000000000011";
const roomId = "97300000-0000-4000-8000-000000000012";
function row(index: number) {
  return {
    id: `97400000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    roomId,
    threadId: null,
    authorId: other,
    authorDisplayName: "Attendee",
    authorAvatarUrl: null,
    messageType: "human",
    content: `Group message ${index}`,
    createdAt: new Date(Date.UTC(2026, 9, 20, 0, 0, index)).toISOString(),
    editedAt: null,
    deletedAt: null as string | null,
    reactions: [],
    attachments: [],
    thread: null,
  };
}
async function eventBrowser(context: BrowserContext, baseURL: string | undefined, host = false) {
  const member = await prepareMemberBrowser(context, baseURL);
  const state = {
    enabled: !host,
    joined: !host,
    version: host ? 0 : 1,
    canManage: host,
    canPost: true,
    failNext: false,
    sends: [] as Record<string, unknown>[],
    rows: Array.from({ length: 250 }, (_, index) => row(index + 1)),
    feedCalls: [] as Record<string, unknown>[],
    readCalls: [] as Record<string, unknown>[],
    safetyCalls: [] as Record<string, unknown>[],
  };
  const discussion = () => ({
    eventId,
    enabled: state.enabled,
    version: state.version,
    canManage: state.canManage,
    canJoin: state.enabled,
    joined: state.joined && state.enabled,
    roomId: state.joined && state.enabled ? roomId : null,
    canPost: state.enabled && state.joined && state.canPost,
    postingClosesAt:
      state.enabled && state.joined ? new Date(Date.now() + 9 * 86400000).toISOString() : null,
  });
  await context.route("**/rest/v1/rpc/*", async (route) => {
    const rpc = new URL(route.request().url()).pathname.split("/").at(-1);
    const args = route.request().postDataJSON() ?? {};
    if (rpc === "discover_events")
      await route.fulfill({
        json: [
          {
            id: eventId,
            title: "A gathering with conversation",
            description: "A thoughtful gathering for members and their useful questions.",
            start_time: new Date(Date.now() + 86400000).toISOString(),
            end_time: new Date(Date.now() + 2 * 86400000).toISOString(),
            location_type: "virtual",
            public_location: "Online",
            timezone: "Asia/Kolkata",
            cover_template: "dawn",
            capacity: 50,
            requires_approval: false,
            registration_scope: "community",
            lifecycle: "scheduled",
            chapter_id: null,
            chapter_name: null,
            host_name: "Event host",
            visibility: "public",
          },
        ],
      });
    else if (rpc === "get_my_event_registration")
      await route.fulfill({
        json: {
          id: "97300000-0000-4000-8000-000000000021",
          status: "confirmed",
          checkedInAt: null,
          location: null,
          joinUrl: null,
          canManage: host,
        },
      });
    else if (rpc === "get_event_discussion") await route.fulfill({ json: discussion() });
    else if (rpc === "set_event_discussion") {
      state.enabled = args._enabled;
      state.joined = true;
      state.version += 1;
      await route.fulfill({ json: discussion() });
    } else if (rpc === "join_event_discussion") {
      state.joined = true;
      await route.fulfill({ json: discussion() });
    } else if (rpc === "list_event_discussion_feed") {
      state.feedCalls.push(args);
      if (!state.enabled || !state.joined) {
        await route.fulfill({
          status: 403,
          json: { code: "42501", message: "Discussion is not available" },
        });
        return;
      }
      const compare = (a: ReturnType<typeof row>, created: string, id: string) =>
        a.createdAt.localeCompare(created) || a.id.localeCompare(id);
      const filtered = state.rows.filter(
        (item) =>
          (!args._before_id || compare(item, args._before_created_at, args._before_id) < 0) &&
          (!args._through_id || compare(item, args._through_created_at, args._through_id) <= 0),
      );
      const limit = args._limit ?? 50,
        items = filtered.slice(-limit),
        hasMore = filtered.length > items.length;
      await route.fulfill({
        json: {
          items: items.map((item) => (item.deletedAt ? { ...item, content: null } : item)),
          hasMore,
          nextCursor: hasMore ? { id: items[0].id, createdAt: items[0].createdAt } : null,
          canManage: host,
          canModerate: host,
          newerAvailable:
            !!args._through_id &&
            state.rows.some(
              (item) => compare(item, args._through_created_at, args._through_id) > 0,
            ),
        },
      });
    } else if (rpc === "send_event_discussion_message") {
      state.sends.push(args);
      if (state.failNext) {
        state.failNext = false;
        await route.fulfill({
          status: 503,
          json: { code: "08006", message: "Message not confirmed. Retry the same message." },
        });
        return;
      }
      const message = {
        ...row(1000 + state.sends.length),
        authorId: owner,
        authorDisplayName: "You",
        content: args._content,
        createdAt: new Date().toISOString(),
      };
      state.rows.push(message);
      await route.fulfill({ json: message.id });
    } else if (rpc === "event_discussion_safety_action") {
      state.safetyCalls.push(args);
      const message = state.rows.find((item) => item.id === args._message_id);
      if (message && args._action !== "report")
        message.deletedAt = args._action === "restore" ? null : new Date().toISOString();
      await route.fulfill({
        json: { action: args._action === "report" ? "reported" : args._action },
      });
    } else if (rpc === "mark_event_discussion_read") {
      state.readCalls.push(args);
      await route.fulfill({ json: null });
    } else await route.fallback();
  });
  return { state, member };
}

test("@member-ui event host opens one attendee discussion and can close it", async ({
  context,
  page,
  baseURL,
}) => {
  const { state } = await eventBrowser(context, baseURL, true);
  await page.goto(`/app/events/${eventId}`);
  await page.getByRole("button", { name: "Enable attendee discussion" }).click();
  await expect(page.getByRole("region", { name: "Event discussion messages" })).toBeVisible();
  await page.getByRole("button", { name: "Close discussion", exact: true }).click();
  await expect(page.getByRole("region", { name: "Event discussion messages" })).toHaveCount(0);
  expect(state.version).toBe(2);
  expect(state.enabled).toBe(false);
});

test("@member-ui event discussion preserves older scroll, bounds two hundred rows and recovers a large reconnect", async ({
  context,
  page,
  baseURL,
}) => {
  const { state } = await eventBrowser(context, baseURL);
  await page.goto(`/app/events/${eventId}`);
  const region = page.getByRole("region", { name: "Event discussion messages" });
  await expect(region).toBeVisible();
  await expect(region.locator("[data-event-message]")).toHaveCount(50);
  await region.evaluate((node) => {
    node.scrollTop = 0;
  });
  const first = region.locator("[data-event-message]").first();
  const id = await first.getAttribute("data-event-message");
  const before = (await first.boundingBox())!.y - (await region.boundingBox())!.y;
  await region.getByRole("button", { name: "Load earlier", exact: true }).click();
  await expect(region.locator("[data-event-message]")).toHaveCount(100);
  const after =
    (await region.locator(`[data-event-message="${id}"]`).boundingBox())!.y -
    (await region.boundingBox())!.y;
  expect(Math.abs(after - before)).toBeLessThan(3);
  state.rows.push(...Array.from({ length: 65 }, (_, index) => row(251 + index)));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("button", { name: "New messages · show latest" })).toBeVisible();
  await expect(region.locator("[data-event-message]")).toHaveCount(100);
  await expect(region.getByText("Group message 315", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "New messages · show latest" }).click();
  await expect(region.locator("[data-event-message]")).toHaveCount(50);
  await expect(region.getByText("Group message 315", { exact: true })).toBeVisible();
  for (let count = 0; count < 4; count += 1) {
    await region.evaluate((node) => {
      node.scrollTop = 0;
    });
    await region.getByRole("button", { name: "Load earlier", exact: true }).click();
    await expect(region.locator("[data-event-message]")).toHaveCount(
      Math.min(200, 100 + 50 * count),
    );
  }
  expect(await region.locator("[data-event-message]").count()).toBe(200);
});

test("@member-ui event retry survives same-tab reload with its original operation ID", async ({
  context,
  page,
  baseURL,
}) => {
  const { state } = await eventBrowser(context, baseURL);
  state.failNext = true;
  await page.goto(`/app/events/${eventId}`);
  const composer = page.getByRole("textbox", { name: "Message the event group" });
  await composer.fill("A useful group question");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry message", exact: true })).toBeVisible();
  const original = state.sends[0]._client_request_id;
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Message the event group" })).toHaveValue(
    "A useful group question",
  );
  await page.getByRole("button", { name: "Retry message", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Message the event group" })).toHaveValue("");
  expect(state.sends).toHaveLength(2);
  expect(state.sends[1]._client_request_id).toBe(original);
});

test("@member-ui event mobile group clears revoked history and account retry recovery", async ({
  context,
  page,
  baseURL,
}) => {
  const { state } = await eventBrowser(context, baseURL);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(`/app/events/${eventId}`);
  const region = page.getByRole("region", { name: "Event discussion messages" });
  await expect(region).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  state.joined = false;
  await page.getByRole("button", { name: "Refresh event discussion" }).click();
  await expect(region).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Join event discussion", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Join event discussion", exact: true }).click();
  state.failNext = true;
  await page
    .getByRole("textbox", { name: "Message the event group" })
    .fill("Private pending group text");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry message", exact: true })).toBeVisible();
  await broadcastMemberAuth(page, "SIGNED_OUT");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Object.keys(sessionStorage).filter((key) => key.startsWith("indus-orbit:event-retry:v1:"))
            .length,
      ),
    )
    .toBe(0);
  await expect(page.getByText("Private pending group text", { exact: true })).toHaveCount(0);
});

test("@member-ui event attendees can report and hosts can restrict and restore with reasons", async ({
  context,
  page,
  baseURL,
}) => {
  const { state } = await eventBrowser(context, baseURL, true);
  await page.goto(`/app/events/${eventId}`);
  await page.getByRole("button", { name: "Enable attendee discussion", exact: true }).click();
  const region = page.getByRole("region", { name: "Event discussion messages" });
  await region.getByRole("button", { name: "Report message", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Reason", exact: true })
    .fill("A safety concern requiring private review");
  await dialog.getByRole("button", { name: "Send report", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("status").filter({ hasText: "Report sent to the safety team." }),
  ).toBeVisible();
  expect(state.safetyCalls[0]._reason).toBe("A safety concern requiring private review");
  expect(state.safetyCalls[0]._reason).not.toContain("Group message");
  await region.getByRole("button", { name: "Restrict message", exact: true }).first().click();
  await dialog
    .getByRole("textbox", { name: "Reason", exact: true })
    .fill("Restrict pending a safety review");
  await dialog.getByRole("button", { name: "Confirm host action", exact: true }).click();
  await expect(region.getByText("Message removed", { exact: true })).toBeVisible();
  await region.getByRole("button", { name: "Restore message", exact: true }).first().click();
  await dialog
    .getByRole("textbox", { name: "Reason", exact: true })
    .fill("Review resolved with evidence");
  await dialog.getByRole("button", { name: "Confirm host action", exact: true }).click();
  await expect(region.getByText("Message removed", { exact: true })).toHaveCount(0);
  expect(state.safetyCalls.map((call) => call._action)).toEqual([
    "report",
    "content_restrict",
    "restore",
  ]);
});
