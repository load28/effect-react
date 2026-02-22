import * as React from "react"
import type { Writable } from "@effect-atom/atom/Atom"
import { useRegistry } from "./useRegistry.js"

/**
 * Returns a setter function for a writable atom.
 *
 * The setter accepts either a new value or an updater function.
 *
 * @example
 * ```tsx
 * const counterAtom = Atom.make(0)
 *
 * function IncrementButton() {
 *   const setCount = useAtomSet(counterAtom)
 *   return <button onClick={() => setCount(c => c + 1)}>+</button>
 * }
 * ```
 */
export function useAtomSet<R, W>(
  atom: Writable<R, W>,
): (value: W) => void {
  const registry = useRegistry()

  React.useEffect(() => registry.mount(atom), [registry, atom])

  return React.useCallback(
    (value: W) => {
      registry.set(atom, value)
    },
    [registry, atom],
  )
}
