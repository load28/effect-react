import * as React from "react"
import { ManagedRuntime, type Layer } from "effect"
import { EffectRuntimeContext } from "../context.js"

export interface EffectProviderProps<R, E> {
  readonly layer: Layer.Layer<R, E, never>
  readonly children: React.ReactNode
}

/**
 * Provides an Effect runtime to the component tree.
 *
 * Creates a ManagedRuntime from the given Layer and makes it available
 * to all descendant hooks (useRunEffect, useService, etc.).
 *
 * The runtime is automatically disposed when the provider unmounts.
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

  React.useEffect(() => {
    return () => {
      runtime.dispose().catch(() => {
        // Disposal errors are silently ignored during unmount.
        // This matches React's pattern of best-effort cleanup.
      })
    }
  }, [runtime])

  // If there's a parent runtime, the new one takes precedence (layer scoping).
  void parentRuntime

  return React.createElement(
    EffectRuntimeContext.Provider,
    { value: runtime as ManagedRuntime.ManagedRuntime<any, any> },
    children,
  )
}
