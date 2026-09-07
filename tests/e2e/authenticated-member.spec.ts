import { expect, test } from "@playwright/test";

test("@member-auth I/O view survives direct navigation and reload", async ({ page }) => {
  test.skip(
    !process.env.PLAYWRIGHT_MEMBER_STORAGE_STATE,
    "Set PLAYWRIGHT_MEMBER_STORAGE_STATE to an authenticated Supabase browser state.",
  );

  await page.goto("/io?view=terminal");
  await expect(page.getByRole("heading", { level: 1, name: "I/O Terminal" })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/io\?view=terminal$/);
  await expect(page.getByRole("heading", { level: 1, name: "I/O Terminal" })).toBeVisible();
});

test("@member-auth I/O navigation changes the canonical view instead of scrolling", async ({
  page,
}) => {
  test.skip(!process.env.PLAYWRIGHT_MEMBER_STORAGE_STATE, "Authenticated state is required.");

  await page.goto("/io?view=overview");
  const destinations = [
    { label: "Sessions", view: "sessions", heading: "Start an I/O session" },
    { label: "Terminal", view: "terminal", heading: "I/O Terminal" },
    { label: "Model routes", view: "routes", heading: "Model routes" },
    { label: "Capacity", view: "capacity", heading: "Capacity commons" },
    { label: "Evidence", view: "evidence", heading: "Route evidence" },
    { label: "Usage ledger", view: "ledger", heading: "Usage ledger" },
    { label: "Safety", view: "safety", heading: "Safety boundaries" },
    { label: "Overview", view: "overview", heading: "I/O workspace overview" },
  ] as const;

  for (const destination of destinations) {
    await page.getByRole("button", { name: destination.label, exact: true }).click();
    await expect(page).toHaveURL(`/io?view=${destination.view}`);
    await expect(
      page.getByRole("heading", { level: 1, name: destination.heading, exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(80);
  }
});
