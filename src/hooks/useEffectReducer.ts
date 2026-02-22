import * as React from "react"
import type { Effect } from "effect"
import { Exit, Cause } from "effect"
import type { Fiber } from "effect"
import { useEffectRuntime } from "./useEffectRuntime.js"
import { createComponentStore } from "../reactive.js"

/**
 * Effect-powered reducer hook — like React's useReducer, but the reducer can return
 * an Effect in addition to a plain value.
 *
 * When the reducer returns a plain value, it updates state immediately (synchronous).
 * When the reducer returns an Effect, the Effect is executed and the state updates
 * when it completes — the previous state stays visible during execution (no Loading flash).
 *
 * Returns `[state, dispatch, isPending]`:
 * - `state`: current state value
 * - `dispatch`: sends an action to the reducer
 * - `isPending`: true while a reducer-returned Effect is executing
 *
 * If a new action is dispatched while a previous Effect is still running,
 * the previous Effect is interrupted and only the latest result applies.
 *
 * @example
 * ```tsx
 * import { useEffectReducer } from 'effect-react'
 * import { Effect } from 'effect'
 *
 * type State = { count: number }
 * type Action = { type: 'increment' } | { type: 'reset' } | { type: 'loadFromServer' }
 *
 * function reducer(state: State, action: Action) {
 *   switch (action.type) {
 *     case 'increment':
 *       return { count: state.count + 1 }  // plain value — immediate
 *     case 'reset':
 *       return { count: 0 }
 *     case 'loadFromServer':
 *       return Effect.flatMap(CounterService, (s) => s.getCount)  // Effect — async
 *         .pipe(Effect.map((count) => ({ count })))
 *   }
 * }
 *
 * function Counter() {
 *   const [state, dispatch, isPending] = useEffectReducer(reducer, { count: 0 })
 *
 *   return (
 *     <div>
 *       <span>{state.count}</span>
 *       <button onClick={() => dispatch({ type: 'increment' })}>+1</button>
 *       <button onClick={() => dispatch({ type: 'loadFromServer' })} disabled={isPending}>
 *         Load
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useEffectReducer<S, A, E, R>(
  reducer: (state: S, action: A) => S | Effect.Effect<S, E, R>,
  initialState: S,
): [S, (action: A) => void, boolean] {
  const runtime = useEffectRuntime<R, never>()

  // Component-scoped reactive stores
  const storeRef = React.useRef<ReturnType<typeof createComponentStore<S>> | null>(null)
  if (!storeRef.current) {
    storeRef.current = createComponentStore<S>(initialState)
  }
  const store = storeRef.current

  const pendingStoreRef = React.useRef<ReturnType<typeof createComponentStore<boolean>> | null>(null)
  if (!pendingStoreRef.current) {
    pendingStoreRef.current = createComponentStore<boolean>(false)
  }
  const pendingStore = pendingStoreRef.current

  const state = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const isPending = React.useSyncExternalStore(pendingStore.subscribe, pendingStore.getSnapshot, pendingStore.getSnapshot)

  const fiberRef = React.useRef<Fiber.RuntimeFiber<S, E> | null>(null)

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (fiberRef.current) {
        fiberRef.current.unsafeInterruptAsFork(fiberRef.current.id())
        fiberRef.current = null
      }
    }
  }, [])

  const dispatch = React.useCallback(
    (action: A) => {
      const currentState = store.getSnapshot()
      const result = reducer(currentState, action)

      if (isEffect(result)) {
        // Interrupt previous Effect if still running
        if (fiberRef.current) {
          fiberRef.current.unsafeInterruptAsFork(fiberRef.current.id())
        }

        pendingStore.set(true)
        const fiber = runtime.runFork(result)
        fiberRef.current = fiber

        fiber.addObserver((exit) => {
          // Ignore if a newer fiber has replaced this one
          if (fiberRef.current !== fiber) return
          fiberRef.current = null
          pendingStore.set(false)

          if (Exit.isSuccess(exit)) {
            store.set(exit.value)
          } else {
            if (Cause.isInterruptedOnly(exit.cause)) return
            // For failures, state stays unchanged — the reducer pattern
            // doesn't have a natural "failure" slot, so we preserve current state.
          }
        })
      } else {
        // Plain value — immediate update, exactly like useReducer
        // Also interrupt any pending Effect since sync dispatch takes priority
        if (fiberRef.current) {
          fiberRef.current.unsafeInterruptAsFork(fiberRef.current.id())
          fiberRef.current = null
          pendingStore.set(false)
        }
        store.set(result)
      }
    },
    [runtime, reducer, store, pendingStore],
  )

  return [state, dispatch, isPending]
}

/**
 * Duck-type check for Effect values.
 */
function isEffect(value: unknown): value is Effect.Effect<any, any, any> {
  return (
    typeof value === "object" &&
    value !== null &&
    "_op" in value &&
    typeof (value as any)[Symbol.iterator] === "function"
  )
}
