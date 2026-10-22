import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext } from "@playwright/test";
import { broadcastMemberAuth, prepareMemberBrowser } from "./fixtures/member-browser";

const owner = "00000000-0000-4000-8000-000000000001";
const alice = "00000000-0000-4000-8000-000000000002";
const bob = "00000000-0000-4000-8000-000000000003";
const aliceContact = {
  user_id: alice,
  display_name: "Alice",
  avatar_url: null,
  headline: "Building useful things",
};
const bobContact = {
  user_id: bob,
  display_name: "Bob",
  avatar_url: null,
  headline: "Community member",
};
const firstId = "10000000-0000-4000-8000-000000000001";

async function chatBrowser(context: BrowserContext, baseURL: string | undefined) {
  const member = await prepareMemberBrowser(context, baseURL);
  const state = {
    sends: [] as { _recipient_id: string; _content: string; _client_request_id: string }[],
    readCalls: [] as string[],
    inboxCalls: 0,
    historyCalls: 0,
    failNextSend: false,
    holdSend: null as Promise<void> | null,
  };
  const rows = new Map<string, Record<string, unknown>[]>([
    [
      alice,
      [
        {
          id: firstId,
          sender_id: alice,
          recipient_id: owner,
          content: "Hello from Alice",
          client_request_id: null,
          created_at: "2026-10-20T08:00:00.000Z",
          read_at: null,
        },
      ],
    ],
    [bob, []],
  ]);
  await context.route("**/rest/v1/rpc/*", async (route) => {
    const rpc = new URL(route.request().url()).pathname.split("/").at(-1);
    const args = route.request().postDataJSON() ?? {};
    if (rpc === "list_my_direct_inbox_v2") {
      state.inboxCalls += 1;
      await route.fulfill({
        json: [
          {
            ...aliceContact,
            last_message_id: firstId,
            last_message_content: "Hello from Alice",
            last_message_at: "2026-10-20T08:00:00.000Z",
            last_sender_id: alice,
            unread_count: 1,
          },
        ],
      });
    } else if (rpc === "list_my_direct_contacts_v2") {
      const contacts = [aliceContact, bobContact].filter(
        (contact) =>
          (!args._only_user_id || contact.user_id === args._only_user_id) &&
          (!args._search ||
            contact.display_name.toLowerCase().includes(String(args._search).toLowerCase())),
      );
      await route.fulfill({ json: contacts });
    } else if (rpc === "list_my_blocked_direct_contacts_v2") {
      await route.fulfill({ json: [] });
    } else if (rpc === "list_my_direct_conversation_v2") {
      state.historyCalls += 1;
      const before = args._before_created_at ? Date.parse(args._before_created_at) : Infinity;
      await route.fulfill({
        json: [...(rows.get(args._other_user_id) ?? [])]
          .filter((row) => Date.parse(String(row.created_at)) < before)
          .reverse()
          .slice(0, 51),
      });
    } else if (rpc === "list_my_direct_conversation_after_v2") {
      const after = Date.parse(args._after_created_at);
      await route.fulfill({
        json: (rows.get(args._other_user_id) ?? [])
          .filter((row) => Date.parse(String(row.created_at)) > after)
          .slice(0, 51),
      });
    } else if (rpc === "mark_my_direct_conversation_read_v2") {
      state.readCalls.push(args._through_id);
      await route.fulfill({ json: 1 });
    } else if (rpc === "send_my_direct_message_v2") {
      state.sends.push(args);
      if (state.holdSend) await state.holdSend;
      if (state.failNextSend) {
        state.failNextSend = false;
        await route.fulfill({
          status: 503,
          json: { message: "Synthetic delivery outage", code: "08006" },
        });
        return;
      }
      const existing = (rows.get(args._recipient_id) ?? []).find(
        (row) => row.client_request_id === args._client_request_id,
      );
      const message = existing ?? {
        id: `20000000-0000-4000-8000-${String(state.sends.length).padStart(12, "0")}`,
        sender_id: owner,
        recipient_id: args._recipient_id,
        content: args._content,
        client_request_id: args._client_request_id,
        created_at: new Date().toISOString(),
        read_at: null,
      };
      if (!existing)
        rows.set(args._recipient_id, [...(rows.get(args._recipient_id) ?? []), message]);
      await route.fulfill({ json: message });
    } else {
      await route.fallback();
    }
  });
  return { state, member, rows };
}

test("@member-ui chat enqueues once and preserves later typing while delivery is pending", async ({
  context,
  page,
  baseURL,
}, testInfo) => {
  const { state, member } = await chatBrowser(context, baseURL);
  let release!: () => void;
  state.holdSend = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.goto(`/app/messages?user=${alice}`, { waitUntil: "domcontentloaded" });
  const conversation = page.getByRole("region", { name: "Conversation with Alice" });
  const input = conversation.getByRole("textbox", { name: "Message Alice" });
  await input.fill("One intentional message");
  await input.evaluate((element) =>
    element.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        isComposing: true,
        bubbles: true,
      }),
    ),
  );
  expect(state.sends).toHaveLength(0);
  await expect(input).toHaveValue("One intentional message");
  await input.press("Enter");
  await input.press("Enter");
  await expect(conversation.getByText("One intentional message", { exact: true })).toBeVisible();
  await input.fill("A newer draft must survive");
  await expect.poll(() => state.sends.length).toBe(1);
  release();
  await expect(conversation.getByLabel("Sent", { exact: true })).toBeVisible();
  await expect(input).toHaveValue("A newer draft must survive");
  await page.screenshot({ path: testInfo.outputPath("chat-desktop.png"), fullPage: true });
  expect(state.sends[0]._content).toBe("One intentional message");
  expect(member.unexpectedMutations).toEqual([]);
});

test("@member-ui chat keeps per-person drafts and hands the current conversation from quick chat to Messages", async ({
  context,
  page,
  baseURL,
}) => {
  const { member } = await chatBrowser(context, baseURL);
  await page.goto(`/app/messages?user=${alice}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("textbox", { name: "Message Alice" }).fill("Draft for Alice");
  await page.getByRole("button", { name: "Connections", exact: true }).click();
  await page.getByRole("button", { name: "Bob", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Message Bob" })).toHaveValue("");
  await page.getByRole("textbox", { name: "Message Bob" }).fill("Draft for Bob");
  await page.getByRole("button", { name: "Alice", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Message Alice" })).toHaveValue("Draft for Alice");
  await page.getByRole("button", { name: /^Open messages/ }).click();
  const sheet = page.getByRole("dialog", { name: "Your conversations" });
  await sheet.getByRole("button", { name: "Alice, 1 unread messages", exact: true }).click();
  await expect(sheet.getByRole("textbox", { name: "Message Alice" })).toHaveValue(
    "Draft for Alice",
  );
  await sheet.getByRole("textbox", { name: "Message Alice" }).fill("Continued from quick chat");
  await sheet.getByRole("button", { name: "Open Messages", exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/app/messages\\?user=${alice}$`));
  await expect(page.getByRole("textbox", { name: "Message Alice" })).toHaveValue(
    "Continued from quick chat",
  );
  await broadcastMemberAuth(page, "SIGNED_IN", bob);
  await expect(page.getByRole("textbox", { name: "Message Alice" })).not.toHaveValue(
    "Continued from quick chat",
  );
  expect(member.unexpectedMutations).toEqual([]);
});

test("@member-ui quick chat shows failed delivery and retries the original request", async ({
  context,
  page,
  baseURL,
}) => {
  const { state, member } = await chatBrowser(context, baseURL);
  await page.goto(`/app/messages?user=${alice}`, { waitUntil: "domcontentloaded" });
  state.failNextSend = true;
  const input = page.getByRole("textbox", { name: "Message Alice" });
  await input.fill("Recover this message");
  await input.press("Enter");
  await expect(page.getByText("Not sent", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Open messages/ }).click();
  const sheet = page.getByRole("dialog", { name: "Your conversations" });
  await sheet.getByRole("button", { name: "Alice, 1 unread messages", exact: true }).click();
  await expect(sheet.getByText("Not sent", { exact: true })).toBeVisible();
  await sheet.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(sheet.getByLabel("Sent", { exact: true })).toBeVisible();
  expect(state.sends).toHaveLength(2);
  expect(state.sends[0]._client_request_id).toBe(state.sends[1]._client_request_id);
  await expect(sheet.getByRole("button", { name: "Discard", exact: true })).toHaveCount(0);
  expect(member.unexpectedMutations).toEqual([]);
});

test("@member-ui narrow chat labels its controls and does not read a hidden conversation", async ({
  context,
  page,
  baseURL,
}, testInfo) => {
  const { state, member } = await chatBrowser(context, baseURL);
  await context.addInitScript(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
  });
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto(`/app/messages?user=${alice}`, { waitUntil: "domcontentloaded" });
  await expect(
    page
      .getByRole("region", { name: "Conversation with Alice" })
      .getByText("Hello from Alice", { exact: true }),
  ).toBeVisible();
  expect(state.readCalls).toEqual([]);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => state.readCalls).toContain(firstId);
  await expect(
    page.getByRole("button", { name: "Back to conversations", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations
      .filter(({ impact }) => impact === "serious" || impact === "critical")
      .map(({ id }) => id),
  ).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("chat-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Back to conversations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Messages", exact: true })).toBeVisible();
  expect(member.unexpectedMutations).toEqual([]);
});

test("@member-ui a full outbox keeps the draft and exposes a visible recovery message", async ({
  context,
  page,
  baseURL,
}) => {
  const { state, member } = await chatBrowser(context, baseURL);
  await context.addInitScript(
    ({ owner, alice }) => {
      window.sessionStorage.setItem(
        `indus-orbit:dm-outbox:v1:${owner}`,
        JSON.stringify({
          version: 1,
          userId: owner,
          items: Array.from({ length: 100 }, (_, index) => ({
            requestId: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
            recipientId: alice,
            content: `Unsent message ${index + 1}`,
            createdAt: new Date(Date.UTC(2026, 9, 20, 9, 0, index)).toISOString(),
            state: "failed",
          })),
        }),
      );
    },
    { owner, alice },
  );
  await page.goto(`/app/messages?user=${alice}`, { waitUntil: "domcontentloaded" });
  const conversation = page.getByRole("region", { name: "Conversation with Alice" });
  const input = conversation.getByRole("textbox", { name: "Message Alice" });
  await input.fill("Keep this draft when the queue is full");
  await input.press("Enter");
  await expect(conversation.getByRole("alert")).toHaveText(
    "Your outbox has 100 messages. Retry or discard an unsent message first.",
  );
  await expect(conversation.getByRole("alert")).toBeInViewport();
  await expect(input).toHaveValue("Keep this draft when the queue is full");
  expect(state.sends).toEqual([]);
  expect(member.unexpectedMutations).toEqual([]);
});

test("@member-ui incoming recovery preserves the row being read in a full history window", async ({
  context,
  page,
  baseURL,
}) => {
  const { rows, member } = await chatBrowser(context, baseURL);
  const message = (index: number) => ({
    id: `60000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    sender_id: alice,
    recipient_id: owner,
    content: `History message ${index}`,
    client_request_id: null,
    created_at: new Date(Date.UTC(2026, 9, 20, 8, 0, index)).toISOString(),
    read_at: null,
  });
  rows.set(
    alice,
    Array.from({ length: 200 }, (_, index) => message(index + 1)),
  );
  await page.goto(`/app/messages?user=${alice}`, { waitUntil: "domcontentloaded" });
  const conversation = page.getByRole("region", { name: "Conversation with Alice" });
  const timeline = conversation.getByTestId("conversation-timeline");
  await expect(timeline.locator("[data-message-id]")).toHaveCount(50);
  for (const count of [100, 150, 200]) {
    await timeline.evaluate((element) => {
      element.scrollTop = 0;
      element.dispatchEvent(new Event("scroll"));
    });
    await conversation.getByRole("button", { name: "Load earlier messages", exact: true }).click();
    await expect(timeline.locator("[data-message-id]")).toHaveCount(count);
  }
  await timeline.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll"));
  });
  const firstRow = timeline.locator("[data-message-id]").first();
  await expect(firstRow).toContainText("History message 1");
  const before = await firstRow.boundingBox();
  rows.set(alice, [...rows.get(alice)!, message(201)]);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    conversation.getByRole("button", { name: "Back to latest", exact: true }),
  ).toBeVisible();
  await expect(firstRow).toContainText("History message 1");
  await expect(conversation.getByText("Updating messages…", { exact: true })).toHaveCount(0);
  expect(Math.abs((await firstRow.boundingBox())!.y - before!.y)).toBeLessThanOrEqual(2);
  await expect(timeline.locator("[data-message-id]")).toHaveCount(200);
  await conversation.getByRole("button", { name: "Back to latest", exact: true }).click();
  await expect(timeline.getByText("History message 201", { exact: true })).toBeVisible();
  expect(member.unexpectedMutations).toEqual([]);
});

test("@member-ui community groups load only when selected and link to their existing discussion", async ({
  context,
  page,
  baseURL,
}) => {
  const { member } = await chatBrowser(context, baseURL);
  const eventId = "70000000-0000-4000-8000-000000000001";
  let groupsCalls = 0;
  await context.route("**/rest/v1/rpc/list_my_community_chat_links", async (route) => {
    groupsCalls += 1;
    await route.fulfill({
      json: [
        {
          id: eventId,
          title: "Builder gathering",
          kind: "event",
          spaceId: "70000000-0000-4000-8000-000000000002",
          roomId: "70000000-0000-4000-8000-000000000003",
          eventId,
        },
      ],
    });
  });
  await context.route("**/rest/v1/rpc/discover_events", (route) => route.fulfill({ json: [] }));
  await context.route("**/rest/v1/rpc/get_my_event_registration", (route) =>
    route.fulfill({ json: null }),
  );
  await page.goto("/app/messages", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "Alice, 1 unread messages", exact: true }),
  ).toBeVisible();
  expect(groupsCalls).toBe(0);
  await page.getByRole("button", { name: "Community conversations", exact: true }).click();
  const link = page.getByRole("link").filter({ hasText: "Builder gathering" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", `/app/events/${eventId}#discussion`);
  expect(groupsCalls).toBeGreaterThan(0);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/app/events/${eventId}#discussion$`));
  expect(member.unexpectedMutations).toEqual([]);
});
