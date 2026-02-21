---
stepsCompleted: [1, 2]
inputDocuments: []
date: 2026-02-21
author: Root
---

# Product Brief: effect-react

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

**effect-react**는 React의 수퍼셋 라이브러리로, TypeScript가 JavaScript를 확장하듯 React를 Effect-TS aware하게 확장한다. 기존 React 코드는 100% 그대로 동작하면서, 개발자가 필요한 곳에서 점진적으로 Effect의 강력한 기능(의존성 주입, 타입 안전한 에러 핸들링, 리소스 관리, fiber 기반 동시성)을 opt-in할 수 있다.

현재 React에서 Effect를 사용하려면 개발자가 런타임 생성, 의존성 주입, 상태 동기화, 생명주기 관리를 모두 수동으로 처리해야 한다. 컴포넌트마다 반복되는 보일러플레이트는 Effect 도입의 가장 큰 장벽이다. effect-react는 이 간극을 메워, 개발자가 런타임을 신경 쓰지 않고 함수형 프로그래밍과 TDD를 적극 활용할 수 있는 환경을 제공한다.

핵심 원칙: **"Any valid React is valid effect-react"** — 새로운 추상화를 만들지 않고, React의 기존 패턴을 Effect-aware하게 확장한다.

---

## Core Vision

### Problem Statement

React와 Effect-TS는 근본적으로 같은 철학을 공유한다 — 둘 다 프로그램을 "실행할 수 있는 설명(description)"으로 모델링하고, 런타임이 이를 해석하여 실행한다. 하지만 두 시스템은 서로를 이해하지 못한다.

React의 핵심 프리미티브(`useState`, `useEffect`, `useContext`)는 Effect 타입을 인식하지 못한다. Effect 프로그램을 React 컴포넌트에서 실행하려면 개발자가 매번:

1. **런타임을 수동으로 생성하고 관리**해야 한다 — `ManagedRuntime.make(layer)`로 생성하고, `useRef`로 보관하며, cleanup 시 `dispose()`를 호출
2. **Effect를 직접 실행**해야 한다 — `runtime.runPromise(effect)`를 매 컴포넌트에서 호출하고, `.then()`/`.catch()`로 결과를 React 상태에 수동 동기화
3. **의존성 주입을 수동으로 연결**해야 한다 — Effect의 `Layer`/`Context` 시스템과 React의 `Context.Provider`가 별개의 시스템으로 작동
4. **생명주기를 수동으로 연결**해야 한다 — 컴포넌트 언마운트 시 fiber 인터럽션, Strict Mode 이중 마운트 처리 등

이 보일러플레이트는 Effect를 사용하는 모든 컴포넌트에서 반복되며, 개발자의 생산성을 저하하고 Effect 도입의 진입 장벽을 높인다.

### Problem Impact

- **개발자 생산성 저하**: Effect를 실행하는 매 컴포넌트마다 15-30줄의 보일러플레이트 코드가 필요
- **높은 진입 장벽**: Effect-TS의 학습 곡선에 더해, React 통합의 복잡성이 추가되어 도입을 포기하는 팀이 다수
- **테스트 어려움**: 런타임이 컴포넌트에 하드코딩되어, 비즈니스 로직을 분리하고 단위 테스트하기 어려움
- **컴포넌트 비대화**: 런타임 관리, 상태 동기화, 에러 처리 로직이 컴포넌트에 포함되어 비대해지며, 비즈니스 로직과 UI의 관심사가 혼재
- **생태계 파편화**: 공식 솔루션 부재로 각 팀이 자체 브릿지를 구현, 패턴과 품질이 일관되지 않음

### Why Existing Solutions Fall Short

| 솔루션 | 한계 |
|---|---|
| **수동 ManagedRuntime + hooks** | 매 컴포넌트마다 boilerplate 반복. 런타임 생명주기, 인터럽션, Strict Mode 처리를 개발자가 직접 구현 |
| **@effect-rx/rx-react** | React의 자연스러운 확장이 아닌, 자체 Rx/Atom 추상화 도입. 새로운 멘탈 모델(Rx.make, Rx.fn, Result 타입) 학습 필요. React 패턴과 이질적 |
| **Jotai 브릿지** | 중간 라이브러리(Jotai) 의존. Effect를 Jotai atom으로 변환하는 추가 추상화 레이어 |
| **@effect-ts/react** | 5년 전 abandoned. 현재 Effect-TS(v3+)와 호환 불가 |
| **직접 hooks 구현** | 팀마다 다른 패턴, 일관성 없음. 엣지 케이스(concurrent mode, suspense, SSR) 처리 부재 |

모든 기존 솔루션의 공통적 한계: **React를 확장하는 것이 아니라 React 위에 별개의 레이어를 추가**한다. 개발자는 React의 세계와 Effect의 세계를 수동으로 오가야 한다.

### Proposed Solution

**effect-react**는 React의 수퍼셋으로서, React의 기존 패턴을 Effect-aware하게 확장한다.

**핵심 설계 원칙:**

1. **수퍼셋 원칙**: 모든 유효한 React 코드는 유효한 effect-react 코드다. TypeScript처럼, 기존 코드를 변경 없이 사용하면서 필요한 곳에서만 Effect 기능을 추가한다.

2. **런타임 투명성**: 개발자가 런타임을 직접 생성하거나 관리하지 않는다. effect-react가 컴포넌트 트리에 따라 런타임을 자동으로 생성, 공유, 정리한다.

3. **자연스러운 확장**: 새로운 추상화를 도입하지 않고, React의 기존 패턴(`useState`, `useEffect`, `useContext` 등)을 Effect를 이해하는 버전으로 확장한다.

4. **점진적 채택**: 프로젝트의 일부에서만 Effect를 사용할 수 있다. 일반 React 컴포넌트와 Effect-aware 컴포넌트가 같은 트리에서 공존한다.

5. **테스트 우선**: 비즈니스 로직을 Effect로 분리하고, 컴포넌트는 얇은 UI 레이어로 유지. Effect의 테스트 유틸리티를 그대로 활용한 TDD가 가능하다.

**사용 예시 비전:**

```typescript
// 기존 React 코드 — 변경 없이 그대로 동작
import { useState } from 'effect-react'
function Counter() {
  const [count, setCount] = useState(0)  // 일반 React useState와 동일
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}

// Effect-aware 확장 — 필요한 곳에서 opt-in
import { useEffect, useEffectState } from 'effect-react'
function UserProfile({ userId }: { userId: string }) {
  // Effect를 직접 전달 — 런타임 관리 불필요
  // 로딩, 에러, 인터럽션이 자동 처리됨
  const user = useEffect(getUserById(userId))

  // Effect 기반 상태 — Ref/SubscriptionRef와 자동 동기화
  const [theme, setTheme] = useEffectState(getThemeEffect)

  return match(user)
    .with({ _tag: 'Loading' }, () => <Spinner />)
    .with({ _tag: 'Success' }, ({ value }) => <Profile user={value} />)
    .with({ _tag: 'Failure' }, ({ error }) => <ErrorView error={error} />)
}

// Layer 제공 — React Context와 자연스러운 통합
import { EffectProvider } from 'effect-react'
function App() {
  return (
    <EffectProvider layer={MainLayer}>
      <Counter />         {/* 일반 React — 그대로 동작 */}
      <UserProfile />     {/* Effect-aware — Layer에서 서비스 주입 */}
    </EffectProvider>
  )
}
```

### Key Differentiators

1. **수퍼셋 철학**: 유일하게 "React의 확장"으로 접근하는 솔루션. 다른 라이브러리들은 React 위에 별도 추상화를 쌓지만, effect-react는 React 자체를 확장한다.

2. **제로 새 추상화**: Rx, Atom, Store 같은 새로운 개념을 도입하지 않는다. 개발자가 이미 아는 React hooks 패턴에 Effect 능력을 더한다.

3. **런타임 투명성**: 개발자가 `ManagedRuntime`, `useRef`, `dispose()`를 다룰 필요 없다. 프레임워크가 런타임 생명주기를 완전히 관리한다.

4. **점진적 채택 경로**: 한 줄의 import 변경으로 시작할 수 있다. 기존 React 프로젝트에 위험 없이 도입 가능.

5. **FP + TDD 최적화**: 비즈니스 로직을 순수 Effect로 분리하도록 설계되어, 컴포넌트 비대화를 방지하고 단위 테스트가 용이한 아키텍처를 자연스럽게 유도한다.
