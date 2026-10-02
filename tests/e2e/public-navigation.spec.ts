import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("@public short-screen navigation traps focus, closes and follows the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 320 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("main", { name: "Indus Orbit website" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main", { name: "Indus Orbit website" })).toBeFocused();

  const trigger = page.getByRole("button", { name: "Open navigation", includeHidden: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Explore Indus Orbit" });
  await expect(dialog).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  for (let i = 0; i < 13; i += 1) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await dialog.getByRole("link", { name: "Contact", exact: true }).scrollIntoViewIfNeeded();
  const contact = await dialog.getByRole("link", { name: "Contact", exact: true }).boundingBox();
  expect(contact).not.toBeNull();
  expect(contact!.y).toBeGreaterThanOrEqual(0);
  expect(contact!.y + contact!.height).toBeLessThanOrEqual(320);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    axe.violations.filter(({ impact }) => impact === "serious" || impact === "critical"),
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("link", { name: "Contact", exact: true }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(dialog).toHaveCount(0);
  await trigger.click();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Primary", exact: true })).toBeVisible();
});

test("@public storage notice is in flow and works with blocked persistence", async ({ page }) => {
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === "indus-orbit-cookie-ack") throw new DOMException("Blocked", "SecurityError");
      return getItem.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === "indus-orbit-cookie-ack") throw new DOMException("Blocked", "SecurityError");
      return setItem.call(this, key, value);
    };
  });
  await page.setViewportSize({ width: 320, height: 320 });
  await page.goto("/");
  const notice = page.getByRole("region", { name: "On this device" });
  await notice.scrollIntoViewIfNeeded();
  await expect(notice).toBeVisible();
  expect(await notice.evaluate((element) => getComputedStyle(element).position)).toBe("static");
  await expect(notice.getByRole("button", { name: "Got it" })).toBeVisible();
  await expect(notice.getByRole("button", { name: /Accept|Decline/ })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await notice.getByRole("button", { name: "Got it" }).click();
  await expect(notice).toHaveCount(0);
  await page.getByRole("contentinfo").getByRole("link", { name: "About", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(notice).toHaveCount(0);
  await page.reload();
  await expect(notice).toHaveCount(1);
});
