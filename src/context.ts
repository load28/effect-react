import * as React from "react"
import type { ManagedRuntime } from "effect"

/**
 * React Context that holds the Effect ManagedRuntime.
 * Used internally by EffectProvider and hooks.
 *
 * When EffectProviders are nested, each creates its own runtime.
 * The child runtime inherits parent service **instances** (not rebuilt)
 * via Layer.succeedContext — achieving Angular-style hierarchical DI.
 */
export const EffectRuntimeContext = React.createContext<
  ManagedRuntime.ManagedRuntime<any, any> | null
>(null)

EffectRuntimeContext.displayName = "EffectRuntimeContext"
