import * as React from "react"
import { Effect, type Context } from "effect"
import { useEffectRuntime } from "./useEffectRuntime.js"
import { type EffectResult, Loading, Success, Failure } from "../types.js"

/**
 * Accesses a service from the EffectProvider's Layer.
 *
 * Returns an EffectResult that resolves to the service instance
 * once the runtime is ready.
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
  const [result, setResult] = React.useState<EffectResult<S, never>>(
    Loading as EffectResult<S, never>,
  )

  React.useEffect(() => {
    const fiber = runtime.runFork(Effect.map(tag, (service) => service))

    fiber.addObserver((exit) => {
      if (exit._tag === "Success") {
        setResult(Success(exit.value) as EffectResult<S, never>)
      } else {
        setResult(Failure(exit.cause) as EffectResult<S, never>)
      }
    })

    return () => {
      fiber.unsafeInterruptAsFork(fiber.id())
    }
  }, [runtime, tag])

  return result
}
