import * as React from "react"
import type { Atom } from "@effect-atom/atom/Atom"
import { useRegistry } from "./useRegistry.js"

/**
 * Returns a function that refreshes the given atom.
 *
 * When called, the atom re-evaluates its read function (re-runs the Effect
 * or Stream), and all subscribers are notified of the new value.
 *
 * @example
 * ```tsx
 * const dataAtom = Atom.make(get => get.effect(fetchData))
 *
 * function RefreshButton() {
 *   const refresh = useAtomRefresh(dataAtom)
 *   return <button onClick={refresh}>Refresh</button>
 * }
 * ```
 */
export function useAtomRefresh<A>(atom: Atom<A>): () => void {
  const registry = useRegistry()

  React.useEffect(() => registry.mount(atom), [registry, atom])

  return React.useCallback(
    () => registry.refresh(atom),
    [registry, atom],
  )
}
