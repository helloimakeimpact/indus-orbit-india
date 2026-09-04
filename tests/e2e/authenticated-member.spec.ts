import { expect, test } from "@playwright/test";

test("@member-auth I/O view survives direct navigation and reload", async ({ page }) => {
  test.skip(
    !process.env.PLAYWRIGHT_MEMBER_STORAGE_STATE,
    "Set PLAYWRIGHT_MEMBER_STORAGE_STATE to an authenticated Supabase browser state.",
  );

  await page.goto("/io?view=overview");
  await expect(page.getByRole("heading", { name: /I\/O Port/i }).first()).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/io\?view=overview$/);
  await expect(page.getByRole("heading", { name: /I\/O Port/i }).first()).toBeVisible();
});

test("@member-auth I/O navigation changes the canonical view instead of scrolling", async ({
  page,
}) => {
  test.skip(!process.env.PLAYWRIGHT_MEMBER_STORAGE_STATE, "Authenticated state is required.");

  await page.goto("/io?view=overview");
  const candidates = ["Sessions", "Terminal", "Model routes", "Capacity", "Evidence"];
  for (const label of candidates) {
    const link = page.getByRole("link", { name: label, exact: true });
    if (!(await link.count())) continue;
    await link.click();
    await expect(page).toHaveURL(/\/io\?view=[a-z-]+$/);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(80);
  }
});
