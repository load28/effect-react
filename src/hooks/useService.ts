import * as React from "react"
import { Exit, Cause, type Context } from "effect"
import { useEffectRuntime } from "./useEffectRuntime.js"
import { type EffectResult, Loading, Success, Failure } from "../types.js"
import { createComponentStore } from "../reactive.js"

/**
 * Accesses a service from the EffectProvider's Layer.
 *
 * Returns an EffectResult that resolves to the service instance
 * once the runtime is ready.
 *
 * Internally uses a component-scoped reactive store (SubscriptionRef principles)
 * with useSyncExternalStore for tear-free, consistent reads.
 *
 * @example
 * ```tsx
 * import { useService } from 'effect-react'
 * import { UserRepo } from './services'
 *
 * function UserList() {
 *   const repo = useService(UserRepo)
 *
 *   if (repo._tag !== 'Success') return <Spinner />
 *   // repo.value is typed as UserRepo.Service
 * }
 * ```
 */
export function useService<Id, S>(
  tag: Context.Tag<Id, S>,
): EffectResult<S, never> {
  const runtime = useEffectRuntime<Id, never>()

  // Component-scoped reactive store (Ref + PubSub pattern from SubscriptionRef)
  const storeRef = React.useRef<ReturnType<typeof createComponentStore<EffectResult<S, never>>> | null>(null)
  if (!storeRef.current) {
    storeRef.current = createComponentStore<EffectResult<S, never>>(Loading as EffectResult<S, never>)
  }
  const store = storeRef.current

  // Subscribe to the reactive store
  const result = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  React.useEffect(() => {
    // Context.Tag implements Effect — run it directly without wrapping.
    const fiber = runtime.runFork(tag as any)

    fiber.addObserver((exit) => {
      if (Exit.isSuccess(exit)) {
        store.set(Success(exit.value) as EffectResult<S, never>)
      } else {
        if (Cause.isInterruptedOnly(exit.cause)) return
        store.set(Failure(exit.cause) as EffectResult<S, never>)
      }
    })

    return () => {
      fiber.unsafeInterruptAsFork(fiber.id())
    }
  }, [runtime, tag, store])

  return result
}
