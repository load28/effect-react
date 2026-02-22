# effect-react: 훅이 Effect를 인자로 받는 패턴 전체 평가

## 평가 대상

effect-react의 모든 훅이 **Effect를 직접 인자로 받는 설계** 자체에 대한 기술적/아키텍처적 평가.

```tsx
useRunEffect(effect, { deps })        // Effect → EffectResult
useEffectState(effect)                // Effect → [EffectResult, setter]
useEffectCallback((args) => effect)   // fn → Effect → { run, result }
```

---

## 대부분의 이점은 Effect 자체의 이점이다

훅이 Effect를 받기 때문에 가능하다고 주장되는 것들:

| 주장되는 이점 | 실제 귀속 |
|-------------|----------|
| 선언적 합성 (retry, timeout, tap) | Effect 파이프라인의 능력. 훅 밖에서 합성이 일어남 |
| 구조적 취소 (Fiber interrupt) | Effect 런타임의 능력. `useEffect` 안에서 `runFork`해도 동일 |
| 타입 레벨 에러 (`E`) | Effect 타입 시스템의 능력 |
| DI (`R` 파라미터) | `useService`가 담당. 또한 `useContext` 조합으로도 가능 |

**합성, 취소, 타입 에러 — 전부 Effect 자체의 이점이다.** 훅은 Effect를 실행하는 통로일 뿐이고, 이 통로가 Effect를 받든 Promise를 받든 콜백을 받든 **전달 형식의 차이**일 뿐이다.

```tsx
// 이 세 가지는 본질적으로 같은 일을 한다
useRunEffect(effect)                              // Effect를 받음
useAsync(() => runtime.runPromise(effect), [])     // Promise를 받음
useEffect(() => { runtime.runFork(effect) }, [])   // 콜백 안에서 실행
```

---

## 훅이 Effect를 받는 것의 진짜 가치: 보일러플레이트 제거

Effect를 직접 받지 않으면 매번 이걸 반복해야 한다:

```tsx
// Effect를 직접 받으면
const result = useRunEffect(myEffect)              // 1줄

// 안 받으면 매 컴포넌트마다
const [result, setResult] = useState(Loading)
useEffect(() => {
  const fiber = runtime.runFork(myEffect)
  fiber.addObserver((exit) => {
    if (Exit.isSuccess(exit)) setResult(Success(exit.value))
    else setResult(Failure(...))
  })
  return () => fiber.unsafeInterruptAsFork(fiber.id())
}, [])
```

fiber 관리 + EffectResult 매핑 + cleanup을 매번 반복하지 않아도 되는 것.

---

## "보일러플레이트 제거"는 충분히 가치 있다

"새로운 능력을 부여하는 건 아니다"라고 하면 가치가 낮아 보이지만, React 생태계에서 가장 성공한 라이브러리들이 전부 동일한 성격이다:

- `useState` → `this.state` + `this.setState` 보일러플레이트 제거
- `useEffect` → `componentDidMount` + `componentWillUnmount` 보일러플레이트 제거
- TanStack Query → `useEffect` + `useState` + loading/error 보일러플레이트 제거

전부 "새로운 능력"이 아니라 **반복되는 패턴의 추상화**인데, 실제로는:

1. **버그를 구조적으로 제거한다** — cleanup 누락, race condition, 불일치 상태를 실수할 여지 자체를 없앤다. fiber 생성 → Exit 매핑 → interrupt cleanup을 매번 직접 쓰면 반드시 실수가 생긴다.
2. **코드를 예측 가능하게 만든다** — 팀 전체가 동일한 패턴으로 Effect를 실행하게 강제한다.
3. **인지 부하를 줄인다** — fiber 관리, Exit 매핑, interrupt 전파를 매번 생각하지 않아도 된다.

**라이브러리의 가치 기준은 "새로운 능력을 부여하는가"가 아니라 "이 추상화 없이 같은 수준의 정확성을 유지할 수 있는가"다.** fiber 생명주기 관리를 매 컴포넌트에서 직접 하면서 정확성을 유지하기는 현실적으로 어렵다. 그걸 훅 안에 가두는 건 편의성이 아니라 **정확성 보장**이다.

---

## 전체 훅 체계의 역할

effect-react의 훅 체계는 **Effect 런타임을 React 생명주기에 올바르게 연결하는 접착제(glue)**다.

- `useRunEffect`: Effect 실행 → fiber 생성 → 결과 매핑 → cleanup 인터럽트
- `useEffectState`: 동일 + setter 제공
- `useEffectCallback`: 동일 + 수동 트리거
- `useService`: Tag → Effect 실행 → 서비스 인스턴스 반환

Effect가 이미 가진 합성/취소/타입 안전성을 React 컴포넌트에서 **정확하고 일관되게** 쓸 수 있게 하는 것이 핵심이다.

---

## 최종 판정

**effect-react 훅이 Effect를 받는 건 "Effect의 능력을 React에서 정확하게 쓸 수 있게 보장하는 접착제"다.** 합성/취소/타입 안전성은 Effect 자체의 능력이지만, 그 능력을 React 생명주기에 올바르게 연결하는 작업은 반복적이고 실수하기 쉽다. 이 훅 체계는 그 연결의 정확성을 보장하며, 이는 TanStack Query가 fetch + 상태 관리의 정확성을 보장하는 것과 동일한 수준의 실질적 가치다.
