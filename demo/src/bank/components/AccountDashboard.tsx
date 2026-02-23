/**
 * AccountDashboard — 계좌 목록 + 잔액 표시
 *
 * 시연하는 effect-react 기능:
 * - useRunEffect: 계좌 목록을 로드하고, refreshKey 변경 시 자동 재실행
 * - EffectResult 패턴 매칭: Loading / Success / Failure 상태 처리
 */
import { useRunEffect } from "effect-react"
import { Effect } from "effect"
import { BankService, formatKRW, type Account } from "../services"

export function AccountDashboard({
  onSelectAccount,
  selectedAccountId,
  refreshKey,
}: {
  onSelectAccount: (id: string) => void
  selectedAccountId: string | null
  refreshKey: number
}) {
  // useRunEffect: deps가 바뀌면 자동으로 Effect 재실행
  const accountsResult = useRunEffect(
    Effect.flatMap(BankService, (s) => s.getAccounts),
    { deps: [refreshKey] },
  )

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>My Accounts</h3>

      {accountsResult._tag === "Loading" && (
        <p style={{ color: "#888" }}>Loading accounts...</p>
      )}

      {accountsResult._tag === "Failure" && (
        <p style={{ color: "#e53e3e" }}>Failed to load accounts</p>
      )}

      {accountsResult._tag === "Success" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {accountsResult.value.map((account: Account) => (
            <button
              key={account.id}
              onClick={() => onSelectAccount(account.id)}
              data-testid={`account-${account.id}`}
              style={{
                ...cardStyle,
                borderColor:
                  selectedAccountId === account.id ? "#3182ce" : "#e2e8f0",
                background:
                  selectedAccountId === account.id ? "#ebf8ff" : "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {account.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#718096" }}>
                    {account.type === "checking" ? "Checking" : "Savings"}
                  </div>
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: "#2d3748",
                  }}
                >
                  {formatKRW(account.balance)}
                </div>
              </div>
            </button>
          ))}

          <div
            style={{
              marginTop: 8,
              padding: 12,
              background: "#f7fafc",
              borderRadius: 8,
              textAlign: "right",
            }}
          >
            <span style={{ fontSize: 13, color: "#718096" }}>Total: </span>
            <span style={{ fontWeight: 700, fontSize: 18, color: "#2d3748" }}>
              {formatKRW(
                accountsResult.value.reduce(
                  (sum: number, a: Account) => sum + a.balance,
                  0,
                ),
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 8,
  border: "2px solid #e2e8f0",
  cursor: "pointer",
  background: "#fff",
  transition: "all 0.15s",
  width: "100%",
  fontFamily: "inherit",
}
