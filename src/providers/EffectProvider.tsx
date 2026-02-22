import * as React from "react"
import { ManagedRuntime, Layer, Effect } from "effect"
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
 * **Nesting (Angular-style hierarchical DI):**
 * When nested inside another EffectProvider, the parent's already-built
 * service **instances** are inherited — not rebuilt. This means parent and
 * child share the same service objects (shared state). Child services
 * override parent services when they provide the same tag.
 *
 * The runtime is automatically disposed when the provider unmounts.
 *
 * @example
 * ```tsx
 * import { EffectProvider } from 'effect-react'
 * import { AppLayer, FeatureLayer } from './layers'
 *
 * function App() {
 *   return (
 *     <EffectProvider layer={AppLayer}>
 *       <SharedComponents />
 *       <EffectProvider layer={FeatureLayer}>
 *         {/* Inherits AppLayer service instances + FeatureLayer overrides *\/}
 *         <FeatureComponents />
 *       </EffectProvider>
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

  const effectiveLayer = React.useMemo(
    () => {
      if (!parentRuntime) return layer as Layer.Layer<any, any, never>

      // Extract the parent's already-built Context (shared service instances).
      // This is the key to Angular-style DI: we reuse the parent's live
      // service objects rather than rebuilding them from their Layer definitions.
      const parentContext = parentRuntime.runSync(Effect.context<any>())
      const parentInstancesLayer = Layer.succeedContext(parentContext)

      // Merge: parent instances (left) + child layer (right).
      // Layer.merge gives right-side precedence for overlapping tags,
      // so the child can override specific parent services.
      return Layer.merge(parentInstancesLayer, layer as Layer.Layer<any, any, never>)
    },
    [parentRuntime, layer],
  )

  const runtime = React.useMemo(
    () => ManagedRuntime.make(effectiveLayer),
    [effectiveLayer],
  )

  React.useEffect(() => {
    return () => {
      runtime.dispose().catch(() => {
        // Disposal errors are silently ignored during unmount.
        // This matches React's pattern of best-effort cleanup.
      })
    }
  }, [runtime])

  return React.createElement(
    EffectRuntimeContext.Provider,
    { value: runtime as ManagedRuntime.ManagedRuntime<any, any> },
    children,
  )
}
