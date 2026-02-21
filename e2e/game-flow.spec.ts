import { expect, test } from "@playwright/test";
import { MockGameServer } from "./mockGameServer";

let mockServer: MockGameServer;

test.beforeAll(() => {
  mockServer = new MockGameServer(8099);
});

test.afterAll(async () => {
  await mockServer.stop();
});

test("connect, join, start round, enforce follow suit, and play legal card", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("WS URL").fill("ws://127.0.0.1:8099/ws");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByRole("button", { name: "Join Game" })).toBeEnabled();

  await page.getByRole("button", { name: "Join Game" }).click();
  await expect(page).toHaveURL(/\/rules$/);

  await page.getByRole("button", { name: "Start Round" }).click();
  await page.getByRole("button", { name: "Go To Table" }).click();
  await expect(page).toHaveURL(/\/table$/);
  await expect(page.getByText("Lead Suit: Hearts")).toBeVisible();

  const illegalCard = page.getByRole("button", { name: "Card KS" });
  await expect(illegalCard).toBeDisabled();

  const legalCard = page.getByRole("button", { name: "Card AH" });
  await legalCard.click();
  await page.getByRole("button", { name: "Play Selected" }).click();

  await expect(page.getByText("Trick 0 winner: P1 (P2:7H, P1:AH)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Card AH" })).toHaveCount(0);
});
