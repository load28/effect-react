import { test, expect } from "@playwright/test"

test.describe("effect-react Demo E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    // Wait for the app to fully render
    await expect(page.locator("h1")).toHaveText("effect-react Demo")
  })

  // ─── Section 1: useService + useEffectCallback ───

  test.describe("1. useService + useEffectCallback (Counter)", () => {
    test("renders counter with initial value", async ({ page }) => {
      const section = page.locator("section", { hasText: "useService + useEffectCallback" })
      const counterValue = section.locator("[data-testid='counter-value']")

      // CounterService resolves and initial value loads
      await expect(counterValue).toBeVisible({ timeout: 5000 })
      await expect(counterValue).toHaveText("0")
    })

    test("increment and decrement work", async ({ page }) => {
      const section = page.locator("section", { hasText: "useService + useEffectCallback" })
      const counterValue = section.locator("[data-testid='counter-value']")
      await expect(counterValue).toHaveText("0", { timeout: 5000 })

      // Increment
      await section.getByRole("button", { name: "+" }).click()
      await expect(counterValue).toHaveText("1", { timeout: 2000 })

      await section.getByRole("button", { name: "+" }).click()
      await expect(counterValue).toHaveText("2", { timeout: 2000 })

      // Decrement
      await section.getByRole("button", { name: "−" }).click()
      await expect(counterValue).toHaveText("1", { timeout: 2000 })
    })

    test("reset clears counter result", async ({ page }) => {
      const section = page.locator("section", { hasText: "useService + useEffectCallback" })
      const counterValue = section.locator("[data-testid='counter-value']")
      await expect(counterValue).toHaveText("0", { timeout: 5000 })

      await section.getByRole("button", { name: "+" }).click()
      await expect(counterValue).toHaveText("1", { timeout: 2000 })

      await section.getByRole("button", { name: "Reset" }).click()
      // After reset, result goes back to Loading → shows "..."
      await expect(counterValue).toHaveText("...", { timeout: 2000 })
    })
  })

  // ─── Section 2: useRunEffect ───

  test.describe("2. useRunEffect (User Fetch)", () => {
    test("loads user data on mount", async ({ page }) => {
      const section = page.locator("section", { hasText: /^2\. useRunEffect/ })

      // Initially shows Loading
      await expect(section.locator("text=Loading user...")).toBeVisible()

      // After 600ms delay, shows user data
      await expect(section.locator("text=Alice")).toBeVisible({ timeout: 3000 })
      await expect(section.locator("text=Engineer")).toBeVisible()
    })

    test("switching users re-fetches data", async ({ page }) => {
      const section = page.locator("section", { hasText: /^2\. useRunEffect/ })
      await expect(section.locator("text=Alice")).toBeVisible({ timeout: 3000 })

      // Click User 2
      await section.getByRole("button", { name: "User 2" }).click()
      await expect(section.locator("text=Bob")).toBeVisible({ timeout: 3000 })
      await expect(section.locator("text=Designer")).toBeVisible()

      // Click User 3
      await section.getByRole("button", { name: "User 3" }).click()
      await expect(section.locator("text=Charlie")).toBeVisible({ timeout: 3000 })
      await expect(section.locator("text=PM")).toBeVisible()
    })
  })

  // ─── Section 3: useEffectState ───

  test.describe("3. useEffectState (SyncCounter)", () => {
    test("renders initial value immediately (no Loading)", async ({ page }) => {
      const section = page.locator("section", { hasText: /^3\. useEffectState/ })

      // Value is immediately 0 — no Loading state
      await expect(section.locator("span", { hasText: "0" }).first()).toBeVisible()
    })

    test("increment and decrement work synchronously", async ({ page }) => {
      const section = page.locator("section", { hasText: /^3\. useEffectState/ })

      const buttons = section.locator("div").first().locator("button")
      const display = section.locator("span").filter({ hasText: /^\d+$/ }).first()

      // Increment
      await section.getByRole("button", { name: "+", exact: true }).first().click()
      await expect(display).toHaveText("1")

      await section.getByRole("button", { name: "+", exact: true }).first().click()
      await expect(display).toHaveText("2")

      // Decrement
      await section.getByRole("button", { name: "−" }).first().click()
      await expect(display).toHaveText("1")
    })

    test("reset to plain value works", async ({ page }) => {
      const section = page.locator("section", { hasText: /^3\. useEffectState/ })

      // Increment a few times
      await section.getByRole("button", { name: "+", exact: true }).first().click()
      await section.getByRole("button", { name: "+", exact: true }).first().click()

      // Reset
      await section.getByRole("button", { name: "Reset (plain value)" }).click()

      const display = section.locator("span").filter({ hasText: /^0$/ }).first()
      await expect(display).toBeVisible()
    })
  })

  // ─── Section 4: useEffectStateAsync — Todo List ───

  test.describe("4. useEffectStateAsync (TodoApp)", () => {
    test("loads initial todos", async ({ page }) => {
      const section = page.locator("section", { hasText: "useEffectStateAsync — Todo" })

      // Wait for todos to load
      await expect(section.locator("text=Learn Effect-TS")).toBeVisible({ timeout: 5000 })
      await expect(section.locator("text=Build effect-react library")).toBeVisible()
      await expect(section.locator("text=Create a demo app")).toBeVisible()
    })

    test("can add a new todo", async ({ page }) => {
      const section = page.locator("section", { hasText: "useEffectStateAsync — Todo" })
      await expect(section.locator("text=Learn Effect-TS")).toBeVisible({ timeout: 5000 })

      // Type and add
      const input = section.locator("input[type='text']")
      await input.fill("Write E2E tests")
      await section.getByRole("button", { name: "Add" }).click()

      // New todo appears
      await expect(section.locator("text=Write E2E tests")).toBeVisible({ timeout: 2000 })
    })

    test("can toggle todo completion", async ({ page }) => {
      const section = page.locator("section", { hasText: "useEffectStateAsync — Todo" })
      await expect(section.locator("text=Create a demo app")).toBeVisible({ timeout: 5000 })

      // "Create a demo app" is initially uncompleted
      const todoItem = section.locator("li", { hasText: "Create a demo app" })
      const checkbox = todoItem.locator("input[type='checkbox']")

      // Toggle it
      await checkbox.click()
      // After toggle, it should have line-through style
      await expect(todoItem.locator("span")).toHaveCSS("text-decoration-line", "line-through", { timeout: 2000 })
    })

    test("can remove a todo", async ({ page }) => {
      const section = page.locator("section", { hasText: "useEffectStateAsync — Todo" })
      await expect(section.locator("text=Learn Effect-TS")).toBeVisible({ timeout: 5000 })

      const todoCount = await section.locator("li").count()

      // Remove "Learn Effect-TS"
      const todoItem = section.locator("li", { hasText: "Learn Effect-TS" })
      await todoItem.getByRole("button", { name: "x" }).click()

      // One less todo
      await expect(section.locator("li")).toHaveCount(todoCount - 1, { timeout: 2000 })
      await expect(section.locator("text=Learn Effect-TS")).not.toBeVisible()
    })
  })

  // ─── Section 5: useEffectStateAsync — Async + isPending ───

  test.describe("5. useEffectStateAsync (AsyncDemo)", () => {
    test("loads random number asynchronously", async ({ page }) => {
      const section = page.locator("section", { hasText: "Async + isPending" })

      // Initially loading
      await expect(section.locator("text=Loading...")).toBeVisible()

      // After 800ms, a number appears
      await expect(section.locator("span").filter({ hasText: /^\d+$/ }).first()).toBeVisible({ timeout: 3000 })
    })

    test("set to 42 (plain value) updates instantly", async ({ page }) => {
      const section = page.locator("section", { hasText: "Async + isPending" })

      // Wait for initial load
      await expect(section.locator("span").filter({ hasText: /^\d+$/ }).first()).toBeVisible({ timeout: 3000 })

      // Click "Set to 42"
      await section.getByRole("button", { name: "Set to 42 (plain value)" }).click()

      // Value should be 42 immediately
      await expect(section.locator("text=42").first()).toBeVisible()
    })

    test("reset to 0 works", async ({ page }) => {
      const section = page.locator("section", { hasText: "Async + isPending" })
      await expect(section.locator("span").filter({ hasText: /^\d+$/ }).first()).toBeVisible({ timeout: 3000 })

      await section.getByRole("button", { name: "Reset to 0" }).click()

      const valueDisplay = section.locator("span", { hasText: /^0$/ }).first()
      await expect(valueDisplay).toBeVisible()
    })
  })

  // ─── Section 6: useEffectReducer ───

  test.describe("6. useEffectReducer (ReducerDemo)", () => {
    test("renders with initial state", async ({ page }) => {
      const section = page.locator("section", { hasText: "useEffectReducer" })

      // Initial count is 0
      const display = section.locator("span", { hasText: /^0$/ }).first()
      await expect(display).toBeVisible()

      // Source is "initial"
      await expect(section.locator("text=Source: initial")).toBeVisible()
    })

    test("sync increment/decrement update immediately", async ({ page }) => {
      const section = page.locator("section", { hasText: "useEffectReducer" })
      const display = section.locator("span").filter({ hasText: /^-?\d+$/ }).first()

      // Increment
      await section.getByRole("button", { name: "+", exact: true }).click()
      await expect(display).toHaveText("1")
      await expect(section.locator("text=Source: sync")).toBeVisible()

      await section.getByRole("button", { name: "+", exact: true }).click()
      await expect(display).toHaveText("2")

      // Decrement
      await section.getByRole("button", { name: "−" }).click()
      await expect(display).toHaveText("1")
    })

    test("reset works", async ({ page }) => {
      const section = page.locator("section", { hasText: "useEffectReducer" })
      const display = section.locator("span").filter({ hasText: /^-?\d+$/ }).first()

      await section.getByRole("button", { name: "+", exact: true }).click()
      await section.getByRole("button", { name: "+", exact: true }).click()
      await expect(display).toHaveText("2")

      await section.getByRole("button", { name: "Reset (sync)" }).click()
      await expect(display).toHaveText("0")
    })

    test("async loadFromServer shows isPending then updates", async ({ page }) => {
      const section = page.locator("section", { hasText: "useEffectReducer" })
      const display = section.locator("span").filter({ hasText: /^-?\d+$/ }).first()

      // First increment a few times so counter service has a value
      await section.getByRole("button", { name: "+", exact: true }).click()

      // Click "Load from Service (async)"
      const loadBtn = section.getByRole("button", { name: /Load from Service/ })
      await loadBtn.click()

      // Button should show "Loading..." while pending
      await expect(section.getByRole("button", { name: "Loading..." })).toBeVisible()

      // After the 500ms delay, source becomes "server"
      await expect(section.locator("text=Source: server")).toBeVisible({ timeout: 3000 })
    })
  })

  // ─── Section 7: useEffectMemo ───

  test.describe("7. useEffectMemo (MemoDemo)", () => {
    test("renders sorted array and stats", async ({ page }) => {
      const section = page.locator("section", { hasText: "useEffectMemo" })

      // Default ascending sort
      await expect(section.locator("text=Sorted: [1, 2, 3, 4, 5, 6, 7, 8, 9]")).toBeVisible()

      // Stats
      await expect(section.locator("text=Sum: 45")).toBeVisible()
      await expect(section.locator("text=Min: 1")).toBeVisible()
      await expect(section.locator("text=Max: 9")).toBeVisible()
    })

    test("toggling sort order reverses the array", async ({ page }) => {
      const section = page.locator("section", { hasText: "useEffectMemo" })
      await expect(section.locator("text=Sorted: [1, 2, 3, 4, 5, 6, 7, 8, 9]")).toBeVisible()

      // Toggle to descending
      await section.getByRole("button", { name: /Sort:/ }).click()
      await expect(section.locator("text=Sorted: [9, 8, 7, 6, 5, 4, 3, 2, 1]")).toBeVisible()

      // Toggle back to ascending
      await section.getByRole("button", { name: /Sort:/ }).click()
      await expect(section.locator("text=Sorted: [1, 2, 3, 4, 5, 6, 7, 8, 9]")).toBeVisible()
    })

    test("remove first updates sorted array and stats", async ({ page }) => {
      const section = page.locator("section", { hasText: "useEffectMemo" })
      await expect(section.locator("text=Sum: 45")).toBeVisible()

      // Remove first element (5 from original [5, 3, 8, 1, 9, 2, 7, 4, 6])
      await section.getByRole("button", { name: "Remove First" }).click()

      // 45 - 5 = 40
      await expect(section.locator("text=Sum: 40")).toBeVisible()
      // Sorted without 5: [1, 2, 3, 4, 6, 7, 8, 9]
      await expect(section.locator("text=Sorted: [1, 2, 3, 4, 6, 7, 8, 9]")).toBeVisible()
    })

    test("add random updates the array", async ({ page }) => {
      const section = page.locator("section", { hasText: "useEffectMemo" })

      const initialSorted = await section.locator("div", { hasText: /^Sorted:/ }).first().textContent()

      // Add a random number
      await section.getByRole("button", { name: "Add Random" }).click()

      // The sorted text should change (10 items now)
      const updatedSorted = await section.locator("div", { hasText: /^Sorted:/ }).first().textContent()

      // Can't predict the random number, but array should be longer
      expect(updatedSorted).not.toBe(initialSorted)
    })
  })

  // ─── Section 8: Nested EffectProvider ───

  test.describe("8. Nested EffectProvider", () => {
    test("parent scope shows light theme", async ({ page }) => {
      const parentTheme = page.locator("[data-testid='parent-theme']")
      await expect(parentTheme).toContainText("light", { timeout: 5000 })
    })

    test("nested scope initially shows light theme", async ({ page }) => {
      const nestedTheme = page.locator("[data-testid='nested-theme']")
      await expect(nestedTheme).toContainText("light", { timeout: 5000 })
    })

    test("toggling dark mode changes nested theme but not parent", async ({ page }) => {
      const parentTheme = page.locator("[data-testid='parent-theme']")
      const nestedTheme = page.locator("[data-testid='nested-theme']")

      await expect(parentTheme).toContainText("light", { timeout: 5000 })
      await expect(nestedTheme).toContainText("light", { timeout: 5000 })

      // Toggle dark mode
      await page.getByLabel("Dark Mode").click()

      // Parent stays light
      await expect(parentTheme).toContainText("light", { timeout: 3000 })

      // Nested changes to dark
      await expect(nestedTheme).toContainText("dark", { timeout: 3000 })
    })

    test("themed label loads with theme context", async ({ page }) => {
      const themedLabel = page.locator("[data-testid='themed-label']")

      // Wait for the themed label to load (300ms delay)
      await expect(themedLabel).toBeVisible({ timeout: 5000 })
      await expect(themedLabel).toContainText("[light]")
      await expect(themedLabel).toContainText("Count:")
    })

    test("show/hide details toggle works", async ({ page }) => {
      const section = page.locator("section", { hasText: "Nested EffectProvider" })

      // Wait for services to resolve
      await expect(page.locator("[data-testid='themed-label']")).toBeVisible({ timeout: 5000 })

      // Click "Show Details"
      await section.getByRole("button", { name: "Show Details" }).click()

      const details = page.locator("[data-testid='theme-details']")
      await expect(details).toBeVisible()
      await expect(details).toContainText("CounterService (from parent)")

      // Click "Hide Details"
      await section.getByRole("button", { name: "Hide Details" }).click()
      await expect(details).not.toBeVisible()
    })
  })
})
