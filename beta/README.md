# mj-tracker (베타)

리치 마작 점수 계산기. 기존 단일 HTML 파일(알파, `../public/index.html`)을
Next.js + React + Tailwind CSS로 재작성한 버전입니다. 컴포넌트/디자인 시스템/
타입을 갖춰 앞으로 기능을 추가하거나 고치기 쉽게 만드는 것이 목표입니다.

## 아키텍처

- `lib/mahjong/` — 점수 계산 로직(론/쯔모/유국/정산). React와 무관한 순수 함수라
  UI 없이도 테스트 가능합니다.
- `state/game-context.tsx` — 게임 상태(`GameProvider`/`useGame()`). 마법사 진행
  중인 임시 입력값은 각 컴포넌트 로컬 상태로 두고, 확정된 것만 여기로 커밋됩니다.
- `components/design-system/` — 버튼·칩·시트 등 공통 UI 프리미티브.
- `components/board/` — 핀휠 좌석 배치(`board.module.css`에만 있는 CSS
  기하학 — 이 부분만 Tailwind 대신 전용 CSS를 씁니다), 좌석 카드, 중앙 패널.
- `components/{win-wizard,draw,menu,setup,settings,settle,log}/` — 화면별 시트.
- `lib/storage.ts` — localStorage 저장/불러오기 (`mj-tracker-beta-v1` 키, 알파와
  분리되어 있어 서로 데이터를 공유하지 않습니다).

## 1차 베타 범위

핵심 플레이 플로우(좌석판, 리치, 론/쯔모/더블·트리플론, 유국, 설정, 새 게임/이어
하기, 순위·정산, 기록·그래프)는 모두 동작합니다. 원본에 있던 아래 제스처는
의도적으로 다음 단계로 미뤘습니다:

- 드래그로 즉시 화료 배정(pointer drag wheel) — 지금은 탭으로 마법사를 엽니다.
- 좌석 길게 눌러 유지하기(POV) — 지금은 탭으로 열고 닫습니다.
- 그래프 이미지 저장/공유.
- 새 게임 시작 시 좌석 드래그 재정렬 — 설정 화면에서는 ▲▼ 버튼으로 가능합니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## 배포 (Cloudflare Workers + OpenNext)

```bash
npm run deploy   # opennextjs-cloudflare build && opennextjs-cloudflare deploy
npm run preview  # 배포 전 Workers 런타임에서 미리보기
```

`wrangler.jsonc`에서 `beta.play.machete.club` 커스텀 도메인으로 라우팅됩니다.
