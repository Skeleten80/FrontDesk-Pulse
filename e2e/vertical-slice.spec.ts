import { test, expect } from "@playwright/test";

test.describe("FrontDesk Pulse vertical slice", () => {
  test("demo owner can sign in and open dashboard", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("owner@precisioncnc.demo");
    await page.getByLabel("Password").fill("DemoOwner123!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText("Business Health Score")).toBeVisible();
  });
});
