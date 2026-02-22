import * as React from "react"
import type { Atom } from "@effect-atom/atom/Atom"
import { useRegistry } from "./useRegistry.js"

/**
 * Subscribes to an atom's value and returns it reactively.
 *
 * When the atom's value changes, the component re-renders automatically.
 * Uses `useSyncExternalStore` under the hood for tear-free reads.
 *
 * @example
 * ```tsx
 * const counterAtom = Atom.make(0)
 *
 * function Counter() {
 *   const count = useAtomValue(counterAtom)
 *   return <span>{count}</span>
 * }
 * ```
 */
export function useAtomValue<A>(atom: Atom<A>): A {
  const registry = useRegistry()

  React.useEffect(() => registry.mount(atom), [registry, atom])

  const subscribe = React.useCallback(
    (callback: () => void) => registry.subscribe(atom, callback),
    [registry, atom],
  )

  const getSnapshot = React.useCallback(
    () => registry.get(atom),
    [registry, atom],
  )

  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
