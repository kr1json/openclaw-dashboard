# OpenClaw Dashboard V2 MVP (결정 반영)

## 확정된 의사결정

1. 우선순위: **A → B → C**
   - A: 서비스 상태 신뢰성
   - B: 멀티 에이전트 가시성/관제
   - C: 카드덱 협업
2. 서비스 상태 표기: 단순화 (`Running` / `Stopped`)
3. 사이드바 기본: **확장 + 고정(pinned)**
4. 1차 범위: 조회만이 아니라 **할당/제어(중단·재시도) 포함**
5. 보드 컬럼 고정: `Backlog / In Progress / Review / Done`
   - WIP 제한 없음
6. 문서: 텍스트 입력 기본 + 첨부/링크 지원
7. 실시간성: OpenClaw 기존 지원 방식 우선(SSE/live feed)
8. KPI: 추천 기본안 채택

---

## 이번 반영 사항 (코드)

- **서비스 상태 판정 개선 (PM2 우선)**
  - Linux 환경에서 `pm2 jlist`를 먼저 확인하고,
  - 없거나 매칭 실패 시 기존 `systemd` 확인으로 폴백.
  - 상태는 기존대로 `Running/Stopped` 단순 표기 유지.

- **사이드바 고정/축소 토글 추가**
  - 기본 pinned 상태
  - 핀 토글 버튼 추가
  - 사용자 설정을 `localStorage(sidebarPinned)`에 저장

- **멀티 에이전트 메모리/키파일 가시성 확장**
  - `agents-ws/<agent>/...` 경로를 함께 스캔
  - memory/key files API에 에이전트별 항목 노출

---

## KPI 추천 기본안

### A. 상태 신뢰성
- 오탐률(False Stopped): **< 2%**
- 상태 반영 지연(p95): **< 10s**

### B. 멀티 에이전트 가시성
- 진행중 태스크 노출 커버리지: **> 95%**
- 활동 이벤트 유실률: **< 0.1%**

### C. 협업 보드 체감 성능
- 카드 이동/할당 응답(p95): **< 300ms**
- 보드 초기 로딩(p95): **< 2s**

---

## 다음 구현 TODO (남은 범위)

1. 태스크/카드 데이터 모델 + CRUD API
2. 카드↔세션/문서 링크 구조
3. 서브에이전트 중단/재시도 서버 액션 API
4. 보드 UI(고정 컬럼 DnD)
5. 문서 첨부/링크 UI + 요약 미리보기

---

## 검증 체크리스트

- `node --check server.js`
- 정적 구문 확인: `node --check index.html` (불가: HTML이므로 제외)
- 런타임 스모크: `npm start` 후 `/api/services`, `/api/memory`, `/api/key-files` 확인
