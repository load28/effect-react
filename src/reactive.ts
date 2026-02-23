/**
 * Internal reactive store — applies SubscriptionRef principles at component level.
 *
 * SubscriptionRef's architecture:
 *   Ref<A>   → mutable value holder
 *   PubSub   → broadcasts changes to all subscribers
 *   Semaphore → ensures consistent reads/writes
 *
 * ComponentStore adapts this for React's useSyncExternalStore:
 *   value    → mutable snapshot (like Ref)
 *   listeners → Set of callbacks (like PubSub subscribers)
 *   subscribe/getSnapshot → useSyncExternalStore contract
 *
 * Each hook creates its own ComponentStore via useRef, so it is
 * scoped to the component instance — never global.
 */

export interface ComponentStore<T> {
  /** Returns the current value (useSyncExternalStore getSnapshot). */
  getSnapshot(): T
  /** Updates the value and notifies all subscribers (like SubscriptionRef.set + PubSub.publish). */
  set(value: T): void
  /** Registers a listener; returns unsubscribe (like PubSub subscription). */
  subscribe(listener: () => void): () => void
}

/**
 * Creates a component-scoped reactive store.
 *
 * Mirrors SubscriptionRef's Ref + PubSub pattern:
 * - `set` writes the new value AND publishes to all listeners
 * - `subscribe` registers a listener that is called on every `set`
 * - `getSnapshot` reads the current value without side effects
 */
export function createComponentStore<T>(initialValue: T): ComponentStore<T> {
  let currentValue = initialValue
  const listeners = new Set<() => void>()

  return {
    getSnapshot() {
      return currentValue
    },

    set(value: T) {
      // Skip if the value is the same reference — avoids unnecessary
      // re-renders when the same EffectResult or primitive is set again.
      if (Object.is(currentValue, value)) return
      currentValue = value
      // Publish to all subscribers (PubSub.publish equivalent)
      for (const listener of listeners) {
        listener()
      }
    },

    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
