import { expect, test } from "@playwright/test";
import { broadcastMemberAuth, prepareMemberBrowser } from "./fixtures/member-browser";

const owner = "00000000-0000-4000-8000-000000000001";
const requestId = "96900000-0000-4000-8000-000000000011";
const path = `${owner}/${requestId}/96900000-0000-4000-8000-000000000012.json`;

for (const changeAccount of [false, true]) {
  test(`@member-ui privacy download ${changeAccount ? "discards a late link after account change" : "preserves settings and downloads only the owned artifact"}`, async ({
    context,
    page,
    baseURL,
  }) => {
    await prepareMemberBrowser(context, baseURL);
    await context.route("**/rest/v1/rpc/list_my_account_privacy_requests", (route) =>
      route.fulfill({
        json: [
          {
            request_id: requestId,
            request_type: "export",
            request_state: "ready",
            member_note: null,
            operator_note: null,
            version: 3,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            artifact_expires_at: new Date(Date.now() + 86400000).toISOString(),
          },
        ],
      }),
    );
    await context.route("**/rest/v1/rpc/get_my_account_export", (route) =>
      route.fulfill({
        json: {
          bucket: "account-exports",
          path,
          sha256: "a".repeat(64),
          byte_size: 120,
          expires_in: 300,
        },
      }),
    );
    let release!: () => void;
    const signing = new Promise<void>((resolve) => {
      release = resolve;
    });
    let signed = 0;
    let fetched = 0;
    await context.route("**/storage/v1/object/sign/account-exports/**", async (route) => {
      if (route.request().method() === "POST") {
        signed++;
        expect(route.request().postDataJSON().expiresIn).toBe(300);
        if (changeAccount) await signing;
        await route.fulfill({
          json: { signedURL: `/object/sign/account-exports/${path}?token=synthetic-export` },
        });
      } else {
        fetched++;
        await route.fulfill({
          body: "{}",
          contentType: "application/json",
          headers: {
            "Content-Disposition": "attachment; filename=indus-orbit-account-export.json",
          },
        });
      }
    });
    await page.goto("/app/settings", { waitUntil: "domcontentloaded" });
    const note = page.getByRole("textbox", { name: "Optional note for the privacy team" });
    await note.fill("Keep this unsent privacy note");
    const download = changeAccount ? null : page.waitForEvent("download");
    await page.getByRole("button", { name: "Download", exact: true }).click();
    await expect.poll(() => signed).toBe(1);
    if (changeAccount) {
      const other = await context.newPage();
      await other.goto("/", { waitUntil: "domcontentloaded" });
      await broadcastMemberAuth(other, "SIGNED_IN", "00000000-0000-4000-8000-000000000002");
      await expect(note).toHaveValue("");
      release();
      await expect(page.getByRole("button", { name: "Download", exact: true })).toBeEnabled();
      expect(fetched).toBe(0);
    } else {
      expect((await download!).suggestedFilename()).toBe("indus-orbit-account-export.json");
      await expect(note).toHaveValue("Keep this unsent privacy note");
      expect(fetched).toBe(1);
    }
    await expect(page).toHaveURL(/\/app\/settings$/);
  });
}
