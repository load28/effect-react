/**
 * Bank Demo — Typed Error Hierarchy
 *
 * Effect의 타입 안전한 에러 처리를 보여줍니다.
 * 각 에러는 Data.TaggedError를 상속하여 패턴 매칭이 가능합니다.
 */
import { Data } from "effect"

export class InsufficientFundsError extends Data.TaggedError(
  "InsufficientFundsError",
)<{
  readonly accountId: string
  readonly balance: number
  readonly requested: number
}> {}

export class AccountNotFoundError extends Data.TaggedError(
  "AccountNotFoundError",
)<{
  readonly accountId: string
}> {}

export class InvalidAmountError extends Data.TaggedError(
  "InvalidAmountError",
)<{
  readonly amount: number
  readonly reason: string
}> {}

export class TransferError extends Data.TaggedError("TransferError")<{
  readonly from: string
  readonly to: string
  readonly reason: string
}> {}

export type BankError =
  | InsufficientFundsError
  | AccountNotFoundError
  | InvalidAmountError
  | TransferError
