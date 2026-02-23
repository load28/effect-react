/**
 * TransactionForm — 입금 / 출금 / 이체 폼
 *
 * 시연하는 effect-react 기능:
 * - useEffectCallback: 버튼 클릭 시 Effect 수동 실행
 * - useEffectStateAsync: 계좌 목록 로드 (이체 대상 선택용)
 * - 타입 안전한 에러 처리: Effect.catchTag로 에러별 분기 처리
 *
 * 시연하는 Effect 기능:
 * - pipe: 검증 → 실행 → 에러 처리 체이닝
 * - Effect.catchTag: 특정 에러 타입만 선별 처리
 */
import { useState } from "react"
import { useEffectCallback, useEffectStateAsync } from "effect-react"
import { Effect, pipe } from "effect"
import { BankService, formatKRW, type Account } from "../services"
import type { BankError } from "../errors"

type TxType = "deposit" | "withdrawal" | "transfer"

export function TransactionForm({
  selectedAccountId,
  onComplete,
}: {
  selectedAccountId: string | null
  onComplete: () => void
}) {
  const [txType, setTxType] = useState<TxType>("deposit")
  const [amount, setAmount] = useState("")
  const [targetAccountId, setTargetAccountId] = useState("")
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  // 계좌 목록 (이체 대상 선택용)
  const [accountsResult] = useEffectStateAsync(
    Effect.flatMap(BankService, (s) => s.getAccounts),
  )

  // useEffectCallback: 트랜잭션 실행을 수동으로 트리거
  const executeTransaction = useEffectCallback(
    (params: { type: TxType; accountId: string; amount: number; targetId: string }) =>
      pipe(
        Effect.flatMap(BankService, (bank) => {
          switch (params.type) {
            case "deposit":
              return Effect.map(
                bank.deposit(params.accountId, params.amount),
                (acc) =>
                  `${acc.name}에 ${formatKRW(params.amount)} 입금 완료`,
              )
            case "withdrawal":
              return Effect.map(
                bank.withdraw(params.accountId, params.amount),
                (acc) =>
                  `${acc.name}에서 ${formatKRW(params.amount)} 출금 완료`,
              )
            case "transfer":
              return Effect.map(
                bank.transfer(params.accountId, params.targetId, params.amount),
                () =>
                  `${formatKRW(params.amount)} 이체 완료`,
              )
          }
        }),
        // 타입 안전한 에러 처리 — 에러 타입별 사용자 메시지
        Effect.catchTag("InsufficientFundsError", (e) =>
          Effect.fail(
            `Insufficient funds: balance is ${formatKRW(e.balance)}, requested ${formatKRW(e.requested)}` as const,
          ),
        ),
        Effect.catchTag("AccountNotFoundError", (e) =>
          Effect.fail(`Account not found: ${e.accountId}` as const),
        ),
        Effect.catchTag("InvalidAmountError", (e) =>
          Effect.fail(`Invalid amount: ${e.reason}` as const),
        ),
        Effect.catchTag("TransferError", (e) =>
          Effect.fail(`Transfer failed: ${e.reason}` as const),
        ),
      ) as Effect.Effect<string, string, BankService>,
  )

  const handleSubmit = () => {
    if (!selectedAccountId) return
    const parsedAmount = parseInt(amount.replace(/,/g, ""), 10)
    if (isNaN(parsedAmount)) {
      setMessage({ type: "error", text: "Please enter a valid amount" })
      return
    }

    setMessage(null)
    executeTransaction.run({
      type: txType,
      accountId: selectedAccountId,
      amount: parsedAmount,
      targetId: targetAccountId,
    })
  }

  // Effect 결과를 메시지로 반영
  const result = executeTransaction.result
  const displayMessage =
    result._tag === "Success"
      ? { type: "success" as const, text: result.value }
      : result._tag === "Failure"
        ? { type: "error" as const, text: String(result.error) }
        : message

  const otherAccounts =
    accountsResult._tag === "Success"
      ? accountsResult.value.filter(
          (a: Account) => a.id !== selectedAccountId,
        )
      : []

  // 성공 시 상위 컴포넌트에 알림
  if (result._tag === "Success" && message?.type !== "success") {
    setTimeout(() => {
      setMessage({ type: "success", text: result.value })
      setAmount("")
      onComplete()
    }, 0)
  }

  if (!selectedAccountId) {
    return (
      <div style={{ padding: 16, color: "#718096", textAlign: "center" }}>
        Select an account to make a transaction
      </div>
    )
  }

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Transaction</h3>

      {/* 거래 유형 선택 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {(["deposit", "withdrawal", "transfer"] as const).map((type) => (
          <button
            key={type}
            onClick={() => {
              setTxType(type)
              setMessage(null)
              executeTransaction.reset()
            }}
            style={{
              ...tabStyle,
              background: txType === type ? "#3182ce" : "#edf2f7",
              color: txType === type ? "#fff" : "#4a5568",
            }}
          >
            {type === "deposit"
              ? "Deposit"
              : type === "withdrawal"
                ? "Withdraw"
                : "Transfer"}
          </button>
        ))}
      </div>

      {/* 이체 대상 (transfer만) */}
      {txType === "transfer" && (
        <div style={{ marginBottom: 12 }}>
          <label
            style={{ display: "block", fontSize: 13, color: "#4a5568", marginBottom: 4 }}
          >
            To Account
          </label>
          <select
            value={targetAccountId}
            onChange={(e) => setTargetAccountId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Select destination</option>
            {otherAccounts.map((a: Account) => (
              <option key={a.id} value={a.id}>
                {a.name} ({formatKRW(a.balance)})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 금액 입력 */}
      <div style={{ marginBottom: 12 }}>
        <label
          style={{ display: "block", fontSize: 13, color: "#4a5568", marginBottom: 4 }}
        >
          Amount (KRW)
        </label>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="e.g. 100000"
          style={inputStyle}
          data-testid="amount-input"
        />
      </div>

      {/* 실행 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={
          executeTransaction.isLoading ||
          !amount ||
          (txType === "transfer" && !targetAccountId)
        }
        style={{
          ...submitBtnStyle,
          opacity:
            executeTransaction.isLoading ||
            !amount ||
            (txType === "transfer" && !targetAccountId)
              ? 0.5
              : 1,
        }}
        data-testid="submit-tx"
      >
        {executeTransaction.isLoading
          ? "Processing..."
          : txType === "deposit"
            ? "Deposit"
            : txType === "withdrawal"
              ? "Withdraw"
              : "Transfer"}
      </button>

      {/* 결과 메시지 */}
      {displayMessage && (
        <div
          data-testid="tx-message"
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 6,
            fontSize: 13,
            background:
              displayMessage.type === "success" ? "#c6f6d5" : "#fed7d7",
            color: displayMessage.type === "success" ? "#22543d" : "#9b2c2c",
          }}
        >
          {displayMessage.text}
        </div>
      )}
    </div>
  )
}

const tabStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 12px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  transition: "all 0.15s",
  fontFamily: "inherit",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 10,
  fontSize: 14,
  borderRadius: 6,
  border: "1px solid #e2e8f0",
  boxSizing: "border-box",
  fontFamily: "inherit",
}

const submitBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 6,
  border: "none",
  background: "#3182ce",
  color: "#fff",
  cursor: "pointer",
  transition: "opacity 0.15s",
  fontFamily: "inherit",
}
