import { test, expect } from "@playwright/test"

const screenshotDir = "./e2e/screenshots"

test.describe("Screenshot Capture — Verified Working State", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("h1")).toHaveText("effect-react Demo")
  })

  test("1. Counter — after increment to 3", async ({ page }) => {
    const section = page.locator("section", { hasText: "useService + useEffectCallback" })
    const counterValue = section.locator("[data-testid='counter-value']")
    await expect(counterValue).toHaveText("0", { timeout: 5000 })

    // Increment 3 times to show the counter works
    await section.getByRole("button", { name: "+" }).click()
    await expect(counterValue).toHaveText("1", { timeout: 2000 })
    await section.getByRole("button", { name: "+" }).click()
    await expect(counterValue).toHaveText("2", { timeout: 2000 })
    await section.getByRole("button", { name: "+" }).click()
    await expect(counterValue).toHaveText("3", { timeout: 2000 })

    await section.screenshot({ path: `${screenshotDir}/01-counter.png` })
  })

  test("2. RunEffect — user loaded successfully", async ({ page }) => {
    const section = page.locator("section", { hasText: /^2\. useRunEffect/ })

    // Wait for User 1 to load
    await expect(section.locator("text=Alice")).toBeVisible({ timeout: 5000 })
    await expect(section.locator("text=Engineer")).toBeVisible()

    await section.screenshot({ path: `${screenshotDir}/02-run-effect-user1.png` })

    // Switch to User 2 and wait for it to load
    await section.getByRole("button", { name: "User 2" }).click()
    await expect(section.locator("text=Bob")).toBeVisible({ timeout: 3000 })
    await expect(section.locator("text=Designer")).toBeVisible()

    await section.screenshot({ path: `${screenshotDir}/02-run-effect-user2.png` })
  })

  test("3. SyncCounter — after operations", async ({ page }) => {
    const section = page.locator("section", { hasText: /^3\. useEffectState/ })
    const display = section.locator("span").filter({ hasText: /^-?\d+$/ }).first()

    // Increment to 5
    for (let i = 0; i < 5; i++) {
      await section.getByRole("button", { name: "+", exact: true }).first().click()
    }
    await expect(display).toHaveText("5")

    await section.screenshot({ path: `${screenshotDir}/03-sync-counter.png` })
  })

  test("4. TodoApp — add and toggle todos", async ({ page }) => {
    const section = page.locator("section", { hasText: "useEffectStateAsync — Todo" })
    await expect(section.locator("text=Learn Effect-TS")).toBeVisible({ timeout: 5000 })

    // Add a new todo
    const input = section.locator("input[type='text']")
    await input.fill("Write Playwright E2E tests")
    await section.getByRole("button", { name: "Add" }).click()
    await expect(section.locator("text=Write Playwright E2E tests")).toBeVisible({ timeout: 2000 })

    // Toggle "Create a demo app" (initially uncompleted) to completed
    const todoItem = section.locator("li", { hasText: "Create a demo app" })
    await todoItem.locator("input[type='checkbox']").click()
    await expect(todoItem.locator("span")).toHaveCSS("text-decoration-line", "line-through", { timeout: 3000 })

    await section.screenshot({ path: `${screenshotDir}/04-todo-app.png` })
  })

  test("5. AsyncDemo — set to 42", async ({ page }) => {
    const section = page.locator("section", { hasText: "Async + isPending" })

    // Wait for initial async load
    await expect(section.locator("span").filter({ hasText: /^\d+$/ }).first()).toBeVisible({ timeout: 3000 })

    // Set to 42 (instant plain value)
    await section.getByRole("button", { name: "Set to 42 (plain value)" }).click()
    await expect(section.locator("text=42").first()).toBeVisible()

    await section.screenshot({ path: `${screenshotDir}/05-async-demo.png` })
  })

  test("6. ReducerDemo — sync and async actions", async ({ page }) => {
    const section = page.locator("section", { hasText: "useEffectReducer" })
    const display = section.locator("span").filter({ hasText: /^-?\d+$/ }).first()

    // Increment a few times
    await section.getByRole("button", { name: "+", exact: true }).click()
    await section.getByRole("button", { name: "+", exact: true }).click()
    await section.getByRole("button", { name: "+", exact: true }).click()
    await expect(display).toHaveText("3")
    await expect(section.locator("text=Source: sync")).toBeVisible()

    await section.screenshot({ path: `${screenshotDir}/06-reducer-sync.png` })

    // Load from server (async action)
    await section.getByRole("button", { name: /Load from Service/ }).click()
    await expect(section.locator("text=Source: server")).toBeVisible({ timeout: 3000 })

    await section.screenshot({ path: `${screenshotDir}/06-reducer-async.png` })
  })

  test("7. MemoDemo — sorted and descending", async ({ page }) => {
    const section = page.locator("section", { hasText: "useEffectMemo" })
    await expect(section.locator("text=Sorted: [1, 2, 3, 4, 5, 6, 7, 8, 9]")).toBeVisible()
    await expect(section.locator("text=Sum: 45")).toBeVisible()

    await section.screenshot({ path: `${screenshotDir}/07-memo-asc.png` })

    // Toggle to descending
    await section.getByRole("button", { name: /Sort:/ }).click()
    await expect(section.locator("text=Sorted: [9, 8, 7, 6, 5, 4, 3, 2, 1]")).toBeVisible()

    await section.screenshot({ path: `${screenshotDir}/07-memo-desc.png` })
  })

  test("8. NestedProvider — light and dark themes", async ({ page }) => {
    const section = page.locator("section", { hasText: "Nested EffectProvider" })
    const parentTheme = page.locator("[data-testid='parent-theme']")
    const nestedTheme = page.locator("[data-testid='nested-theme']")
    const themedLabel = page.locator("[data-testid='themed-label']")

    // Wait for everything to load
    await expect(parentTheme).toContainText("light", { timeout: 5000 })
    await expect(nestedTheme).toContainText("light", { timeout: 5000 })
    await expect(themedLabel).toBeVisible({ timeout: 5000 })

    // Show details
    await section.getByRole("button", { name: "Show Details" }).click()
    await expect(page.locator("[data-testid='theme-details']")).toBeVisible()

    await section.screenshot({ path: `${screenshotDir}/08-nested-light.png` })

    // Toggle dark mode
    await page.getByLabel("Dark Mode").click()
    await expect(nestedTheme).toContainText("dark", { timeout: 3000 })
    await expect(parentTheme).toContainText("light")

    await section.screenshot({ path: `${screenshotDir}/08-nested-dark.png` })
  })

  test("Full page — all components working", async ({ page }) => {
    // Wait for all async components to settle
    const counterValue = page.locator("[data-testid='counter-value']")
    await expect(counterValue).toHaveText("0", { timeout: 5000 })
    await expect(page.locator("text=Alice")).toBeVisible({ timeout: 5000 })
    await expect(page.locator("[data-testid='parent-theme']")).toContainText("light", { timeout: 5000 })

    await page.screenshot({ path: `${screenshotDir}/00-full-page.png`, fullPage: true })
  })
})
