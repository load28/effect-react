/**
 * FeePolicyBadge — 현재 수수료 정책 표시
 *
 * 시연하는 effect-react 기능:
 * - useRunEffect: 마운트 시 서비스에서 정책 이름 자동 로드
 *
 * 시연하는 Effect 기능:
 * - 다형성: Layer만 교체하면 Standard ↔ Premium 전환
 */
import { useRunEffect } from "effect-react"
import { Effect } from "effect"
import { BankService } from "../services"

export function FeePolicyBadge() {
  const policyResult = useRunEffect(
    Effect.flatMap(BankService, (s) => s.getFeePolicyName),
  )

  const name = policyResult._tag === "Success" ? policyResult.value : "..."
  const isPremium = name === "Premium"

  return (
    <span
      data-testid="fee-policy-badge"
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: isPremium ? "#fefcbf" : "#e2e8f0",
        color: isPremium ? "#975a16" : "#4a5568",
        border: `1px solid ${isPremium ? "#ecc94b" : "#cbd5e0"}`,
      }}
    >
      {isPremium ? "Premium (No Fee)" : "Standard (1% Fee)"}
    </span>
  )
}
