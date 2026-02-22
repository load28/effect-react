# useEffectState: Effect를 훅 인자로 받는 패턴 평가

## 평가 대상

`useEffectState`가 **값이 아닌 Effect(계산 기술서)를 인자로 받는 설계** 자체에 대한 기술적/아키텍처적 평가.

> 참고: API 호출로 상태를 초기화하는 것은 기존 `useState` + `useEffect`로도 가능하며, 그 자체는 차별점이 아님.

```tsx
// 기존 React — 값(value) 중심
const [data, setData] = useState<User | null>(null)
useEffect(() => { fetchUser().then(setData) }, [])

// useEffectState — 계산(Effect) 중심
const [data, setData] = useEffectState(
  Effect.flatMap(UserService, (s) => s.getMe)
)
```

---

## 1. 실행 시점 제어 (Lazy Evaluation)

`useEffectState(effect)`는 아직 실행되지 않은 계산 기술서를 받는다. 훅이 "언제, 어떤 런타임에서 실행할지"를 제어한다.

**하지만 이것이 기존 패턴과 본질적으로 다른가?**

```tsx
// 기존 패턴 — useEffect 콜백도 "훅이 실행 시점을 결정"하는 구조
useEffect(() => {
  fetchUser().then(setData)
}, [])
```

`useEffect`의 콜백 역시 React가 실행 시점을 결정한다. **실행 시점 제어라는 측면만 놓고 보면 구조적 차이 없음.**

---

## 2. 의존성 표현 (R 타입 파라미터)

```tsx
useEffectState<A, E, R>(initialEffect: Effect<A, E, R>)
//                    ^ R: 이 계산이 실행되려면 필요한 서비스 집합
```

Effect를 넘기면 의존성이 타입에 인코딩되고, `EffectProvider`의 `ManagedRuntime<R>`이 자동 해결한다.

**하지만 이것도 `useContext` 조합으로 대체 가능하다:**

```tsx
const service = useContext(UserServiceContext)
useEffect(() => { service.getMe().then(setData) }, [service])
```

타입 안전성 측면에서 `R` 파라미터가 더 엄밀하지만, 결과적으로 같은 일을 한다.

---

## 3. 합성 (Composition) — 유일하게 의미 있는 구조적 차이

Effect를 값으로 다루기 때문에 **넘기기 전에 파이프라인 합성이 가능하다:**

```tsx
const initialLoad = pipe(
  Effect.flatMap(UserService, (s) => s.getMe),
  Effect.tap((user) => Effect.log(`Loaded: ${user.name}`)),
  Effect.retry(Schedule.exponential("100 millis")),
  Effect.timeout("5 seconds"),
)

const [user] = useEffectState(initialLoad)
```

기존 패턴으로 동일한 것을 구현하면:

```tsx
const [user, setUser] = useState(null)
useEffect(() => {
  let cancelled = false
  const controller = new AbortController()

  const fetchWithRetry = async () => {
    for (let i = 0; i < 3; i++) {
      try {
        const result = await fetchUser({ signal: controller.signal })
        console.log(`Loaded: ${result.name}`)
        if (!cancelled) setUser(result)
        return
      } catch (e) {
        if (cancelled) return
        await new Promise(r => setTimeout(r, 100 * Math.pow(2, i)))
      }
    }
  }

  const timeout = setTimeout(() => controller.abort(), 5000)
  fetchWithRetry().finally(() => clearTimeout(timeout))

  return () => { cancelled = true; controller.abort() }
}, [])
```

retry, timeout, logging이 모두 명령형 코드로 풀어져야 한다. **Effect 파이프라인의 선언적 합성력이 훅 인터페이스를 통해 그대로 전달되는 것이 실질적 이점.**

---

## 4. 취소 (Cancellation)

Effect의 Fiber 인터럽트 vs 기존의 `AbortController` + `cancelled` 플래그:

```tsx
// 기존 — 수동 취소 관리
useEffect(() => {
  let cancelled = false
  const controller = new AbortController()
  fetch(url, { signal: controller.signal }).then(data => {
    if (!cancelled) setData(data)
  })
  return () => { cancelled = true; controller.abort() }
}, [])

// useEffectState — Fiber가 자동 처리
// useEffect cleanup에서 fiber.unsafeInterruptAsFork() 한 줄
```

Fiber 인터럽트는 Effect 파이프라인 전체를 관통하므로 중첩 비동기 작업도 정확히 취소된다. 하지만 이것은 "Effect를 인자로 받아서" 가능한 것이 아니라, Effect 런타임 자체의 장점이다. `useEffect` 안에서 `runtime.runFork`를 직접 써도 동일한 취소가 가능하다.

---

## 5. 에러 타입 표현

```tsx
useEffectState<User, ApiError, UserService>(effect)
//                   ^ E: 실패 유형이 컴파일 타임에 잡힘
```

`useState<User | null>(null)` + `useEffect`에서는 에러 타입이 표현되지 않는다. catch에서 `unknown`으로 받을 뿐이다. 이 점은 Effect 타입 시스템의 이점이지만, 마찬가지로 Effect를 훅 인자로 넘기는 것의 이점이라기보다 Effect 자체의 이점이다.

---

## 종합 판정

| 주장되는 이점 | 실제 평가 |
|-------------|----------|
| 실행 시점 제어 (lazy) | `useEffect` 콜백과 본질 동일 — 차별점 아님 |
| DI/의존성 표현 (`R`) | `useContext` 조합으로 대체 가능 — 편의성 차이일 뿐 |
| 합성 (retry, timeout 등) | **실질적 이점.** Effect 파이프라인의 합성력이 훅 인터페이스로 전달됨 |
| 취소 (Fiber interrupt) | Effect 런타임의 이점이지 "인자로 받는 패턴"의 이점은 아님 |
| 에러 타입 (`E`) | Effect 타입 시스템의 이점이지 훅 설계의 이점은 아님 |

**결론**: Effect를 훅 인자로 받는 것 자체는 "계산을 값으로 다루기(reified computation)"라는 FP 원칙의 적용이다. 초기화만 놓고 보면 `useState` + `useEffect`와 결과적으로 동일한 일을 한다. **진짜 이점은 초기화 자체가 아니라, 넘기는 Effect가 이미 retry/timeout/logging/DI를 내장한 합성된 파이프라인일 때 나타난다.** 단순 API 한 번 호출하는 경우라면 기존 패턴 대비 실질적 이점이 크지 않다.
