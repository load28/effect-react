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
    readonly toggle: (id: number) => Effect.Effect<Todo, Error>
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
      Effect.flatMap(
        Effect.sync(() => todos.find((t) => t.id === id)),
        (found) => {
          if (!found) return Effect.fail(new Error(`Todo ${id} not found`))
          const updated = { ...found, completed: !found.completed }
          todos = todos.map((t) => (t.id === id ? updated : t))
          return Effect.succeed(updated)
        },
      ),

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

// --- App Layer (combines all services) ---

export const AppLayer = Layer.mergeAll(TodoServiceLive, CounterServiceLive)
