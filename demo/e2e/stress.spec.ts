import { test, expect, type Page } from "@playwright/test"

/**
 * Stress & Edge-Case E2E Tests
 *
 * 검증 기준:
 * 1. Race condition — 빠른 연속 조작 시 상태 정합성
 * 2. Cleanup — 비동기 작업 중 컴포넌트 전환 시 에러/누수
 * 3. Shared state — 여러 컴포넌트가 같은 서비스를 공유할 때 동기화
 * 4. Re-render stability — 불필요한 깜빡임이나 상태 초기화 없는지
 */

test.describe("Stress & Edge-Case Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Collect console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log(`[CONSOLE ERROR] ${msg.text()}`)
      }
    })
    await page.goto("/")
    await expect(page.locator("h1")).toHaveText("effect-react Demo")
  })

  // ─── 1. Race condition: 빠른 연속 클릭 ───

  test("Counter: rapid 20 increments produce correct final value", async ({ page }) => {
    const section = page.locator("section", { hasText: "useService + useEffectCallback" })
    const counterValue = section.locator("[data-testid='counter-value']")
    await expect(counterValue).toHaveText("0", { timeout: 5000 })

    const plusBtn = section.getByRole("button", { name: "+" })

    // 20회 빠르게 연속 클릭 (await 없이 fire-and-forget)
    for (let i = 0; i < 20; i++) {
      await plusBtn.click({ delay: 0 })
    }

    // 최종 값이 정확히 20이어야 함
    await expect(counterValue).toHaveText("20", { timeout: 10000 })
  })

  test("Counter: mixed rapid increment/decrement", async ({ page }) => {
    const section = page.locator("section", { hasText: "useService + useEffectCallback" })
    const counterValue = section.locator("[data-testid='counter-value']")
    await expect(counterValue).toHaveText("0", { timeout: 5000 })

    const plusBtn = section.getByRole("button", { name: "+" })
    const minusBtn = section.getByRole("button", { name: "−" })

    // +5, -3 = net +2
    for (let i = 0; i < 5; i++) await plusBtn.click({ delay: 0 })
    await expect(counterValue).toHaveText("5", { timeout: 5000 })
    for (let i = 0; i < 3; i++) await minusBtn.click({ delay: 0 })

    await expect(counterValue).toHaveText("2", { timeout: 5000 })
  })

  // ─── 2. Race condition: useRunEffect 빠른 deps 전환 ───

  test("RunEffect: rapid user switching shows only the last selected user", async ({ page }) => {
    const section = page.locator("section", { hasText: /^2\. useRunEffect/ })
    await expect(section.locator("text=Alice")).toBeVisible({ timeout: 5000 })

    // 빠르게 User1 → User2 → User3 → User1 → User3 전환
    await section.getByRole("button", { name: "User 2" }).click()
    await section.getByRole("button", { name: "User 3" }).click()
    await section.getByRole("button", { name: "User 1" }).click()
    await section.getByRole("button", { name: "User 3" }).click()

    // 마지막 선택인 User 3(Charlie)만 최종 표시되어야 함
    await expect(section.locator("text=Charlie")).toBeVisible({ timeout: 5000 })
    await expect(section.locator("text=PM")).toBeVisible()

    // User 1, 2의 데이터가 표시되면 안됨
    await expect(section.locator("text=Alice")).not.toBeVisible()
    await expect(section.locator("text=Bob")).not.toBeVisible()
  })

  // ─── 3. Shared state: Counter ↔ ReducerDemo 서비스 공유 ───

  test("Counter and ReducerDemo share CounterService state", async ({ page }) => {
    const counterSection = page.locator("section", { hasText: "useService + useEffectCallback" })
    const reducerSection = page.locator("section", { hasText: "useEffectReducer" })

    const counterValue = counterSection.locator("[data-testid='counter-value']")
    await expect(counterValue).toHaveText("0", { timeout: 5000 })

    // Counter에서 3번 increment
    const plusBtn = counterSection.getByRole("button", { name: "+" })
    await plusBtn.click()
    await plusBtn.click()
    await plusBtn.click()
    await expect(counterValue).toHaveText("3", { timeout: 5000 })

    // ReducerDemo에서 "Load from Service" 클릭 → 같은 CounterService에서 가져옴
    await reducerSection.getByRole("button", { name: /Load from Service/ }).click()

    // ReducerDemo가 CounterService에서 가져온 값이 3이어야 함 (공유 상태)
    const reducerDisplay = reducerSection.locator("span").filter({ hasText: /^-?\d+$/ }).first()
    await expect(reducerDisplay).toHaveText("3", { timeout: 5000 })
    await expect(reducerSection.locator("text=Source: server")).toBeVisible()
  })

  // ─── 4. Nested Provider: 부모/자식 서비스 격리 확인 ───

  test("NestedProvider: parent theme stays light when child toggles dark", async ({ page }) => {
    const parentTheme = page.locator("[data-testid='parent-theme']")
    const nestedTheme = page.locator("[data-testid='nested-theme']")

    await expect(parentTheme).toContainText("light", { timeout: 5000 })
    await expect(nestedTheme).toContainText("light", { timeout: 5000 })

    // Dark mode 토글
    await page.getByLabel("Dark Mode").click()
    await expect(nestedTheme).toContainText("dark", { timeout: 3000 })

    // 부모는 여전히 light — 서비스 격리 확인
    await expect(parentTheme).toContainText("light")

    // 다시 light로
    await page.getByLabel("Dark Mode").click()
    await expect(nestedTheme).toContainText("light", { timeout: 3000 })
    await expect(parentTheme).toContainText("light")
  })

  test("NestedProvider: rapid dark/light toggle does not break state", async ({ page }) => {
    const nestedTheme = page.locator("[data-testid='nested-theme']")
    await expect(nestedTheme).toContainText("light", { timeout: 5000 })

    const checkbox = page.getByLabel("Dark Mode")

    // 빠르게 5회 토글
    for (let i = 0; i < 5; i++) {
      await checkbox.click()
    }

    // 5회 토글 = 홀수 → dark
    await expect(nestedTheme).toContainText("dark", { timeout: 5000 })

    // 1번 더 → light
    await checkbox.click()
    await expect(nestedTheme).toContainText("light", { timeout: 5000 })
  })

  // ─── 5. useEffectStateAsync: 비동기 중 연속 조작 ───

  test("AsyncDemo: rapid fetch does not corrupt state", async ({ page }) => {
    const section = page.locator("section", { hasText: "Async + isPending" })
    await expect(section.locator("span").filter({ hasText: /^\d+$/ }).first()).toBeVisible({ timeout: 3000 })

    // "Set to 42" → "Fetch New" → "Reset to 0" 빠르게 연속
    await section.getByRole("button", { name: "Set to 42 (plain value)" }).click()
    await section.getByRole("button", { name: "Fetch New (Effect)" }).click()
    await section.getByRole("button", { name: "Reset to 0" }).click()

    // 마지막 조작은 plain value 0 → 즉시 반영
    const valueDisplay = section.locator("span", { hasText: /^0$/ }).first()
    await expect(valueDisplay).toBeVisible({ timeout: 2000 })
  })

  test("TodoApp: add multiple todos rapidly", async ({ page }) => {
    const section = page.locator("section", { hasText: "useEffectStateAsync — Todo" })
    await expect(section.locator("text=Learn Effect-TS")).toBeVisible({ timeout: 5000 })

    const input = section.locator("input[type='text']")
    const addBtn = section.getByRole("button", { name: "Add" })

    // 3개 연속 빠르게 추가
    await input.fill("Todo A")
    await addBtn.click()
    await input.fill("Todo B")
    await addBtn.click()
    await input.fill("Todo C")
    await addBtn.click()

    // 3개 모두 추가되어야 함
    await expect(section.locator("text=Todo A")).toBeVisible({ timeout: 5000 })
    await expect(section.locator("text=Todo B")).toBeVisible({ timeout: 5000 })
    await expect(section.locator("text=Todo C")).toBeVisible({ timeout: 5000 })
  })

  // ─── 6. useEffectReducer: sync/async 혼합 연속 dispatch ───

  test("ReducerDemo: sync dispatch during async does not lose sync state", async ({ page }) => {
    const section = page.locator("section", { hasText: "useEffectReducer" })
    const display = section.locator("span").filter({ hasText: /^-?\d+$/ }).first()
    await expect(display).toHaveText("0")

    // async dispatch 시작 (500ms delay)
    await section.getByRole("button", { name: /Load from Service/ }).click()

    // async 대기 중 sync increment 3번
    await section.getByRole("button", { name: "+", exact: true }).click()
    await section.getByRole("button", { name: "+", exact: true }).click()
    await section.getByRole("button", { name: "+", exact: true }).click()

    // sync dispatch가 async를 override해야 함 → 값 3
    await expect(display).toHaveText("3")
    await expect(section.locator("text=Source: sync")).toBeVisible()
  })

  // ─── 7. useEffectMemo: 빠른 변경 시 정합성 ───

  test("MemoDemo: rapid add + sort toggle produces correct results", async ({ page }) => {
    const section = page.locator("section", { hasText: "useEffectMemo" })
    await expect(section.locator("text=Sum: 45")).toBeVisible()

    // 3개 빠르게 추가
    const addBtn = section.getByRole("button", { name: "Add Random" })
    await addBtn.click()
    await addBtn.click()
    await addBtn.click()

    // Sort 토글
    await section.getByRole("button", { name: /Sort:/ }).click()

    // 12개 아이템 (9 + 3), 내림차순이어야 함
    const sortedText = await section.locator("div", { hasText: /^Sorted:/ }).first().textContent()
    const numbers = sortedText!.match(/\d+/g)!.map(Number)

    expect(numbers.length).toBe(12)
    // 내림차순 확인
    for (let i = 0; i < numbers.length - 1; i++) {
      expect(numbers[i]).toBeGreaterThanOrEqual(numbers[i + 1])
    }
  })

  // ─── 8. 콘솔 에러 없이 전체 페이지 동작 확인 ───

  test("No console errors during full interaction flow", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text())
      }
    })

    // 모든 섹션과 상호작용
    const counterSection = page.locator("section", { hasText: "useService + useEffectCallback" })
    await expect(counterSection.locator("[data-testid='counter-value']")).toHaveText("0", { timeout: 5000 })

    await counterSection.getByRole("button", { name: "+" }).click()
    await counterSection.getByRole("button", { name: "+" }).click()
    await counterSection.getByRole("button", { name: "Reset" }).click()

    const runEffectSection = page.locator("section", { hasText: /^2\. useRunEffect/ })
    await expect(runEffectSection.locator("text=Alice")).toBeVisible({ timeout: 5000 })
    await runEffectSection.getByRole("button", { name: "User 2" }).click()
    await runEffectSection.getByRole("button", { name: "User 3" }).click()

    const todoSection = page.locator("section", { hasText: "useEffectStateAsync — Todo" })
    await expect(todoSection.locator("text=Learn Effect-TS")).toBeVisible({ timeout: 5000 })
    const input = todoSection.locator("input[type='text']")
    await input.fill("Test todo")
    await todoSection.getByRole("button", { name: "Add" }).click()

    const asyncSection = page.locator("section", { hasText: "Async + isPending" })
    await expect(asyncSection.locator("span").filter({ hasText: /^\d+$/ }).first()).toBeVisible({ timeout: 3000 })
    await asyncSection.getByRole("button", { name: "Set to 42 (plain value)" }).click()

    await page.getByLabel("Dark Mode").click()
    await expect(page.locator("[data-testid='nested-theme']")).toContainText("dark", { timeout: 3000 })

    // 2초 대기 후 에러 확인
    await page.waitForTimeout(2000)

    // 콘솔 에러가 없어야 함
    expect(errors).toEqual([])
  })

  // ─── 9. Counter reset 후 재사용 ───

  test("Counter: reset then re-increment works correctly", async ({ page }) => {
    const section = page.locator("section", { hasText: "useService + useEffectCallback" })
    const counterValue = section.locator("[data-testid='counter-value']")
    await expect(counterValue).toHaveText("0", { timeout: 5000 })

    // Increment 3 times
    const plusBtn = section.getByRole("button", { name: "+" })
    await plusBtn.click()
    await plusBtn.click()
    await plusBtn.click()
    await expect(counterValue).toHaveText("3", { timeout: 5000 })

    // Reset
    await section.getByRole("button", { name: "Reset" }).click()
    await expect(counterValue).toHaveText("...", { timeout: 2000 })

    // Re-increment — should fetch current service value (3) then increment
    await plusBtn.click()
    await expect(counterValue).toHaveText("4", { timeout: 5000 })
  })

  // ─── 10. SyncCounter: 음수 경계 ───

  test("SyncCounter: can go negative", async ({ page }) => {
    const section = page.locator("section", { hasText: /^3\. useEffectState/ })
    const display = section.locator("span").filter({ hasText: /^-?\d+$/ }).first()

    const minusBtn = section.getByRole("button", { name: "−" }).first()
    await minusBtn.click()
    await minusBtn.click()

    await expect(display).toHaveText("-2")
  })
})
