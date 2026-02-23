import { test, expect } from "@playwright/test"

const screenshotDir = "./e2e/screenshots/bank"

test.describe("Bank App — Screenshot Capture", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("h1")).toHaveText("effect-react Demo")
    // Bank tab is active by default
    await expect(page.locator("text=Effect Bank")).toBeVisible({ timeout: 5000 })
    // Wait for accounts to load
    await expect(page.locator("[data-testid='account-acc-1']")).toBeVisible({ timeout: 5000 })
  })

  test("1. Dashboard — initial state with all accounts", async ({ page }) => {
    // Verify all 3 accounts are visible
    await expect(page.locator("[data-testid='account-acc-1']")).toBeVisible()
    await expect(page.locator("[data-testid='account-acc-2']")).toBeVisible()
    await expect(page.locator("[data-testid='account-acc-3']")).toBeVisible()

    // Fee policy badge shows Standard
    await expect(page.locator("[data-testid='fee-policy-badge']")).toContainText("Standard")

    // Full page screenshot
    await page.screenshot({ path: `${screenshotDir}/01-bank-dashboard.png`, fullPage: true })
  })

  test("2. Deposit — successful deposit to Checking Account", async ({ page }) => {
    // Checking Account (acc-1) is selected by default
    await expect(page.locator("[data-testid='account-acc-1']")).toBeVisible()

    // Enter amount and submit deposit
    await page.locator("[data-testid='amount-input']").fill("500000")
    await page.locator("[data-testid='submit-tx']").click()

    // Wait for success message
    await expect(page.locator("[data-testid='tx-message']")).toBeVisible({ timeout: 5000 })
    await expect(page.locator("[data-testid='tx-message']")).toContainText("입금 완료")

    await page.screenshot({ path: `${screenshotDir}/02-bank-deposit.png`, fullPage: true })
  })

  test("3. Withdrawal — successful withdrawal from Checking Account", async ({ page }) => {
    // Select Checking Account
    await page.locator("[data-testid='account-acc-1']").click()

    // Switch to Withdraw tab
    await page.getByRole("button", { name: "Withdraw" }).click()

    // Enter amount and submit
    await page.locator("[data-testid='amount-input']").fill("200000")
    await page.locator("[data-testid='submit-tx']").click()

    // Wait for success message
    await expect(page.locator("[data-testid='tx-message']")).toBeVisible({ timeout: 5000 })
    await expect(page.locator("[data-testid='tx-message']")).toContainText("출금 완료")

    await page.screenshot({ path: `${screenshotDir}/03-bank-withdrawal.png`, fullPage: true })
  })

  test("4. Transfer — successful transfer between accounts", async ({ page }) => {
    // Select Checking Account
    await page.locator("[data-testid='account-acc-1']").click()

    // Switch to Transfer tab
    await page.getByRole("button", { name: "Transfer" }).click()

    // Select destination account (Savings)
    await page.locator("select").selectOption("acc-2")

    // Enter amount and submit
    await page.locator("[data-testid='amount-input']").fill("100000")
    await page.locator("[data-testid='submit-tx']").click()

    // Wait for success message
    await expect(page.locator("[data-testid='tx-message']")).toBeVisible({ timeout: 5000 })
    await expect(page.locator("[data-testid='tx-message']")).toContainText("이체 완료")

    await page.screenshot({ path: `${screenshotDir}/04-bank-transfer.png`, fullPage: true })
  })

  test("5. Premium mode — toggle premium and verify no fee", async ({ page }) => {
    // Toggle premium
    await page.locator("[data-testid='premium-toggle']").click()

    // Wait for premium badge
    await expect(page.locator("[data-testid='fee-policy-badge']")).toContainText("Premium", { timeout: 3000 })

    // Perform a transfer to show no fee
    await page.locator("[data-testid='account-acc-1']").click()
    await page.getByRole("button", { name: "Transfer" }).click()
    await page.locator("select").selectOption("acc-2")
    await page.locator("[data-testid='amount-input']").fill("100000")
    await page.locator("[data-testid='submit-tx']").click()

    await expect(page.locator("[data-testid='tx-message']")).toBeVisible({ timeout: 5000 })
    await expect(page.locator("[data-testid='tx-message']")).toContainText("이체 완료")

    await page.screenshot({ path: `${screenshotDir}/05-bank-premium.png`, fullPage: true })
  })

  test("6. Error — insufficient funds withdrawal", async ({ page }) => {
    // Select Checking Account (balance: 1,500,000)
    await page.locator("[data-testid='account-acc-1']").click()

    // Switch to Withdraw tab
    await page.getByRole("button", { name: "Withdraw" }).click()

    // Try to withdraw more than balance
    await page.locator("[data-testid='amount-input']").fill("99000000")
    await page.locator("[data-testid='submit-tx']").click()

    // Wait for error message
    await expect(page.locator("[data-testid='tx-message']")).toBeVisible({ timeout: 5000 })
    await expect(page.locator("[data-testid='tx-message']")).toContainText("Insufficient funds")

    await page.screenshot({ path: `${screenshotDir}/06-bank-error.png`, fullPage: true })
  })

  test("7. Transaction history — after multiple transactions", async ({ page }) => {
    // Perform a deposit
    await page.locator("[data-testid='account-acc-1']").click()
    await page.locator("[data-testid='amount-input']").fill("300000")
    await page.locator("[data-testid='submit-tx']").click()
    await expect(page.locator("[data-testid='tx-message']")).toContainText("입금 완료", { timeout: 5000 })

    // Perform a withdrawal
    await page.getByRole("button", { name: "Withdraw" }).click()
    await page.locator("[data-testid='amount-input']").fill("100000")
    await page.locator("[data-testid='submit-tx']").click()
    await expect(page.locator("[data-testid='tx-message']")).toContainText("출금 완료", { timeout: 5000 })

    // Transaction history should show both transactions
    await expect(page.locator("text=Transaction History")).toBeVisible()
    await expect(page.locator("text=Deposit to Checking Account")).toBeVisible({ timeout: 3000 })
    await expect(page.locator("text=Withdrawal from Checking Account")).toBeVisible({ timeout: 3000 })

    await page.screenshot({ path: `${screenshotDir}/07-bank-history.png`, fullPage: true })
  })

  test("8. Account switching — select different accounts", async ({ page }) => {
    // Select Savings Account
    await page.locator("[data-testid='account-acc-2']").click()

    // Verify the account is visually selected (blue border)
    const acc2 = page.locator("[data-testid='account-acc-2']")
    await expect(acc2).toHaveCSS("border-color", "rgb(49, 130, 206)", { timeout: 2000 })

    // Screenshot with Savings selected
    await page.screenshot({ path: `${screenshotDir}/08-bank-account-switch.png`, fullPage: true })
  })
})
