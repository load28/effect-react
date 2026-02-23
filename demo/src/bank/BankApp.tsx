/**
 * BankApp — Effect + effect-react 종합 데모
 *
 * 이 데모가 보여주는 Effect의 장점:
 *
 * 1. pipe/flow — 비즈니스 로직을 선언적으로 합성
 *    (검증 → 조회 → 업데이트 → 기록을 한 줄의 파이프라인으로)
 *
 * 2. 의존성 주입 (DI) — Context.Tag + Layer 패턴
 *    (AccountRepo, TransactionRepo, FeePolicy를 Layer로 주입)
 *
 * 3. 에러 처리 — Data.TaggedError + Effect.catchTag
 *    (InsufficientFunds, AccountNotFound 등 타입 안전한 에러)
 *
 * 4. 다형성 — 같은 인터페이스, 다른 구현
 *    (Standard vs Premium FeePolicy를 Layer 교체만으로 전환)
 *
 * 5. effect-react 훅 — React와 Effect의 자연스러운 통합
 *    (useEffectStateAsync, useRunEffect, useEffectCallback)
 */
import * as React from "react"
import { EffectProvider } from "effect-react"
import { StandardBankLayer, PremiumBankLayer } from "./services"
import { AccountDashboard } from "./components/AccountDashboard"
import { TransactionForm } from "./components/TransactionForm"
import { TransactionHistory } from "./components/TransactionHistory"
import { FeePolicyBadge } from "./components/FeePolicyBadge"

export function BankApp() {
  const [selectedAccountId, setSelectedAccountId] = React.useState<
    string | null
  >("acc-1")
  const [isPremium, setIsPremium] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)

  const refresh = () => setRefreshKey((k) => k + 1)

  // 다형성: Layer만 교체하면 전체 수수료 정책이 바뀜
  const bankLayer = isPremium ? PremiumBankLayer : StandardBankLayer

  return (
    <EffectProvider layer={bankLayer}>
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: "#2d3748" }}>
              Effect Bank
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#718096" }}>
              pipe / DI / Error Handling / Polymorphism Demo
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <FeePolicyBadge />
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={isPremium}
                onChange={(e) => setIsPremium(e.target.checked)}
                data-testid="premium-toggle"
              />
              Premium
            </label>
          </div>
        </div>

        {/* Main content */}
        <div style={gridStyle}>
          {/* Left column: Accounts */}
          <div style={panelStyle}>
            <AccountDashboard
              onSelectAccount={setSelectedAccountId}
              selectedAccountId={selectedAccountId}
              refreshKey={refreshKey}
            />
          </div>

          {/* Right column: Transaction + History */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={panelStyle}>
              <TransactionForm
                selectedAccountId={selectedAccountId}
                onComplete={refresh}
              />
            </div>

            <div style={panelStyle}>
              <TransactionHistory
                accountId={selectedAccountId}
                refreshKey={refreshKey}
              />
            </div>
          </div>
        </div>

        {/* Feature explanation */}
        <div style={featureGridStyle}>
          <FeatureCard
            title="pipe"
            description="Validate -> Query -> Update -> Log chained as a single pipeline"
            code="pipe(validateAmount(amount), Effect.flatMap(() => repo.getById(id)), Effect.flatMap(account => repo.update({...})), Effect.tap(() => txRepo.add({...})))"
          />
          <FeatureCard
            title="DI"
            description="3 services injected via Context.Tag + Layer"
            code="AccountRepository, TransactionRepository, FeePolicy -> BankService via Layer.provide"
          />
          <FeatureCard
            title="Error Handling"
            description="Type-safe errors with pattern matching per tag"
            code="Effect.catchTag('InsufficientFundsError', e => ...) / Effect.catchTag('AccountNotFoundError', e => ...)"
          />
          <FeatureCard
            title="Polymorphism"
            description="Toggle Premium to swap FeePolicy - same interface, different Layer"
            code="StandardFeePolicyLive (1% fee) vs PremiumFeePolicyLive (no fee) - just swap the Layer"
          />
        </div>
      </div>
    </EffectProvider>
  )
}

function FeatureCard({
  title,
  description,
  code,
}: {
  title: string
  description: string
  code: string
}) {
  return (
    <div style={featureCardStyle}>
      <div style={{ fontWeight: 700, fontSize: 14, color: "#2d3748", marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: "#718096", marginBottom: 6 }}>
        {description}
      </div>
      <code
        style={{
          display: "block",
          fontSize: 11,
          color: "#4a5568",
          background: "#edf2f7",
          padding: 8,
          borderRadius: 4,
          wordBreak: "break-all",
          lineHeight: 1.4,
        }}
      >
        {code}
      </code>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  maxWidth: 800,
  margin: "0 auto",
  fontFamily: "system-ui, sans-serif",
}

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 20,
  paddingBottom: 16,
  borderBottom: "1px solid #e2e8f0",
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
  marginBottom: 20,
}

const panelStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
}

const featureGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
}

const featureCardStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#fafafa",
}
