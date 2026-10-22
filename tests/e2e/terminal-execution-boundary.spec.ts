import { expect, test } from "@playwright/test";
import { prepareMemberBrowser } from "./fixtures/member-browser";

test("@member-ui unverified runtime cannot execute any selected Terminal mode", async ({
  context,
  page,
  baseURL,
}) => {
  const state = await prepareMemberBrowser(context, baseURL);
  // This POST RPC is an inspection read, not an execution mutation.
  await context.route("**/rest/v1/rpc/list_my_io_terminal_sessions", (route) =>
    route.fulfill({ json: [] }),
  );
  await context.route("**/rest/v1/io_workspaces?*", (route) =>
    route.fulfill({
      json: [
        {
          id: "00000000-0000-4000-8000-000000000010",
          name: "Synthetic I/O workspace",
          slug: "synthetic-workspace",
          status: "active",
        },
      ],
    }),
  );
  const localRequests: string[] = [];
  await context.route("http://127.0.0.1:4096/**", (route) => {
    localRequests.push(`${route.request().method()} ${route.request().url()}`);
    return route.abort();
  });

  await page.goto("/io?view=terminal", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Synthetic I/O workspace", { exact: true })).toBeVisible();
  await expect(page.getByText("Local execution is paused", { exact: false })).toBeVisible();
  await page.getByLabel("OpenCode server password").fill("synthetic-credential-not-a-real-secret");
  await page.getByLabel("Session prompt", { exact: true }).fill("Inspect this synthetic project");
  const modes = page.getByLabel("Session mode", { exact: true });
  for (const mode of ["observe", "plan", "build", "run"]) {
    const choice = modes.getByRole("button", { name: mode, exact: true });
    await choice.click();
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Run local", exact: true })).toBeDisabled();
  }
  expect(localRequests).toEqual([]);
  expect(state.unexpectedMutations.filter((path) => /terminal|approval/.test(path))).toEqual([]);
});
