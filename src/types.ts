/**
 * Core types for effect-react
 */

/**
 * Represents the result of running an Effect.
 * - Loading: Effect is still executing
 * - Success: Effect completed successfully with value A
 * - Failure: Effect failed with error E
 */
export type EffectResult<A, E = never> =
  | { readonly _tag: "Loading" }
  | { readonly _tag: "Success"; readonly value: A }
  | { readonly _tag: "Failure"; readonly error: E }

export const Loading: EffectResult<never, never> = { _tag: "Loading" }

export const Success = <A>(value: A): EffectResult<A, never> => ({
  _tag: "Success",
  value,
})

export const Failure = <E>(error: E): EffectResult<never, E> => ({
  _tag: "Failure",
  error,
})
