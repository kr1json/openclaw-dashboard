# Dashboard V2 Finalization Plan (Close-Out)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 추가 지시 없이 마감 가능한 범위를 고정하고, 해당 범위를 구현/검증/커밋까지 완료한다.

**Architecture:** server.js에 카드 제어 이력 저장/조회 API를 추가하고, index.html에 카드별 타임라인 UI를 붙여 runId 기준 제어 이력을 가시화한다. 기존 stop/retry live dispatch 로직과 연결한다.

**Tech Stack:** Node.js HTTP server, vanilla JS SPA, PM2, OpenClaw CLI

---

## Scope Freeze (이번 라운드 종료 범위)

1. 카드별 runId 제어 이력 타임라인 UI
2. 제어 이력 영속 저장 (task-board.json 내부)
3. stop/retry dispatch 결과를 이력에 append
4. 브라우저 E2E 검증(로그인 후 보드 생성/제어/타임라인 표시)
5. 회귀 검증(services/agents/memory/files/logs)
6. 최종 커밋 + 완료 보고

**Out of scope (다음 라운드):**
- 권한 모델 고도화
- 자동 재할당 로직
- 대규모 리팩터링

---

## Task 1: 데이터 모델 확장 (제어 이력)

**Files**
- Modify: `server.js`

**Steps**
1. 카드 스키마에 `control.history[]` 기본 구조 추가
2. control 액션 처리 시 아래 항목 append:
   - `id`, `ts`, `cmd`, `runId`, `sessionKey`, `errorLine`, `dispatch.ok`, `dispatch.reason`
3. 최근 N개(예: 50개)만 유지하도록 trim

**Acceptance**
- 카드 제어 1회마다 history 길이가 1 증가
- dispatch 실패/성공 모두 기록

---

## Task 2: 제어 이력 조회 API

**Files**
- Modify: `server.js`

**Steps**
1. `GET /api/task-board/cards/:id/history` 추가
2. 카드 없으면 404, 있으면 history 반환

**Acceptance**
- curl 호출 시 제어 이벤트 배열이 반환

---

## Task 3: 보드 카드별 타임라인 UI

**Files**
- Modify: `index.html`

**Steps**
1. 카드 Edit 모달에 “Control Timeline” 섹션 추가
2. 모달 오픈 시 history API 호출
3. newest-first 렌더링(시간, cmd, runId, 결과)
4. Retry/Stop 후 즉시 타임라인 리프레시

**Acceptance**
- 보드에서 retry/stop 누르면 모달 타임라인에 이벤트가 바로 추가

---

## Task 4: 통합/회귀 테스트

**Files**
- N/A

**Steps**
1. `node --check server.js`
2. PM2 재시작
3. API 스모크:
   - `/api/services`
   - `/api/agents-overview`
   - `/api/task-activity`
   - `/api/memory-files`
   - `/api/key-files`
   - `/api/logs?service=agent-dashboard`
4. 브라우저 E2E(jskim-desk node):
   - 로그인
   - 카드 생성
   - stop/retry 수행
   - 모달 타임라인에서 기록 확인

**Acceptance**
- 모든 API 200
- 브라우저에서 타임라인 가시 확인

---

## Task 5: 마감

**Files**
- Modify: `docs/plans/2026-02-18-dashboard-v2-finalization-plan.md` (체크리스트 완료표시)

**Steps**
1. 변경사항 커밋
2. 최종 보고에 아래 포함:
   - 구현 범위 vs 계획 범위
   - 테스트 증빙
   - 남은 리스크(있다면)

**Done Definition**
- 본 문서 Scope Freeze 1~6 모두 완료
- 커밋 후 PM2 online
- 사용자 확인 없이도 “이번 라운드 완료” 상태 명확

---

## Close-Out Checklist (2026-02-18)

- [x] 1) 카드별 runId 제어 이력 타임라인 UI
- [x] 2) 제어 이력 영속 저장 (task-board.json 내부)
- [x] 3) stop/retry dispatch 결과 이력 append
- [x] 4) 브라우저 E2E 검증 (로그인 → 보드 제어 → 타임라인 확인)
- [x] 5) 회귀 검증 (services/agents/memory/files/logs + agents detail UX)
- [x] 6) 최종 커밋/완료 보고 준비

### Verification Notes
- `node --check server.js` 통과
- PM2 재기동 후 `openclaw-dashboard` online 확인
- `task-board.json`에서 `control.history[]` append 확인
- 브라우저 E2E에서 Board 모달 타임라인 렌더링 및 Agents 클릭 상세 패널 확인
