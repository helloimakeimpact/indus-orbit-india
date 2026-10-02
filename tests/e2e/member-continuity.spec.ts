import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { broadcastMemberAuth, prepareMemberBrowser } from "./fixtures/member-browser";

test("@member-ui member navigation preserves the shared workspace shell", async ({
  context,
  page,
  baseURL,
}) => {
  const state = await prepareMemberBrowser(context, baseURL);
  await page.goto("/app/stories", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Submit Story", exact: true })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to workspace" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main", { name: "Member workspace" })).toBeFocused();
  const shell = await page.locator(".app-ui").elementHandle();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Workspace preferences" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(await shell!.evaluate((element) => element.isConnected)).toBe(true);
  await expect(page.getByText("Loading your workspace…", { exact: true })).toHaveCount(0);
  expect(state.unexpectedMutations).toEqual([]);
});

test("@member-ui narrow-screen navigation is named and closes after choosing a destination", async ({
  context,
  page,
  baseURL,
}) => {
  const state = await prepareMemberBrowser(context, baseURL);
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto("/app/stories", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Submit Story", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  const navigation = page.getByRole("dialog", { name: "Workspace navigation" });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Stories", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await navigation.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(navigation).toBeHidden();
  await expect(page.getByRole("heading", { name: "Workspace preferences" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(state.unexpectedMutations).toEqual([]);
});

test("@member-ui tab return and same-account auth events preserve an unsent draft", async ({
  context,
  page,
  baseURL,
}) => {
  const state = await prepareMemberBrowser(context, baseURL);
  await page.goto("/app/stories", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Submit Story", exact: true }).click();
  const title = page.getByPlaceholder("Story Title...");
  const draft = page.getByPlaceholder("Write your story here (Markdown is supported)...");
  await title.fill("My unsent story");
  await draft.fill("This draft must survive tab return and token refresh.");
  const otherTab = await context.newPage();
  await otherTab.goto("/", { waitUntil: "domcontentloaded" });

  for (const event of ["SIGNED_IN", "TOKEN_REFRESHED"] as const) {
    const before = state.identityChecks;
    await broadcastMemberAuth(otherTab, event);
    await expect.poll(() => state.identityChecks).toBeGreaterThan(before);
    await page.bringToFront();
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(title).toHaveValue("My unsent story");
    await expect(draft).toHaveValue("This draft must survive tab return and token refresh.");
    await expect(page.getByText("Reconnecting", { exact: true })).toHaveCount(0);
  }

  state.accessUnavailable = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Your open work is still here.", { exact: false })).toBeVisible();
  await expect(draft).toHaveValue("This draft must survive tab return and token refresh.");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  state.accessUnavailable = false;
  await page.getByRole("button", { name: "Retry access check" }).click();
  await expect(page.getByText("Your open work is still here.", { exact: false })).toHaveCount(0);
  expect(state.unexpectedMutations).toEqual([]);
});

test("@member-ui membership revocation and sign-out still close the member boundary", async ({
  context,
  page,
  baseURL,
}) => {
  const state = await prepareMemberBrowser(context, baseURL);
  await page.goto("/app/stories", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Submit Story", exact: true })).toBeVisible();
  state.communityAccess = false;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page).toHaveURL(/\/onboarding$/);
  await broadcastMemberAuth(page, "SIGNED_OUT");
  await expect(page).toHaveURL(/\/auth\?/);
  await expect(page.getByRole("button", { name: "Submit Story", exact: true })).toHaveCount(0);
  expect(state.unexpectedMutations).toEqual([]);
});

test("@member-ui account changes clear drafts and obsolete access cannot revive a prior account", async ({
  context,
  page,
  baseURL,
}) => {
  const state = await prepareMemberBrowser(context, baseURL);
  await page.goto("/app/stories", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Submit Story", exact: true }).click();
  const draft = page.getByPlaceholder("Write your story here (Markdown is supported)...");
  await draft.fill("Private draft for the first account");
  let release!: () => void;
  state.holdNextIdentityCheck = new Promise<void>((resolve) => {
    release = resolve;
  });
  state.isSuperAdmin = true;
  await broadcastMemberAuth(page, "TOKEN_REFRESHED");
  await expect.poll(() => state.heldIdentityChecks).toBe(1);
  state.isSuperAdmin = false;
  await broadcastMemberAuth(page, "SIGNED_IN", "00000000-0000-4000-8000-000000000002");
  await expect(draft).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit Story", exact: true })).toBeVisible();
  await broadcastMemberAuth(page, "SIGNED_IN");
  await expect(page.getByRole("button", { name: "Submit Story", exact: true })).toBeVisible();
  release();
  // Drain the held browser request, then assert the last account projection.
  await page.waitForResponse(
    (response) => response.url().includes("/rpc/get_my_admin_access") && response.status() === 200,
  );
  await expect(page.getByRole("link", { name: "Admin control plane", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Submit Story", exact: true }).click();
  await expect(draft).toHaveValue("");
  expect(state.unexpectedMutations).toEqual([]);
});

test("@member-ui initial membership verification failure fails closed and can recover", async ({
  context,
  page,
  baseURL,
}) => {
  const state = await prepareMemberBrowser(context, baseURL);
  state.accessUnavailable = true;
  await page.goto("/app/stories", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Workspace access not verified" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit Story", exact: true })).toHaveCount(0);
  state.accessUnavailable = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Submit Story", exact: true })).toBeVisible();
  expect(state.unexpectedMutations).toEqual([]);
});

test("@member-ui I/O-only access has named keyboard-safe drawers and canonical navigation", async ({
  context,
  page,
  baseURL,
}) => {
  const state = await prepareMemberBrowser(context, baseURL);
  state.communityAccess = false;
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto("/io?view=overview", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Intelligence, routed with purpose.", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "I/O Port sections" })).toHaveCount(0);
  const trigger = page.getByRole("button", { name: "Open I/O navigation" });
  await trigger.click();
  const nav = page.getByRole("dialog", { name: "I/O navigation", exact: true });
  await expect(nav).toBeVisible();
  await nav.getByRole("button", { name: "Terminal", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(nav).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await nav.getByRole("button", { name: "Terminal", exact: true }).click();
  await expect(page).toHaveURL(/\/io\?view=terminal$/);
  await expect(page.getByRole("heading", { name: "I/O Terminal", exact: true })).toBeVisible();
  await expect(nav).toBeHidden();
  const inspectorTrigger = page.getByRole("button", { name: "Show activity inspector" });
  await inspectorTrigger.click();
  const inspector = page.getByRole("dialog", { name: "Evidence and activity" });
  await expect(inspector).toBeVisible();
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press("Tab");
    expect(await inspector.evaluate((element) => element.contains(document.activeElement))).toBe(
      true,
    );
  }
  await page.keyboard.press("Escape");
  await expect(inspectorTrigger).toBeFocused();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "I/O Terminal", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations
      .filter(({ impact }) => impact === "serious" || impact === "critical")
      .map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) })),
  ).toEqual([]);
  expect(state.unexpectedMutations).toEqual([]);
});
