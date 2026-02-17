# Dashboard V2 Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 서비스 상태 오탐, 멀티 에이전트 통합 뷰 부재, 진행중 태스크/서브에이전트 가시화 부족, 보드 UX 미흡 문제를 해결한다.

**Architecture:** 서버에서 agent/session/task 집계 API를 추가하고, 프론트에서 Agents 통합 페이지 + 개선된 Board 편집 모달/에이전트 선택 UI를 제공한다. 서비스 상태는 PM2/systemd/OpenClaw 상태 JSON을 조합해 표시 정확도를 높인다.

**Tech Stack:** Node.js HTTP server, vanilla JS SPA, PM2, OpenClaw CLI(status --json), SSE/live feed

---

### Task 1: 서비스 상태 판정 개선
- Modify: `server.js` (`getServicesStatus`)
- Add: PM2 alias 매핑 + openclaw status --json 기반 보강
- Test:
  - `node --check server.js`
  - API 확인: `/api/services`

### Task 2: 멀티 에이전트 통합 집계 API
- Modify: `server.js`
- Add endpoints:
  - `GET /api/agents-overview`
  - `GET /api/task-activity`
- Test:
  - curl로 JSON 구조 확인

### Task 3: Agents 통합 페이지 UI
- Modify: `index.html`
- Add nav/page:
  - Agents 페이지
  - 에이전트별 세션/활성/비용/최근활동 표시
  - 진행중 태스크/서브에이전트 활동 리스트
- Test:
  - 브라우저에서 Agents 페이지 렌더링 확인

### Task 4: Task Board UX 개선
- Modify: `index.html`
- Changes:
  - 에이전트 선택 dropdown(집계 API 기반)
  - 텍스트 입력폼 확장
  - 카드 클릭 시 수정 모달 표시(제목/담당/상태/노트/링크/첨부/sessionKey/runId)
- Test:
  - 카드 생성/수정/상태이동/재시도 동작 확인

### Task 5: E2E 검증 + 커밋
- Test commands:
  - `node --check server.js`
  - `pm2 restart openclaw-dashboard`
  - 브라우저 테스트(jskim-desk node):
    - 로그인 후 Overview 서비스 상태 확인
    - Agents 페이지 확인
    - Board 생성/편집/이동/제어 확인
- Commit changes with clear message
