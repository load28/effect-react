/**
 * NestedProviderDemo — demonstrates nested EffectProvider + all hooks together
 *
 * Shows that a child EffectProvider inherits parent services via layer merging.
 * The child provider adds ThemeService while inheriting CounterService from the parent.
 *
 * Hooks demonstrated:
 * - useService: resolves services from both parent and child layers
 * - useEffectCallback: triggers theme-aware counter actions
 * - useRunEffect: auto-loads data when theme changes
 * - useEffectState: sync local toggle
 * - useEffectStateAsync: async themed data with isPending
 */
import * as React from "react"
import {
  EffectProvider,
  useService,
  useEffectCallback,
  useRunEffect,
  useEffectState,
  useEffectStateAsync,
} from "effect-react"
import { Effect, Layer } from "effect"
import { CounterService, ThemeService, LightThemeLayer, DarkThemeLayer } from "../services"

// Themed counter value — fetches counter through ThemeService-aware formatting
const fetchThemedLabel = Effect.all({
  theme: Effect.flatMap(ThemeService, (s) => s.current),
  count: Effect.flatMap(CounterService, (s) => s.get),
}).pipe(
  Effect.map(({ theme, count }) => `[${theme}] Count: ${count}`),
  // Simulate network delay
  Effect.delay("300 millis"),
)

/**
 * Inner component that uses services from BOTH the parent (CounterService)
 * and child (ThemeService) providers — demonstrating layer inheritance.
 */
function ThemedPanel() {
  // useService — resolves ThemeService from the nearest (child) provider
  const themeService = useService(ThemeService)
  // useService — resolves CounterService inherited from parent provider
  const counterService = useService(CounterService)

  // useRunEffect — auto-loads theme colors (re-runs if themeService changes)
  const colorsResult = useRunEffect(
    Effect.flatMap(ThemeService, (s) => s.colors),
  )

  // useEffectCallback — manually trigger counter increment
  const incrementCb = useEffectCallback(
    () => Effect.flatMap(CounterService, (s) => s.increment),
  )

  // useEffectStateAsync — async themed label with isPending
  const [labelResult, refreshLabel, isPending] = useEffectStateAsync(fetchThemedLabel)

  // useEffectState — sync local toggle (no Loading state)
  const [showDetails, setShowDetails] = useEffectState(Effect.succeed(false))

  const handleIncrement = () => {
    incrementCb.run()
    // Refresh the themed label after incrementing
    setTimeout(() => refreshLabel(fetchThemedLabel), 50)
  }

  if (themeService._tag !== "Success" || counterService._tag !== "Success") {
    return <p>Resolving services...</p>
  }

  const colors = colorsResult._tag === "Success" ? colorsResult.value : null
  const bgColor = colors?.bg ?? "#f9f9f9"
  const fgColor = colors?.fg ?? "#333"
  const accentColor = colors?.accent ?? "#0070f3"

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        background: bgColor,
        color: fgColor,
        border: `2px solid ${accentColor}`,
        transition: "all 0.3s",
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <strong>Themed Label: </strong>
        {labelResult._tag === "Loading" && <span>Loading...</span>}
        {labelResult._tag === "Success" && (
          <span data-testid="themed-label">{labelResult.value}</span>
        )}
        {labelResult._tag === "Failure" && <span style={{ color: "red" }}>Error</span>}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={handleIncrement}
          disabled={isPending || incrementCb.isLoading}
          style={{ ...btnStyle, borderColor: accentColor, color: accentColor }}
        >
          Increment + Refresh
        </button>
        <button
          onClick={() => setShowDetails(Effect.succeed(!showDetails))}
          style={btnStyle}
        >
          {showDetails ? "Hide" : "Show"} Details
        </button>
      </div>

      {showDetails && (
        <div data-testid="theme-details" style={{ fontSize: 13, color: fgColor, opacity: 0.7 }}>
          <p style={{ margin: "4px 0" }}>Theme: {colors ? `bg=${colors.bg}, fg=${colors.fg}` : "..."}</p>
          <p style={{ margin: "4px 0" }}>
            Services resolved: CounterService (from parent), ThemeService (from this provider)
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Displays the current theme from the nearest EffectProvider's ThemeService.
 * Used to show that parent and child scopes resolve different theme instances.
 */
function CurrentThemeLabel({ testId }: { testId: string }) {
  const themeResult = useRunEffect(
    Effect.flatMap(ThemeService, (s) => s.current),
  )
  const colorsResult = useRunEffect(
    Effect.flatMap(ThemeService, (s) => s.colors),
  )

  const theme = themeResult._tag === "Success" ? themeResult.value : "..."
  const colors = colorsResult._tag === "Success" ? colorsResult.value : null

  return (
    <div
      data-testid={testId}
      style={{
        padding: 8,
        borderRadius: 4,
        background: colors?.bg ?? "#f0f0f0",
        color: colors?.fg ?? "#333",
        border: `1px solid ${colors?.accent ?? "#ccc"}`,
        fontSize: 13,
      }}
    >
      Theme: <strong>{theme}</strong>
    </div>
  )
}

/**
 * Outer component with theme selector — swaps the nested EffectProvider's layer.
 */
export function NestedProviderDemo() {
  const [isDark, setIsDark] = React.useState(false)
  const themeLayer = isDark ? DarkThemeLayer : LightThemeLayer

  return (
    <div>
      {/* Parent scope — reads ThemeService from AppLayer (always light) */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: "0 0 4px", fontSize: 13, color: "#888" }}>Parent scope (AppLayer):</p>
        <CurrentThemeLabel testId="parent-theme" />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={isDark}
            onChange={(e) => setIsDark(e.target.checked)}
          />
          Dark Mode
        </label>
      </div>

      {/* Nested provider: overrides ThemeService, inherits CounterService from parent */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ margin: "0 0 4px", fontSize: 13, color: "#888" }}>Nested scope (overridden):</p>
        <EffectProvider layer={themeLayer}>
          <CurrentThemeLabel testId="nested-theme" />
          <ThemedPanel />
        </EffectProvider>
      </div>

      <p style={{ color: "#888", fontSize: 13, marginTop: 8 }}>
        Parent always shows "light" theme from AppLayer.
        Nested provider overrides ThemeService — toggle dark mode to see different themes side by side.
      </p>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: 13,
  cursor: "pointer",
  borderRadius: 4,
  border: "1px solid #ccc",
  background: "transparent",
}
