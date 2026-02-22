# 제안: effect-react에 시그널 기반 반응형 도입 검토

## 현재 아키텍처: Observer/Pub-Sub

현재 모든 훅이 동일한 패턴을 사용합니다:

```
ComponentStore (value + listeners)
    ↓
useSyncExternalStore (React 브릿지)
    ↓
useEffect → runtime.runFork(effect) → fiber.addObserver → store.set()
    ↓
listeners 호출 → React 리렌더
```

```ts
// reactive.ts — 현재 구현
export function createComponentStore<T>(initialValue: T): ComponentStore<T> {
  let currentValue = initialValue
  const listeners = new Set<() => void>()

  return {
    getSnapshot: () => currentValue,
    set: (value) => { currentValue = value; listeners.forEach(l => l()) },
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) }
  }
}
```

이것은 본질적으로 **수동 구독 기반 옵저버 패턴**입니다. 시그널과 비교하면:

| 특성 | 현재 (Observer) | 시그널 (Signal) |
|-----|----------------|----------------|
| 의존성 추적 | 수동 (`deps` 배열) | 자동 (읽기 시 추적) |
| 업데이트 범위 | 컴포넌트 전체 리렌더 | 시그널을 읽은 곳만 업데이트 |
| 파생 값 | `useMemo` + deps | `computed` 자동 추적 |
| 일관성 보장 | React 배칭에 의존 | 토폴로지 정렬 (glitch-free) |

---

## 시그널이란

SolidJS, Svelte 5, Vue 3, TC39 Signals 제안이 공유하는 핵심 원리:

```ts
// 1. 반응형 상태 (Signal.State)
const count = new Signal.State(0)

// 2. 읽기 = 자동 의존성 등록
count.get()  // 현재 반응형 컨텍스트에 "나는 count에 의존한다" 등록

// 3. 파생 값 (Signal.Computed) — 의존성 자동 추적
const doubled = new Signal.Computed(() => count.get() * 2)
// count가 변하면 doubled도 자동으로 재계산

// 4. 부수효과 (Watcher)
const watcher = new Signal.subtle.Watcher(() => { /* count 또는 doubled 변경 시 */ })
```

핵심 차이: **"무엇이 무엇에 의존하는지"를 런타임이 자동으로 추적**합니다.

---

## React 내에서의 근본적 제약

### 시그널의 최대 장점인 "파인-그레인 DOM 업데이트"는 React에서 불가능합니다

```tsx
// SolidJS — 시그널이 변하면 해당 <span>만 업데이트 (컴포넌트 함수 재실행 없음)
function Counter() {
  const [count, setCount] = createSignal(0)
  return <span>{count()}</span>  // count 변경 → 이 span만 패치
}

// React — 어떤 상태가 변하든 컴포넌트 함수 전체가 재실행됨
function Counter() {
  const [count, setCount] = useState(0)
  return <span>{count}</span>  // count 변경 → Counter() 전체 재실행 → VDOM diff
}
```

React의 렌더링 모델은 **컴포넌트 단위**입니다. 상태가 변하면 해당 컴포넌트 함수 전체를 재실행하고, Virtual DOM을 diffing합니다. 시그널의 핵심 이점인 "읽은 곳만 업데이트"는 이 모델과 양립 불가능합니다.

**따라서 React 내에서 시그널의 4가지 이점 중 실현 가능한 것:**

| 시그널 이점 | React 내 실현 가능성 |
|-----------|-------------------|
| 파인-그레인 DOM 업데이트 | **불가능** — React 렌더링 모델의 근본적 제약 |
| 자동 의존성 추적 | **부분적** — 컴파일러 변환 필요 (@preact/signals-react) |
| 파생 값 자동 추적 | **낮은 이점** — `useMemo`로 대체 가능 |
| Glitch-free 업데이트 | **불필요** — React 배칭이 이미 처리 |

---

## 그럼에도 의미 있는 개선: 자동 의존성 추적

현재 가장 취약한 부분은 `useRunEffect`의 수동 `deps` 배열입니다:

```tsx
// 현재 — deps 누락하면 stale closure 버그
const result = useRunEffect(getUserById(userId), { deps: [userId] })
//                                                  ↑ 이걸 빼먹으면 버그

// 시그널 기반 — 의존성 자동 추적
const userId$ = signal(userId)
const result = useRunEffect(() => getUserById(userId$.get()))
//                                              ↑ 읽기만으로 의존성 등록 완료
```

이 패턴은 `deps` 배열 관련 버그를 **구조적으로 제거**합니다. React 컴파일러(React Forget)도 같은 문제를 해결하려 하지만, 아직 정식 출시되지 않았습니다.

---

## 구체적 제안: 3단계 접근

### 1단계: Effect의 SubscriptionRef 활용 (즉시 가능)

현재 `ComponentStore`는 Effect의 `SubscriptionRef`를 수동으로 재구현한 것입니다. Effect 자체의 반응형 프리미티브를 직접 사용하면 Effect 생태계와의 일관성이 높아집니다.

```ts
// 현재: 커스텀 구현
const store = createComponentStore<EffectResult<A, E>>(Loading)

// 제안: Effect의 SubscriptionRef 활용
import { SubscriptionRef } from "effect"

const ref = SubscriptionRef.make(Loading)
// ref.changes → Stream으로 변경 사항 구독 가능
// ref.get / ref.set → 읽기/쓰기
```

**장점:**
- Effect 생태계와 일관된 반응형 모델
- `SubscriptionRef.changes`로 Stream 기반 파생 값 가능
- Semaphore로 보호된 원자적 업데이트

**단점:**
- `useSyncExternalStore`와의 브릿지가 여전히 필요
- ComponentStore보다 무거움 (Semaphore 오버헤드)
- 현재 ComponentStore가 이미 충분히 가볍고 정확함

**판단: 이점이 비용을 정당화하지 못합니다.** ComponentStore는 SubscriptionRef의 최소 하위 집합을 정확히 구현하고 있으며, React 브릿지 용도로는 추가 기능(Stream, Semaphore)이 불필요합니다.

### 2단계: TC39 Signals Polyfill 도입 (실험적)

TC39 Signals 제안의 polyfill(`signal-polyfill`)을 사용하여 ComponentStore를 대체합니다.

```ts
// reactive-signals.ts — 시그널 기반 구현
import { Signal } from "signal-polyfill"

export function createSignalStore<T>(initialValue: T) {
  const state = new Signal.State(initialValue)

  return {
    getSnapshot: () => state.get(),
    set: (value: T) => state.set(value),
    // useSyncExternalStore용 브릿지
    subscribe: (listener: () => void) => {
      const watcher = new Signal.subtle.Watcher(() => listener())
      watcher.watch(state)
      return () => watcher.unwatch(state)
    }
  }
}
```

**장점:**
- TC39 표준 트랙에 있는 API — 미래 호환성
- `Signal.Computed`로 파생 값 자동 추적 가능
- 프레임워크 중립적 반응형 프리미티브

**단점:**
- TC39 Stage 1 — 아직 확정되지 않은 사양
- React 내에서 여전히 `useSyncExternalStore` 브릿지 필요
- 현재 ComponentStore 대비 API 표면적만 바뀌고 실질 동작은 동일

**파생 값(Computed)이 의미 있는 경우:**

```tsx
// 시그널 기반 — 자동 추적 파생 값
const users = new Signal.State<User[]>([])
const activeCount = new Signal.Computed(() =>
  users.get().filter(u => u.active).length
)
// users가 변하면 activeCount 자동 재계산

// 현재 React — 수동 메모이제이션
const activeCount = useMemo(
  () => users.filter(u => u.active).length,
  [users]  // deps 누락 가능
)
```

### 3단계: 프레임워크 어댑터 아키텍처 (장기)

effect-react의 핵심 로직(Effect 실행, fiber 관리, 결과 매핑)을 프레임워크 독립적으로 분리하고, 렌더링 통합만 어댑터로 교체합니다.

```
effect-core (프레임워크 독립)
├── effect-react   (useSyncExternalStore 어댑터)
├── effect-solid   (createSignal 어댑터)
└── effect-svelte  (runes/$state 어댑터)
```

```ts
// effect-core: 프레임워크 독립 핵심
export function createEffectRunner<A, E, R>(
  runtime: ManagedRuntime<R>,
  effect: Effect<A, E, R>,
) {
  // 시그널 기반 반응형 상태
  const result = new Signal.State<EffectResult<A, E>>(Loading)
  let fiber: Fiber | null = null

  return {
    start() {
      result.set(Loading)
      fiber = runtime.runFork(effect)
      fiber.addObserver((exit) => {
        if (Exit.isSuccess(exit)) result.set(Success(exit.value))
        else { /* ... */ }
      })
    },
    stop() { fiber?.unsafeInterruptAsFork(fiber.id()) },
    result,  // Signal.State — 어떤 프레임워크든 구독 가능
  }
}

// effect-react 어댑터
function useRunEffect(effect) {
  const runner = useRef(createEffectRunner(runtime, effect))
  const result = useSyncExternalStore(
    (cb) => { /* Signal.subtle.Watcher로 구독 */ },
    () => runner.current.result.get()
  )
  useEffect(() => { runner.current.start(); return () => runner.current.stop() }, deps)
  return result
}

// effect-solid 어댑터 (가상)
function useRunEffect(effect) {
  const runner = createEffectRunner(runtime, effect)
  // SolidJS에서는 Signal.State를 직접 읽으면 끝 — 파인-그레인 업데이트 자동
  onMount(() => runner.start())
  onCleanup(() => runner.stop())
  return () => runner.result.get()  // 읽는 곳만 업데이트
}
```

**이 구조에서 SolidJS/Svelte 어댑터는 시그널의 진짜 이점(파인-그레인 업데이트)을 활용할 수 있습니다.** React 어댑터는 현재와 동일하게 `useSyncExternalStore` 브릿지를 사용하되, 핵심 로직 중복이 사라집니다.

---

## 최종 판단

| 단계 | 권장 여부 | 이유 |
|-----|---------|------|
| 1단계: SubscriptionRef | **비권장** | 현재 ComponentStore가 이미 충분히 정확하고 가벼움 |
| 2단계: TC39 Signals | **관망** | Stage 1 사양. 실질적 이점은 Computed뿐이며, React 내에서는 useMemo로 대체 가능 |
| 3단계: 어댑터 아키텍처 | **장기 검토 가치 있음** | 멀티 프레임워크 지원 시 핵심 로직 중복 제거. 시그널의 진짜 이점은 SolidJS/Svelte 어댑터에서 실현됨 |

### 핵심 결론

**React 내에서 시그널 도입의 실질적 이점은 제한적입니다.** React의 컴포넌트 단위 리렌더링 모델이 시그널의 최대 장점(파인-그레인 DOM 업데이트)을 무효화하기 때문입니다. 현재 `ComponentStore` + `useSyncExternalStore` 조합은 React의 제약 내에서 이미 최적에 가까운 구현입니다.

시그널의 진정한 가치를 활용하려면 **SolidJS나 Svelte 5 같은 시그널 네이티브 프레임워크로의 어댑터 확장**이 올바른 방향이며, 이를 위해 3단계(프레임워크 독립 코어 분리)를 장기적으로 검토할 가치가 있습니다.

### React 한정으로 즉시 개선 가능한 것

시그널 도입 대신, 현재 아키텍처 내에서 가장 높은 ROI를 가진 개선은 **`deps` 배열 제거**입니다:

```tsx
// 현재 — deps 배열 수동 관리
const result = useRunEffect(getUserById(userId), { deps: [userId] })

// 개선안 — Effect를 매 렌더마다 받되, 내부에서 shallow compare로 재실행 판단
const result = useRunEffect(getUserById(userId))
// 훅 내부에서 effect의 참조 동일성 또는 deps 자동 추출로 불필요한 재실행 방지
```

이것은 시그널 없이도, `useRef` + 이전 값 비교만으로 구현 가능하며, `deps` 관련 버그를 제거합니다.
