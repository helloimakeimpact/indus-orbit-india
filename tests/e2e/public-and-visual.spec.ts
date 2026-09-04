import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicRoutes = [
  { path: "/io-port", heading: "Intelligence has a port of call." },
  { path: "/brand", heading: "The Indus Orbit identity kit" },
] as const;

for (const route of publicRoutes) {
  test(`@public ${route.path} renders without serious accessibility failures`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations
      .filter(({ impact }) => impact === "critical" || impact === "serious")
      .flatMap((violation) =>
        violation.nodes.map((node) => `${violation.id}: ${node.target.join(" ")} — ${node.html}`),
      );
    expect(serious).toEqual([]);
  });
}

test("@public brand contact card exposes both safe downloads", async ({ page }) => {
  await page.goto("/brand");
  await expect(page.getByRole("heading", { name: "Visiting card" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download visiting card (.pdf)" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Save contact (.vcf)" })).toBeEnabled();
  await expect(
    page.getByText("The General Intelligence Company of India", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Made of Many Minds.", { exact: true })).toBeVisible();
});

test("@visual visiting card layout", async ({ page }) => {
  await page.goto("/brand");
  const heading = page.getByRole("heading", { name: "Visiting card" });
  const section = page.locator("section").filter({ has: heading }).first();
  await expect(section).toHaveScreenshot("visiting-card.png", {
    animations: "disabled",
    caret: "hide",
    maxDiffPixelRatio: 0.01,
  });
});
