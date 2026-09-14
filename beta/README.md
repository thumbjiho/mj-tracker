# mj-tracker

리치 마작 점수 계산기. 원래 단일 HTML 파일(알파)로 시작했던 것을 Next.js +
React + Tailwind CSS로 재작성했습니다. 재작성 직후에는 알파와 픽셀 단위로
동일하게 동작하도록 검증했고 (Playwright로 두 버전을 나란히 띄워 스크린샷·동작
비교), 검증이 끝난 뒤 알파를 완전히 대체하며 제거했습니다 — 원래 알파 소스는 git
히스토리(`44cc819` 이전)에 남아 있습니다.

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

## 알파와 달라졌던 동작 (재작성 시점 기준)

- **화면 방향 고정** — 좌석 0이 항상 아래(bottom). 親이 아래로 오도록 매 국 회전하지
  않습니다 (아이패드를 탁자에 두고 쓸 때 방향이 바뀌는 문제). 親은 좌석 강조와 바람
  글자로만 표시합니다.
- **리치 취소는 기록에서 지움** — "리치 취소" 항목을 추가하는 대신 해당 "리치" 항목을
  로그에서 제거하고 점수·공탁만 원복합니다.
- **화료 드래그** — 가운데 = 쯔모, 다른 좌석 = 그 사람 방총 론, 본인 좌석 = 취소.
  단계별 입력은 화료 버튼을 짧게 탭해서 들어갑니다.
- **점수 입력 "역 일람" 탭** — 역을 체크하면 판수가 합산되고(멘젠/후로 쿠이사가리 반영),
  도라 스테퍼·부수 선택으로 점수를 자동 계산합니다. 기록에 역 이름이 함께 남습니다.
- **유국 다이얼로그** — "유국 | 쵼보" 세그먼트. 유국은 도중 유국 토글(켜면 텐파이 선택
  숨김), 쵼보는 누가 했는지 + 지불 방식(각 3000 / 親 4000·子 2000, 親이 쵼보면 각
  3000). 쵼보는 본장·親·국을 유지하고 이 국의 리치봉을 돌려줍니다.
- **가운데 20초 타이머** — 판 가운데 원판을 길게 누르면 빨간 부채꼴 타이머가 돌고, 다시
  길게 누르면 꺼집니다. 짧은 탭은 그대로 유국/메뉴 버튼으로 갑니다.
- **리치 BGM** — `public/bgm/riichi-1.mp3`, `riichi-2.mp3` 를 리치 선언마다 번갈아
  반복 재생합니다. 리치가 모두 취소되거나 국이 끝나면 멈춥니다 (`lib/bgm.ts`).
- 리치 버튼은 점봉 그림 없이 글자만. 이름이 "리지"인 사람의 리치는 "리지"로 표시됩니다.
- 점수보기(POV): 리치 버튼 탭이 POV를 열던 문제, 터치에서 열자마자 닫히던 문제, 길게
  누른 뒤 떼도 닫히지 않던 문제를 고쳤습니다 (`useSeatPress`, `PovOverlay`). 길게 누름
  기준은 200ms.

## 테스트

```bash
npm run test:scenarios   # tests/scenarios.ts → tests/SCENARIO_REPORT.md
```

반장/동풍전 시나리오 110여 개(수작업 + 시드 고정 랜덤)를 규칙만으로 다시 쓴 oracle 과
비교합니다. 점수·리치 상태·본장·공탁·국·종료·기록 개수·점수 보존을 매 이벤트마다
확인합니다.

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

`wrangler.jsonc`에서 `play.machete.club`과 `beta.play.machete.club` 두 커스텀
도메인 모두 이 Worker(`mj-tracker-beta`)로 라우팅됩니다 — 알파를 대체한 뒤로
이 배포가 곧 프로덕션입니다.
