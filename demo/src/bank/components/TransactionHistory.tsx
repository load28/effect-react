/**
 * TransactionHistory — 거래 내역 표시
 *
 * 시연하는 effect-react 기능:
 * - useRunEffect: 선택된 계좌가 바뀔 때 자동으로 거래 내역 재로드
 * - deps 배열: refreshKey가 바뀌면 자동 재실행 (React의 useEffect처럼)
 *
 * 시연하는 Effect 기능:
 * - pipe: 서비스 조회 → 데이터 변환 체이닝
 */
import { useRunEffect } from "effect-react"
import { Effect } from "effect"
import { BankService, formatKRW, type Transaction } from "../services"

export function TransactionHistory({
  accountId,
  refreshKey,
}: {
  accountId: string | null
  refreshKey: number
}) {
  // useRunEffect: deps가 바뀔 때마다 자동으로 Effect 재실행
  const txResult = useRunEffect(
    accountId
      ? Effect.flatMap(BankService, (s) => s.getTransactions(accountId))
      : Effect.succeed([] as readonly Transaction[]),
    { deps: [accountId, refreshKey] },
  )

  if (!accountId) {
    return (
      <div style={{ padding: 16, color: "#718096", textAlign: "center" }}>
        Select an account to view transactions
      </div>
    )
  }

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Transaction History</h3>

      {txResult._tag === "Loading" && (
        <p style={{ color: "#888" }}>Loading...</p>
      )}

      {txResult._tag === "Success" && txResult.value.length === 0 && (
        <p style={{ color: "#a0aec0", fontSize: 13, textAlign: "center" }}>
          No transactions yet
        </p>
      )}

      {txResult._tag === "Success" && txResult.value.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {txResult.value.map((tx: Transaction) => (
            <div key={tx.id} style={txRowStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>
                  {tx.type === "deposit"
                    ? "\u2B06"
                    : tx.type === "withdrawal"
                      ? "\u2B07"
                      : "\u21C4"}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {tx.description}
                  </div>
                  <div style={{ fontSize: 11, color: "#a0aec0" }}>
                    {new Date(tx.timestamp).toLocaleTimeString("ko-KR")}
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color:
                    tx.type === "deposit"
                      ? "#38a169"
                      : tx.type === "withdrawal"
                        ? "#e53e3e"
                        : "#3182ce",
                }}
              >
                {tx.type === "deposit" ? "+" : tx.type === "withdrawal" ? "-" : ""}
                {formatKRW(tx.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const txRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: 6,
  background: "#f7fafc",
  border: "1px solid #edf2f7",
}
