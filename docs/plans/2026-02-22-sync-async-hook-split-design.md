# useEffectState Sync/Async Split

## Problem

`useEffectState` always wraps results in `EffectResult<A, E>` (Loading | Success | Failure), even for synchronous Effects that resolve instantly. This forces developers to handle Loading state unnecessarily for sync use cases.

## Design

Split into two hooks with distinct runtime strategies:

### `useEffectState` (sync, default)

- Runs Effects with `runSync`
- Returns `[A, (next: A | Effect<A, E, R>) => void]`
- No Loading/Failure wrapper — value is available immediately
- Throws at runtime if given an async Effect (runSync fails)

### `useEffectStateAsync` (async)

- Runs Effects with `runFork` (current behavior)
- Returns `[EffectResult<A, E>, (next: A | Effect<A, E, R>) => void]`
- Loading/Success/Failure pattern for async operations
- Identical to current `useEffectState` implementation

## Migration

- Rename existing `useEffectState` to `useEffectStateAsync`
- Create new `useEffectState` as sync version
- Update demo app: async usages move to `useEffectStateAsync`
- Update exports and tests

## Naming Convention

- No suffix = sync (default, simpler use case)
- `Async` suffix = async (explicit opt-in to Loading pattern)
