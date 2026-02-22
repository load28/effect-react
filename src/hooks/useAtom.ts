import type { Writable } from "@effect-atom/atom/Atom"
import { useAtomValue } from "./useAtomValue.js"
import { useAtomSet } from "./useAtomSet.js"

/**
 * Returns a [value, setter] tuple for a writable atom.
 *
 * Combines `useAtomValue` and `useAtomSet` into a single hook,
 * similar to React's `useState`.
 *
 * @example
 * ```tsx
 * const counterAtom = Atom.make(0)
 *
 * function Counter() {
 *   const [count, setCount] = useAtom(counterAtom)
 *   return <button onClick={() => setCount(count + 1)}>{count}</button>
 * }
 * ```
 */
export function useAtom<R, W>(
  atom: Writable<R, W>,
): readonly [value: R, set: (value: W) => void] {
  const value = useAtomValue(atom)
  const set = useAtomSet(atom)
  return [value, set] as const
}
