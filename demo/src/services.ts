/**
 * Demo services — simulated API layer using Effect-TS
 */
import { Context, Effect, Layer } from "effect"

// --- Todo Service ---

export interface Todo {
  readonly id: number
  readonly title: string
  readonly completed: boolean
}

export class TodoService extends Context.Tag("TodoService")<
  TodoService,
  {
    readonly getAll: Effect.Effect<readonly Todo[]>
    readonly add: (title: string) => Effect.Effect<Todo>
    readonly toggle: (id: number) => Effect.Effect<void>
    readonly remove: (id: number) => Effect.Effect<void>
  }
>() {}

// In-memory implementation
const makeTodoService = Effect.sync(() => {
  let todos: Todo[] = [
    { id: 1, title: "Learn Effect-TS", completed: true },
    { id: 2, title: "Build effect-react library", completed: true },
    { id: 3, title: "Create a demo app", completed: false },
  ]
  let nextId = 4

  return TodoService.of({
    getAll: Effect.sync(() => [...todos]),

    add: (title: string) =>
      Effect.sync(() => {
        const todo: Todo = { id: nextId++, title, completed: false }
        todos = [...todos, todo]
        return todo
      }),

    toggle: (id: number) =>
      Effect.sync(() => {
        const found = todos.find((t) => t.id === id)
        if (!found) return
        const updated = { ...found, completed: !found.completed }
        todos = todos.map((t) => (t.id === id ? updated : t))
      }),

    remove: (id: number) =>
      Effect.sync(() => {
        todos = todos.filter((t) => t.id !== id)
      }),
  })
})

export const TodoServiceLive = Layer.effect(TodoService, makeTodoService)

// --- Counter Service ---

export class CounterService extends Context.Tag("CounterService")<
  CounterService,
  {
    readonly get: Effect.Effect<number>
    readonly increment: Effect.Effect<number>
    readonly decrement: Effect.Effect<number>
  }
>() {}

const makeCounterService = Effect.sync(() => {
  let count = 0

  return CounterService.of({
    get: Effect.sync(() => count),
    increment: Effect.sync(() => ++count),
    decrement: Effect.sync(() => --count),
  })
})

export const CounterServiceLive = Layer.effect(CounterService, makeCounterService)

// --- Theme Service (for nested provider demo) ---

export class ThemeService extends Context.Tag("ThemeService")<
  ThemeService,
  {
    readonly current: Effect.Effect<string>
    readonly colors: Effect.Effect<{ bg: string; fg: string; accent: string }>
  }
>() {}

const makeThemeService = (themeName: string, colors: { bg: string; fg: string; accent: string }) =>
  Layer.succeed(ThemeService, ThemeService.of({
    current: Effect.succeed(themeName),
    colors: Effect.succeed(colors),
  }))

export const LightThemeLayer = makeThemeService("light", {
  bg: "#ffffff",
  fg: "#1a1a1a",
  accent: "#0070f3",
})

export const DarkThemeLayer = makeThemeService("dark", {
  bg: "#1a1a2e",
  fg: "#e0e0e0",
  accent: "#64ffda",
})

// --- App Layer (combines all services) ---

export const AppLayer = Layer.mergeAll(TodoServiceLive, CounterServiceLive, LightThemeLayer)
