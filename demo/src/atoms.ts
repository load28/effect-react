/**
 * Atom definitions — reactive state backed by Effect services
 *
 * Atoms bridge Effect services to React. When a mutation completes,
 * it refreshes the related query atom, and all subscribers auto-update.
 * No more refreshKey or setTimeout needed.
 */
import { Atom } from "@effect-atom/atom"
import { Effect } from "effect"
import { CounterService, TodoService, AppLayer } from "./services"

// Create atom runtime from app layer
const runtime = Atom.runtime(AppLayer)

// --- Counter atoms ---

export const counterAtom = runtime.atom(
  Effect.flatMap(CounterService, (s) => s.get),
)

export const incrementFn = runtime.fn<void>()(
  (_, get) =>
    Effect.flatMap(CounterService, (s) => s.increment).pipe(
      Effect.tap(() => {
        get.refresh(counterAtom)
      }),
    ),
)

export const decrementFn = runtime.fn<void>()(
  (_, get) =>
    Effect.flatMap(CounterService, (s) => s.decrement).pipe(
      Effect.tap(() => {
        get.refresh(counterAtom)
      }),
    ),
)

// --- Todo atoms ---

export const todosAtom = runtime.atom(
  Effect.flatMap(TodoService, (s) => s.getAll),
)

export const addTodoFn = runtime.fn<string>()(
  (title, get) =>
    Effect.flatMap(TodoService, (s) => s.add(title)).pipe(
      Effect.tap(() => {
        get.refresh(todosAtom)
      }),
    ),
)

export const toggleTodoFn = runtime.fn<number>()(
  (id, get) =>
    Effect.flatMap(TodoService, (s) => s.toggle(id)).pipe(
      Effect.tap(() => {
        get.refresh(todosAtom)
      }),
    ),
)

export const removeTodoFn = runtime.fn<number>()(
  (id, get) =>
    Effect.flatMap(TodoService, (s) => s.remove(id)).pipe(
      Effect.tap(() => {
        get.refresh(todosAtom)
      }),
    ),
)
