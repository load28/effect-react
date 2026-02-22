import * as React from "react"
import type { ManagedRuntime } from "effect"
import { EffectRuntimeContext } from "../context.js"

/**
 * Internal hook: retrieves the ManagedRuntime from the nearest EffectProvider.
 * Throws if used outside of an EffectProvider.
 */
export function useEffectRuntime<R = any, E = any>(): ManagedRuntime.ManagedRuntime<R, E> {
  const ctx = React.useContext(EffectRuntimeContext)
  if (ctx === null) {
    throw new Error(
      "useEffectRuntime: No EffectProvider found in component tree. " +
      "Wrap your component with <EffectProvider layer={...}>.",
    )
  }
  return ctx as ManagedRuntime.ManagedRuntime<R, E>
}
