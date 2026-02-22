import * as React from "react"
import type { ManagedRuntime } from "effect"
import { EffectRuntimeContext } from "../context.js"

/**
 * Internal hook: retrieves the ManagedRuntime from the nearest EffectProvider.
 * Throws if used outside of an EffectProvider.
 */
export function useEffectRuntime<R = any, E = any>(): ManagedRuntime.ManagedRuntime<R, E> {
  const runtime = React.useContext(EffectRuntimeContext)
  if (runtime === null) {
    throw new Error(
      "useEffectRuntime: No EffectProvider found in component tree. " +
      "Wrap your component with <EffectProvider layer={...}>.",
    )
  }
  return runtime as ManagedRuntime.ManagedRuntime<R, E>
}
