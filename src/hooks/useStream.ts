import * as React from "react"
import { Effect, Stream, Cause } from "effect"
import { useEffectRuntime } from "./useEffectRuntime.js"
import { type EffectResult, Loading, Success, Failure } from "../types.js"
import { createComponentStore } from "../reactive.js"

/**
 * Subscribes to an Effect Stream and reactively tracks emitted values.
 *
 * Each time the stream emits a new value, the component re-renders
 * with the latest value. The subscription is component-scoped:
 * created on mount, interrupted on unmount.
 *
 * This enables true reactivity — no refresh keys, no manual re-fetching.
 * The component automatically stays in sync with the data source.
 *
 * @example
 * ```tsx
 * import { useStream } from 'effect-react'
 * import { Stream } from 'effect'
 *
 * function LivePrice({ priceStream }: { priceStream: Stream.Stream<number> }) {
 *   const price = useStream(priceStream)
 *
 *   if (price._tag !== 'Success') return <Spinner />
 *   return <span>${price.value}</span>
 *   // Automatically updates on every new emission
 * }
 * ```
 */
export function useStream<A, E, R>(
  stream: Stream.Stream<A, E, R>,
): EffectResult<A, E> {
  const runtime = useEffectRuntime<R, never>()

  // Component-scoped reactive store (Ref + PubSub pattern from SubscriptionRef)
  const storeRef = React.useRef<ReturnType<typeof createComponentStore<EffectResult<A, E>>> | null>(null)
  if (!storeRef.current) {
    storeRef.current = createComponentStore<EffectResult<A, E>>(Loading as EffectResult<A, E>)
  }
  const store = storeRef.current

  const result = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  // Capture stream in ref to avoid re-subscribing on inline creation
  const streamRef = React.useRef(stream)

  React.useEffect(() => {
    // Consume the stream: each emitted value updates the reactive store → triggers re-render.
    // This mirrors SubscriptionRef.changes subscription but works with any Stream.
    const fiber = runtime.runFork(
      Effect.catchAllCause(
        Stream.runForEach(streamRef.current as Stream.Stream<A, E, R>, (value) =>
          Effect.sync(() => {
            store.set(Success(value) as EffectResult<A, E>)
          }),
        ),
        (cause) =>
          Effect.sync(() => {
            if (Cause.isInterruptedOnly(cause)) return
            const failure = Cause.failureOption(cause)
            if (failure._tag === "Some") {
              store.set(Failure(failure.value) as EffectResult<A, E>)
            }
          }),
      ),
    )

    return () => {
      fiber.unsafeInterruptAsFork(fiber.id())
    }
  }, [runtime, store])

  return result
}
