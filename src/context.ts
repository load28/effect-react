import * as React from "react"
import type { ManagedRuntime } from "effect"

/**
 * React Context that holds the Effect ManagedRuntime.
 * Used internally by EffectProvider and hooks.
 */
export const EffectRuntimeContext = React.createContext<
  ManagedRuntime.ManagedRuntime<any, any> | null
>(null)

EffectRuntimeContext.displayName = "EffectRuntimeContext"
