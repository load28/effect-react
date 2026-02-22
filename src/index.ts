/**
 * effect-react: React superset with Effect-TS integration
 *
 * Any valid React code is valid effect-react code.
 * Effect capabilities are opt-in through additional hooks.
 */

// Re-export React's public API — this makes effect-react a superset.
// We explicitly re-export because @types/react uses `export =` (CJS).
export {
  // Hooks
  useState,
  useEffect,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useRef,
  useLayoutEffect,
  useImperativeHandle,
  useDebugValue,
  useDeferredValue,
  useTransition,
  useId,
  useSyncExternalStore,
  useInsertionEffect,
  // Component creation
  createElement,
  createContext,
  createRef,
  forwardRef,
  lazy,
  memo,
  // Transitions
  startTransition,
  // Component classes
  Component,
  PureComponent,
  // Utilities
  cloneElement,
  isValidElement,
  // Top-level components
  Fragment,
  Profiler,
  StrictMode,
  Suspense,
  // Children utilities
  Children,
  // Version
  version,
} from "react"

// Re-export React types
export type {
  ReactNode,
  ReactElement,
  JSX,
  FC,
  PropsWithChildren,
  ComponentProps,
  ComponentType,
  Ref,
  RefObject,
  MutableRefObject,
  Dispatch,
  SetStateAction,
  ChangeEvent,
  FormEvent,
  MouseEvent,
  KeyboardEvent,
  FocusEvent,
  CSSProperties,
  HTMLAttributes,
  InputHTMLAttributes,
  ButtonHTMLAttributes,
  FormHTMLAttributes,
  Context,
  Provider,
  Consumer,
} from "react"

// Core types
export { type EffectResult, Loading, Success, Failure } from "./types.js"

// Provider
export { EffectProvider, type EffectProviderProps } from "./providers/EffectProvider.js"

// Hooks
export {
  useRunEffect,
  type UseRunEffectOptions,
  useEffectState,
  useService,
  useEffectCallback,
  type UseEffectCallbackReturn,
  useEffectRuntime,
  useSubscriptionRef,
  useStream,
} from "./hooks/index.js"
