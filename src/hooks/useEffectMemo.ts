import * as React from "react"
import type { Effect } from "effect"
import { useEffectRuntime } from "./useEffectRuntime.js"

/**
 * Effect-powered memoization hook — like React's useMemo, but the factory
 * returns an Effect that is executed synchronously via `runSync`.
 *
 * The Effect is re-executed only when dependencies change, and the result
 * is memoized between renders — exactly like useMemo.
 *
 * This hook is for synchronous Effects only (Effect.succeed, Effect.sync,
 * service lookups, pure computations). For async Effects, use useRunEffect instead.
 *
 * @throws If the Effect is async (runSync will throw)
 *
 * @example
 * ```tsx
 * import { useEffectMemo } from 'effect-react'
 * import { Effect } from 'effect'
 *
 * function ExpensiveComponent({ items }: { items: Item[] }) {
 *   // Memoize an expensive computation via Effect
 *   const sorted = useEffectMemo(
 *     () => Effect.sync(() => items.toSorted((a, b) => a.score - b.score)),
 *     [items],
 *   )
 *
 *   return <List items={sorted} />
 * }
 *
 * // Access services in memoized computation
 * function FormattedPrice({ amount }: { amount: number }) {
 *   const formatted = useEffectMemo(
 *     () => Effect.flatMap(FormatService, (fmt) =>
 *       Effect.succeed(fmt.currency(amount))
 *     ),
 *     [amount],
 *   )
 *
 *   return <span>{formatted}</span>
 * }
 * ```
 */
export function useEffectMemo<A, E, R>(
  factory: () => Effect.Effect<A, E, R>,
  deps: ReadonlyArray<unknown>,
): A {
  const runtime = useEffectRuntime<R, never>()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(() => runtime.runSync(factory()), [runtime, ...deps])
}
