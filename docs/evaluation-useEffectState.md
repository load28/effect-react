# useEffectState: Effect를 훅 인자로 받는 패턴 평가

## 평가 대상

`useEffectState`가 **값이 아닌 Effect(계산 기술서)를 인자로 받는 설계** 자체에 대한 기술적/아키텍처적 평가.

> API 호출로 상태를 초기화하는 것은 기존 `useState` + `useEffect`로도 가능하며, 그 자체는 차별점이 아님.

---

## 실전 사용 패턴: useEffectState에 Effect를 박는 경우는 드물다

effect-react가 이미 제공하는 훅 구성을 보면:

```tsx
// 실전에서 일반적인 패턴
const [count, setCount] = useState(0)                              // 초기값
const users = useRunEffect(fetchUsers, { deps: [page] })           // API 호출 (Effect 파이프라인 합성 가능)
const service = useService(UserService)                            // DI

// useEffectState에 Effect를 박는 패턴 — 예외적
const [data, setData] = useEffectState(
  Effect.flatMap(UserService, (s) => s.getAll)
)
```

| 역할 | 담당 훅 | Effect를 받는가 |
|-----|---------|---------------|
| 초기값 설정 | `useState` | X (plain value) |
| API 호출 / 사이드이펙트 | `useRunEffect` | O (Effect 파이프라인) |
| 서비스 의존성 주입 | `useService` | X (Tag만 받음) |
| 상태 + 비동기 초기화 | `useEffectState` | O (Effect) |

**`useRunEffect`가 이미 Effect를 받으므로, 합성(composition)의 이점은 거기서 누린다.** `useService`가 DI를 담당하므로 `R` 타입 파라미터의 이점도 `useEffectState`에 의존할 필요가 없다.

---

## useEffectState에 Effect를 넘기는 것의 실질적 가치

### 남는 것: "초기 로딩 + 이후 setter 업데이트"를 하나의 훅으로 묶는 편의성

```tsx
// useEffectState — 한 줄로 초기 로딩 + setter
const [todos, setTodos] = useEffectState(
  Effect.flatMap(TodoService, (s) => s.getAll)
)

// 동일한 것을 useRunEffect + useState로 분리하면
const todosResult = useRunEffect(Effect.flatMap(TodoService, (s) => s.getAll))
// ... 하지만 setter가 없으므로 mutation 후 refetch를 위해 추가 구조가 필요
```

`useEffectState`의 실질적 가치는 "Effect로 초기화"가 아니라 **"초기 로딩과 setter를 하나의 훅에 묶는 것"**이다. Effect를 인자로 받는 것은 그 부수적 결과일 뿐이다.

### 합성의 이점은 useRunEffect에서 이미 달성

```tsx
// useRunEffect도 Effect를 받으므로 파이프라인 합성 가능
const result = useRunEffect(
  pipe(
    Effect.flatMap(UserService, (s) => s.getAll),
    Effect.retry(Schedule.exponential("100 millis")),
    Effect.timeout("5 seconds"),
  ),
  { deps: [page] }
)
```

`useRunEffect`가 Effect를 받는 것은 자연스럽다 — 사이드이펙트 실행이 존재 이유이므로. `useEffectState`가 Effect를 받는 것은 "초기값을 비동기로 가져와야 해서" 어쩔 수 없이 필요한 것이지, 설계적 강점이 아니다.

### DI는 useService가 담당

```tsx
const todoService = useService(TodoService)
// todoService._tag === "Success"이면 todoService.value로 서비스 접근

// useEffectState에서 Effect.flatMap(TodoService, ...)로 DI하는 것보다
// useService로 서비스를 먼저 꺼내는 것이 관심사 분리에 더 명확
```

---

## 함수형 프로그래밍 관점에서의 전체 훅 설계 평가

effect-react의 훅들이 Effect를 받는 구조는 전체적으로 FP에 가깝다:

```tsx
// 모든 사이드이펙트가 Effect로 기술되고, 훅이 실행을 담당
useRunEffect(effect)          // Effect → EffectResult (읽기 전용)
useEffectState(effect)        // Effect → [EffectResult, setter]
useEffectCallback(fn)         // (...args) → Effect → { run, result }
```

**이 구조의 FP적 가치:**

1. **사이드이펙트가 값(Effect)으로 표현됨** — 순수 함수로 합성, 변환, 테스트 가능
2. **실행이 훅에 위임됨** — 컴포넌트는 "무엇을 할지" 기술하고, "어떻게 실행할지"는 런타임이 결정
3. **에러가 타입에 인코딩됨** — `E` 파라미터로 실패 경로가 컴파일 타임에 잡힘

하지만 이 가치는 **effect-react 전체의 설계 철학**이지, `useEffectState`가 Effect를 인자로 받는 것만의 이점은 아니다. `useRunEffect`도, `useEffectCallback`도 동일한 철학을 공유한다.

---

## 종합 판정

| 관점 | 평가 |
|-----|------|
| "Effect를 인자로 받는 것" 자체 | 설계적 강점이라기보다, 비동기 초기화를 위한 필요에 의한 결과 |
| 합성 (retry, timeout 등) | `useRunEffect`에서 이미 달성 — `useEffectState` 고유의 이점 아님 |
| DI | `useService`가 담당 — `useEffectState`의 `R` 파라미터에 의존할 필요 없음 |
| 실전 사용 빈도 | 대부분 `useState(초기값)` + `useRunEffect(effect)` 조합이 자연스러움 |
| `useEffectState`의 실질적 가치 | "초기 로딩 + setter"를 하나로 묶는 편의성. Effect를 받는 것은 부수적 |
| 전체 훅 설계의 FP적 가치 | 높음 — 모든 훅이 Effect를 기술/실행 분리 원칙을 따름 |

**결론**: `useEffectState`가 Effect를 인자로 받는 것은 아키텍처적 혁신이 아니라 **"초기값이 비동기일 수 있다"는 요구를 해결하기 위한 자연스러운 귀결**이다. 합성의 이점은 `useRunEffect`에서, DI는 `useService`에서 이미 제공된다. `useEffectState`의 진짜 가치는 Effect를 받는 것이 아니라, **초기 로딩과 setter-driven 업데이트를 하나의 인터페이스로 통합한 것**이다. 전체 훅 체계가 Effect를 중심으로 사이드이펙트를 값으로 다루는 FP 원칙을 따르는 것은 설계적으로 일관되고 건강하다.
