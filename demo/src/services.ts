/**
 * Demo services — simulated API layer using Effect-TS
 *
 * Services expose SubscriptionRef for reactive state.
 * When state changes, all subscribers (useSubscriptionRef hooks)
 * are automatically notified — no refresh keys needed.
 */
import { Context, Effect, Layer, SubscriptionRef } from "effect"

// --- Todo Service ---

export interface Todo {
  readonly id: number
  readonly title: string
  readonly completed: boolean
}

export class TodoService extends Context.Tag("TodoService")<
  TodoService,
  {
    /** Reactive stream of all todos — auto-updates on any mutation */
    readonly todosRef: SubscriptionRef.SubscriptionRef<readonly Todo[]>
    readonly add: (title: string) => Effect.Effect<Todo>
    readonly toggle: (id: number) => Effect.Effect<Todo, Error>
    readonly remove: (id: number) => Effect.Effect<void>
  }
>() {}

// In-memory implementation using SubscriptionRef for reactive state
const makeTodoService = Effect.gen(function* () {
  let nextId = 4
  const initialTodos: readonly Todo[] = [
    { id: 1, title: "Learn Effect-TS", completed: true },
    { id: 2, title: "Build effect-react library", completed: true },
    { id: 3, title: "Create a demo app", completed: false },
  ]

  const todosRef = yield* SubscriptionRef.make(initialTodos)

  return TodoService.of({
    todosRef,

    add: (title: string) =>
      Effect.gen(function* () {
        const todo: Todo = { id: nextId++, title, completed: false }
        yield* SubscriptionRef.update(todosRef, (todos) => [...todos, todo])
        return todo
      }),

    toggle: (id: number) =>
      Effect.gen(function* () {
        const todos = yield* SubscriptionRef.get(todosRef)
        const found = todos.find((t) => t.id === id)
        if (!found) return yield* Effect.fail(new Error(`Todo ${id} not found`))
        const updated = { ...found, completed: !found.completed }
        yield* SubscriptionRef.update(todosRef, (ts) =>
          ts.map((t) => (t.id === id ? updated : t)),
        )
        return updated
      }),

    remove: (id: number) =>
      SubscriptionRef.update(todosRef, (todos) =>
        todos.filter((t) => t.id !== id),
      ),
  })
})

export const TodoServiceLive = Layer.effect(TodoService, makeTodoService)

// --- Counter Service ---

export class CounterService extends Context.Tag("CounterService")<
  CounterService,
  {
    /** Reactive counter value — auto-updates on increment/decrement */
    readonly countRef: SubscriptionRef.SubscriptionRef<number>
    readonly increment: Effect.Effect<number>
    readonly decrement: Effect.Effect<number>
  }
>() {}

const makeCounterService = Effect.gen(function* () {
  const countRef = yield* SubscriptionRef.make(0)

  return CounterService.of({
    countRef,

    increment: SubscriptionRef.updateAndGet(countRef, (n) => n + 1),

    decrement: SubscriptionRef.updateAndGet(countRef, (n) => n - 1),
  })
})

export const CounterServiceLive = Layer.effect(CounterService, makeCounterService)

// --- App Layer (combines all services) ---

export const AppLayer = Layer.mergeAll(TodoServiceLive, CounterServiceLive)
