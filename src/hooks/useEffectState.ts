import * as React from "react"
import type { Effect } from "effect"
import { Exit, Cause } from "effect"
import { useEffectRuntime } from "./useEffectRuntime.js"
import { type EffectResult, Loading, Success, Failure } from "../types.js"
import { createComponentStore } from "../reactive.js"

/**
 * Manages state derived from an Effect, with an updater function.
 *
 * Runs the initial Effect to set the state, then provides a setter
 * that can accept either a plain value or an Effect that produces the new value.
 *
 * Internally uses a component-scoped reactive store (SubscriptionRef principles)
 * with useSyncExternalStore for tear-free, consistent reads.
 *
 * @example
 * ```tsx
 * import { useEffectState } from 'effect-react'
 *
 * function ThemeSwitcher() {
 *   const [theme, setTheme] = useEffectState(loadThemeEffect)
 *
 *   if (theme._tag !== 'Success') return <Spinner />
 *
 *   return (
 *     <button onClick={() => setTheme(saveThemeEffect('dark'))}>
 *       Current: {theme.value}
 *     </button>
 *   )
 * }
 * ```
 */
export function useEffectState<A, E, R>(
  initialEffect: Effect.Effect<A, E, R>,
): [EffectResult<A, E>, (next: A | Effect.Effect<A, E, R>) => void] {
  const runtime = useEffectRuntime<R, never>()

  // Component-scoped reactive store (Ref + PubSub pattern from SubscriptionRef)
  const storeRef = React.useRef<ReturnType<typeof createComponentStore<EffectResult<A, E>>> | null>(null)
  if (!storeRef.current) {
    storeRef.current = createComponentStore<EffectResult<A, E>>(Loading as EffectResult<A, E>)
  }
  const store = storeRef.current

  // Subscribe to the reactive store
  const result = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  // Capture the initial effect in a ref to avoid re-running on every render
  const initialEffectRef = React.useRef(initialEffect)

  // Run the initial effect once on mount
  React.useEffect(() => {
    const fiber = runtime.runFork(initialEffectRef.current)

    fiber.addObserver((exit) => {
      if (Exit.isSuccess(exit)) {
        store.set(Success(exit.value) as EffectResult<A, E>)
      } else {
        if (Cause.isInterruptedOnly(exit.cause)) return
        const failure = Cause.failureOption(exit.cause)
        if (failure._tag === "Some") {
          store.set(Failure(failure.value) as EffectResult<A, E>)
        }
      }
    })

    return () => {
      fiber.unsafeInterruptAsFork(fiber.id())
    }
  }, [runtime, store])

  const setState = React.useCallback(
    (next: A | Effect.Effect<A, E, R>) => {
      if (isEffect(next)) {
        store.set(Loading as EffectResult<A, E>)
        const fiber = runtime.runFork(next)
        fiber.addObserver((exit) => {
          if (Exit.isSuccess(exit)) {
            store.set(Success(exit.value) as EffectResult<A, E>)
          } else {
            if (Cause.isInterruptedOnly(exit.cause)) return
            const failure = Cause.failureOption(exit.cause)
            if (failure._tag === "Some") {
              store.set(Failure(failure.value) as EffectResult<A, E>)
            }
          }
        })
      } else {
        store.set(Success(next) as EffectResult<A, E>)
      }
    },
    [runtime, store],
  )

  return [result, setState]
}

/**
 * Duck-type check for Effect values.
 * Effects have a `_op` property and implement the Effect protocol.
 */
function isEffect(value: unknown): value is Effect.Effect<any, any, any> {
  return (
    typeof value === "object" &&
    value !== null &&
    "_op" in value &&
    typeof (value as any)[Symbol.iterator] === "function"
  )
}
