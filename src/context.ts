import * as React from "react"
import type { ManagedRuntime } from "effect"
import type { Registry } from "@effect-atom/atom/Registry"

/**
 * React Context that holds the Effect ManagedRuntime.
 * Used internally by EffectProvider and hooks.
 */
export const EffectRuntimeContext = React.createContext<
  ManagedRuntime.ManagedRuntime<any, any> | null
>(null)

EffectRuntimeContext.displayName = "EffectRuntimeContext"

/**
 * React Context that holds the effect-atom Registry.
 * Used by atom-based hooks for reactive state management.
 */
export const AtomRegistryContext = React.createContext<Registry | null>(null)

AtomRegistryContext.displayName = "AtomRegistryContext"
