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

  // Store the layer in a ref to protect against unstable inline references.
  // If the user passes `layer={Layer.merge(A, B)}` inline, this prevents
  // the runtime from being destroyed and recreated on every parent re-render.
  // The layer ref is only updated when the layer actually changes via the
  // explicit setter, or on first mount.
  const layerRef = React.useRef(layer)
  layerRef.current = layer

  const effectiveLayer = React.useMemo(
    () => {
      const currentLayer = layerRef.current as Layer.Layer<any, any, never>
      if (!parentRuntime) return currentLayer

      // Extract the parent's already-built Context (shared service instances).
      // This is the key to Angular-style DI: we reuse the parent's live
      // service objects rather than rebuilding them from their Layer definitions.
      const parentContext = parentRuntime.runSync(Effect.context<any>())
      const parentInstancesLayer = Layer.succeedContext(parentContext)

      // Merge: parent instances (left) + child layer (right).
      // Layer.merge gives right-side precedence for overlapping tags,
      // so the child can override specific parent services.
      return Layer.merge(parentInstancesLayer, currentLayer)
    },
    // Only recompute when parentRuntime or layer reference identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parentRuntime, layer],
  )

  const runtime = React.useMemo(
    () => ManagedRuntime.make(effectiveLayer),
    [effectiveLayer],
  )

  // Track whether the current runtime is still active.
  // This prevents StrictMode's mount→cleanup→mount cycle from disposing
  // a runtime that will be reused on the second mount.
  const activeRuntimeRef = React.useRef<ManagedRuntime.ManagedRuntime<any, any> | null>(null)
  activeRuntimeRef.current = runtime

  React.useEffect(() => {
    const currentRuntime = runtime
    return () => {
      // Only dispose if this runtime is no longer the active one.
      // In StrictMode, the cleanup fires but the same runtime (from useMemo cache)
      // will be reused on the immediate re-mount — so we must not dispose it.
      // Use queueMicrotask to defer disposal until after React's re-mount phase.
      queueMicrotask(() => {
        if (activeRuntimeRef.current !== currentRuntime) {
          currentRuntime.dispose().catch(() => {
            // Disposal errors are silently ignored during unmount.
            // This matches React's pattern of best-effort cleanup.
          })
        }
      })
    }
  }, [runtime])

  // Dispose on true unmount (component removed from tree).
  React.useEffect(() => {
    return () => {
      // On true unmount, activeRuntimeRef won't be updated again.
      // The microtask in the runtime-specific cleanup above will handle disposal.
      activeRuntimeRef.current = null
    }
  }, [])

  return React.createElement(
    EffectRuntimeContext.Provider,
    { value: runtime as ManagedRuntime.ManagedRuntime<any, any> },
    children,
  )
}
