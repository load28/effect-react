/**
 * Bank Demo — Service Layer
 *
 * Effect의 핵심 기능을 시연합니다:
 *
 * 1. 의존성 주입 (DI): Context.Tag + Layer 패턴
 * 2. pipe/flow: 함수 합성으로 비즈니스 로직 구성
 * 3. 에러 처리: 타입 안전한 에러 전파
 * 4. 다형성: 같은 인터페이스의 다른 구현 (InMemory vs Premium)
 */
import { Context, Effect, Layer, pipe } from "effect"
import {
  InsufficientFundsError,
  AccountNotFoundError,
  InvalidAmountError,
  TransferError,
} from "./errors"

// ─── Domain Models ───

export interface Account {
  readonly id: string
  readonly name: string
  readonly balance: number
  readonly type: "checking" | "savings"
}

export interface Transaction {
  readonly id: string
  readonly fromAccountId: string
  readonly toAccountId: string
  readonly amount: number
  readonly description: string
  readonly timestamp: number
  readonly type: "deposit" | "withdrawal" | "transfer"
}

// ─── AccountRepository (데이터 접근 계층) ───

export class AccountRepository extends Context.Tag("AccountRepository")<
  AccountRepository,
  {
    readonly getAll: Effect.Effect<readonly Account[]>
    readonly getById: (
      id: string,
    ) => Effect.Effect<Account, AccountNotFoundError>
    readonly update: (account: Account) => Effect.Effect<Account>
  }
>() {}

const makeAccountRepository = Effect.sync(() => {
  let accounts: Account[] = [
    { id: "acc-1", name: "Checking Account", balance: 1500000, type: "checking" },
    { id: "acc-2", name: "Savings Account", balance: 5000000, type: "savings" },
    { id: "acc-3", name: "Emergency Fund", balance: 2000000, type: "savings" },
  ]

  return AccountRepository.of({
    getAll: Effect.sync(() => [...accounts]),

    getById: (id: string) =>
      Effect.sync(() => accounts.find((a) => a.id === id)).pipe(
        Effect.flatMap((account) =>
          account
            ? Effect.succeed(account)
            : Effect.fail(new AccountNotFoundError({ accountId: id })),
        ),
      ),

    update: (account: Account) =>
      Effect.sync(() => {
        accounts = accounts.map((a) => (a.id === account.id ? account : a))
        return account
      }),
  })
})

export const AccountRepositoryLive = Layer.effect(
  AccountRepository,
  makeAccountRepository,
)

// ─── TransactionRepository (거래 내역 저장소) ───

export class TransactionRepository extends Context.Tag("TransactionRepository")<
  TransactionRepository,
  {
    readonly getAll: Effect.Effect<readonly Transaction[]>
    readonly getByAccountId: (
      accountId: string,
    ) => Effect.Effect<readonly Transaction[]>
    readonly add: (tx: Omit<Transaction, "id" | "timestamp">) => Effect.Effect<Transaction>
  }
>() {}

const makeTransactionRepository = Effect.sync(() => {
  let transactions: Transaction[] = []
  let nextId = 1

  return TransactionRepository.of({
    getAll: Effect.sync(() => [...transactions]),

    getByAccountId: (accountId: string) =>
      Effect.sync(() =>
        transactions.filter(
          (tx) =>
            tx.fromAccountId === accountId || tx.toAccountId === accountId,
        ),
      ),

    add: (tx) =>
      Effect.sync(() => {
        const transaction: Transaction = {
          ...tx,
          id: `tx-${nextId++}`,
          timestamp: Date.now(),
        }
        transactions = [transaction, ...transactions]
        return transaction
      }),
  })
})

export const TransactionRepositoryLive = Layer.effect(
  TransactionRepository,
  makeTransactionRepository,
)

// ─── FeePolicy (수수료 정책 — 다형성 시연) ───

export class FeePolicy extends Context.Tag("FeePolicy")<
  FeePolicy,
  {
    readonly name: string
    readonly calculateFee: (amount: number) => Effect.Effect<number>
    readonly calculateInterestRate: (type: Account["type"]) => Effect.Effect<number>
  }
>() {}

/**
 * 일반 수수료 정책: 이체 수수료 1%, 이자율 낮음
 */
export const StandardFeePolicyLive = Layer.succeed(
  FeePolicy,
  FeePolicy.of({
    name: "Standard",
    calculateFee: (amount: number) =>
      Effect.succeed(Math.floor(amount * 0.01)),
    calculateInterestRate: (type) =>
      Effect.succeed(type === "savings" ? 0.02 : 0.005),
  }),
)

/**
 * 프리미엄 수수료 정책: 수수료 무료, 이자율 높음
 * → 같은 FeePolicy 인터페이스의 다른 구현 (다형성)
 */
export const PremiumFeePolicyLive = Layer.succeed(
  FeePolicy,
  FeePolicy.of({
    name: "Premium",
    calculateFee: (_amount: number) => Effect.succeed(0),
    calculateInterestRate: (type) =>
      Effect.succeed(type === "savings" ? 0.05 : 0.02),
  }),
)

// ─── BankService (비즈니스 로직 — pipe/flow/DI 활용) ───

export class BankService extends Context.Tag("BankService")<
  BankService,
  {
    readonly getAccounts: Effect.Effect<readonly Account[]>
    readonly getAccount: (
      id: string,
    ) => Effect.Effect<Account, AccountNotFoundError>
    readonly deposit: (
      accountId: string,
      amount: number,
    ) => Effect.Effect<
      Account,
      AccountNotFoundError | InvalidAmountError
    >
    readonly withdraw: (
      accountId: string,
      amount: number,
    ) => Effect.Effect<
      Account,
      AccountNotFoundError | InvalidAmountError | InsufficientFundsError
    >
    readonly transfer: (
      fromId: string,
      toId: string,
      amount: number,
    ) => Effect.Effect<
      Transaction,
      | AccountNotFoundError
      | InvalidAmountError
      | InsufficientFundsError
      | TransferError
    >
    readonly getTransactions: (
      accountId: string,
    ) => Effect.Effect<readonly Transaction[]>
    readonly getFeePolicyName: Effect.Effect<string>
  }
>() {}

/**
 * BankService 구현
 *
 * pipe를 활용한 함수 합성과 의존성 주입을 동시에 보여줍니다.
 * AccountRepository, TransactionRepository, FeePolicy 3개의 서비스를 주입받습니다.
 */
const makeBankService = Effect.all({
  repo: AccountRepository,
  txRepo: TransactionRepository,
  feePolicy: FeePolicy,
}).pipe(
  Effect.map(({ repo, txRepo, feePolicy }) => {
    // 금액 검증 — pipe로 합성
    const validateAmount = (amount: number): Effect.Effect<number, InvalidAmountError> =>
      amount <= 0
        ? Effect.fail(
            new InvalidAmountError({
              amount,
              reason: "Amount must be positive",
            }),
          )
        : Effect.succeed(amount)

    return BankService.of({
      getAccounts: repo.getAll,

      getAccount: (id) => repo.getById(id),

      // 입금: .pipe()로 검증 → 조회 → 업데이트 → 기록 체이닝
      deposit: (accountId, amount) =>
        validateAmount(amount).pipe(
          Effect.andThen(() => repo.getById(accountId)),
          Effect.andThen((account) =>
            repo.update({ ...account, balance: account.balance + amount }),
          ),
          Effect.tap((account) =>
            txRepo.add({
              fromAccountId: "external",
              toAccountId: account.id,
              amount,
              description: `Deposit to ${account.name}`,
              type: "deposit",
            }),
          ),
        ),

      // 출금: .pipe()로 검증 → 조회 → 잔액 확인 → 업데이트 → 기록
      withdraw: (accountId, amount) =>
        validateAmount(amount).pipe(
          Effect.andThen(() => repo.getById(accountId)),
          Effect.andThen((account) =>
            account.balance < amount
              ? Effect.fail(
                  new InsufficientFundsError({
                    accountId,
                    balance: account.balance,
                    requested: amount,
                  }),
                )
              : Effect.succeed(account),
          ),
          Effect.andThen((account) =>
            repo.update({ ...account, balance: account.balance - amount }),
          ),
          Effect.tap((account) =>
            txRepo.add({
              fromAccountId: account.id,
              toAccountId: "external",
              amount,
              description: `Withdrawal from ${account.name}`,
              type: "withdrawal",
            }),
          ),
        ),

      // 이체: .pipe()로 검증 → 수수료 계산 → 출금 → 입금 → 기록
      transfer: (fromId, toId, amount) => {
        // 같은 계좌 이체 방지
        const validated: Effect.Effect<number, InvalidAmountError | TransferError> =
          fromId === toId
            ? Effect.fail(
                new TransferError({
                  from: fromId,
                  to: toId,
                  reason: "Cannot transfer to the same account",
                }),
              )
            : validateAmount(amount)

        return validated.pipe(
          // 수수료 계산
          Effect.andThen(() => feePolicy.calculateFee(amount)),
          Effect.andThen((fee) =>
            repo.getById(fromId).pipe(
              // 출금 계좌에서 금액 + 수수료 차감
              Effect.andThen((from) =>
                from.balance < amount + fee
                  ? Effect.fail(
                      new InsufficientFundsError({
                        accountId: fromId,
                        balance: from.balance,
                        requested: amount + fee,
                      }),
                    )
                  : Effect.succeed(from),
              ),
              Effect.andThen((from) =>
                repo.update({
                  ...from,
                  balance: from.balance - amount - fee,
                }),
              ),
              // 입금 계좌에 금액 추가
              Effect.andThen(() => repo.getById(toId)),
              Effect.andThen((to) =>
                repo.update({ ...to, balance: to.balance + amount }),
              ),
              // 거래 기록
              Effect.andThen(() =>
                txRepo.add({
                  fromAccountId: fromId,
                  toAccountId: toId,
                  amount,
                  description:
                    fee > 0
                      ? `Transfer (fee: ${formatKRW(fee)})`
                      : `Transfer (no fee)`,
                  type: "transfer",
                }),
              ),
            ),
          ),
        )
      },

      getTransactions: (accountId) =>
        pipe(
          txRepo.getByAccountId(accountId),
          // pipe로 정렬 합성
          Effect.map((txs) => [...txs].sort((a, b) => b.timestamp - a.timestamp)),
        ),

      getFeePolicyName: Effect.sync(() => feePolicy.name),
    })
  }),
)

export const BankServiceLive = Layer.effect(BankService, makeBankService)

// ─── Layer 조합 ───

const BaseRepositories = Layer.mergeAll(
  AccountRepositoryLive,
  TransactionRepositoryLive,
)

/**
 * Standard 등급 — 수수료 있음
 */
export const StandardBankLayer = BankServiceLive.pipe(
  Layer.provide(Layer.mergeAll(BaseRepositories, StandardFeePolicyLive)),
)

/**
 * Premium 등급 — 수수료 무료
 * → Layer만 교체하면 전체 동작이 바뀜 (다형성 + DI의 힘)
 */
export const PremiumBankLayer = BankServiceLive.pipe(
  Layer.provide(Layer.mergeAll(BaseRepositories, PremiumFeePolicyLive)),
)

// ─── Utility ───

export const formatKRW = (amount: number): string =>
  `${amount.toLocaleString("ko-KR")}원`
