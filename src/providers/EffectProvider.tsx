import * as React from "react"
import { ManagedRuntime, type Layer } from "effect"
import * as Registry from "@effect-atom/atom/Registry"
import { EffectRuntimeContext, AtomRegistryContext } from "../context.js"

export interface EffectProviderProps<R, E> {
  readonly layer: Layer.Layer<R, E, never>
  readonly children: React.ReactNode
}

/**
 * Provides an Effect runtime and an atom Registry to the component tree.
 *
 * Creates a ManagedRuntime from the given Layer and an effect-atom Registry,
 * making them available to all descendant hooks.
 *
 * The runtime and registry are automatically disposed when the provider unmounts.
 *
 * @example
 * ```tsx
 * import { EffectProvider } from 'effect-react'
 * import { AppLayer } from './layers'
 *
 * function App() {
 *   return (
 *     <EffectProvider layer={AppLayer}>
 *       <MyComponent />
 *     </EffectProvider>
 *   )
 * }
 * ```
 */
export function EffectProvider<R, E>({
  layer,
  children,
}: EffectProviderProps<R, E>): React.ReactElement {
  const parentRuntime = React.useContext(EffectRuntimeContext)

  const runtime = React.useMemo(
    () => ManagedRuntime.make(layer),
    [layer],
  )

  const registry = React.useMemo(
    () => Registry.make(),
    [],
  )

  React.useEffect(() => {
    return () => {
      registry.dispose()
      runtime.dispose().catch(() => {
        // Disposal errors are silently ignored during unmount.
        // This matches React's pattern of best-effort cleanup.
      })
    }
  }, [runtime, registry])

  // If there's a parent runtime, the new one takes precedence (layer scoping).
  void parentRuntime

  return React.createElement(
    EffectRuntimeContext.Provider,
    { value: runtime as ManagedRuntime.ManagedRuntime<any, any> },
    React.createElement(
      AtomRegistryContext.Provider,
      { value: registry },
      children,
    ),
  )
}
