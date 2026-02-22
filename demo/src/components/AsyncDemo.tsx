/**
 * AsyncDemo — demonstrates useEffectStateAsync
 *
 * - Initial effect loads a value asynchronously
 * - setState can accept plain values or new Effects
 */
import { Effect } from "effect";
import { useEffectStateAsync } from "effect-react";

// Simulates an async fetch that resolves after a delay
const fetchRandomNumber = Effect.async<number>((resume) => {
  const timer = setTimeout(() => {
    resume(Effect.succeed(Math.floor(Math.random() * 100)));
  }, 800);
  return Effect.sync(() => clearTimeout(timer));
});

export function AsyncDemo() {
  const [result, setResult, isPending] = useEffectStateAsync(fetchRandomNumber);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <strong>Random number: </strong>
        {result._tag === "Loading" && <span>Loading...</span>}
        {result._tag === "Failure" && (
          <span style={{ color: "red" }}>Error</span>
        )}
        {result._tag === "Success" && (
          <span style={{ fontSize: 20 }}>{result.value}</span>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          disabled={isPending}
          onClick={() => setResult(fetchRandomNumber)}
          style={btnStyle}
        >
          Fetch New (Effect)
        </button>
        <button
          disabled={isPending}
          onClick={() => setResult(42)}
          style={btnStyle}
        >
          Set to 42 (plain value)
        </button>
        <button
          disabled={isPending}
          onClick={() => setResult(0)}
          style={btnStyle}
        >
          Reset to 0
        </button>
      </div>

      <p style={{ color: "#888", fontSize: 13, marginTop: 8 }}>
        "Fetch New" passes an Effect to setState (goes Loading → Success).
        <br />
        "Set to 42" and "Reset to 0" pass plain values (instant update).
      </p>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: 13,
  cursor: "pointer",
  borderRadius: 4,
  border: "1px solid #ccc",
  background: "#fafafa",
};
