# mj-tracker (베타)

리치 마작 점수 계산기. 기존 단일 HTML 파일(알파, `../public/index.html`)을
Next.js + React + Tailwind CSS로 재작성한 버전입니다. 컴포넌트/타입을 갖춰
앞으로 기능을 추가하거나 고치기 쉽게 만들면서, 알파와 픽셀 단위로 동일하게
동작하도록 검증했습니다 (Playwright로 두 버전을 나란히 띄워 스크린샷·동작 비교).

## 아키텍처

- `lib/mahjong/` — 점수 계산 로직(론/쯔모/유국/정산). React와 무관한 순수 함수라
  UI 없이도 테스트 가능합니다.
- `state/game-context.tsx` — 게임 상태(`GameProvider`/`useGame()`). 마법사 진행
  중인 임시 입력값은 각 컴포넌트 로컬 상태로 두고, 확정된 것만 여기로 커밋됩니다.
- `app/globals.css` — 알파의 CSS를 거의 그대로 옮겨 왔습니다. 같은 클래스 이름,
  같은 `clamp()`/`cqw`/컨테이너 쿼리 수식을 그대로 씁니다. 컴포넌트는 Tailwind
  유틸리티 대신 이 클래스들을 그대로 렌더링합니다 — 픽셀 차이 없이 맞추는 가장
  확실한 방법이기 때문입니다. Tailwind 자체는 계속 사용 가능하지만, 이식된
  화면에는 의도적으로 쓰지 않습니다.
- `components/chrome/` — `Full`(원본 `full()` 함수를 그대로 포팅한 시트/다이얼로그
  셸), `ConfirmDialog`, `Toast`, `useEscapeKey` 등 화면 전반에서 공유하는 조각.
- `components/board/` — 핀휠 좌석 배치, 중앙 화료 휠, 독 모드(`Dock`), POV 회전
  오버레이(`Layer`), 드래그로 즉시 화료 배정하는 제스처(`useWinDrag`), 좌석
  탭/길게 누르기(`useSeatPress`).
- `components/setup/` — 새 게임 · 이어서 화면, 좌석 순서 드래그 재정렬
  (`useRowDrag`, 설정 화면과 공유), 점수 자동 배분(`useManualScores`).
- `components/{win-wizard,draw,menu,settings,settle,log}/` — 화면별 시트.
- `lib/storage.ts` — localStorage 저장/불러오기 (`mj-tracker-beta-v1` 키, 알파와
  분리되어 있어 서로 데이터를 공유하지 않습니다).

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
