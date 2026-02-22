import * as React from "react"
import type { Registry } from "@effect-atom/atom/Registry"
import { AtomRegistryContext } from "../context.js"

export function useRegistry(): Registry {
  const registry = React.useContext(AtomRegistryContext)
  if (registry === null) {
    throw new Error(
      "useRegistry: No EffectProvider found in component tree. " +
      "Wrap your component with <EffectProvider layer={...}>.",
    )
  }
  return registry
}
