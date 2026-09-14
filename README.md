# mj-tracker (리치 점봉판)

리치 마작 점수 계산/기록 앱. 4인 좌석을 원형(pinwheel) 레이아웃으로 배치하고, 론/쯔모/유국 처리, 리치봉·본장 관리, 점수 그래프를 지원합니다.

앱 코드는 [`beta/`](beta/) 에 있습니다 (Next.js + React + Tailwind CSS). 자세한 구조는
[`beta/README.md`](beta/README.md) 참고.

- 배포: https://play.machete.club (Cloudflare Workers, OpenNext) — `beta.play.machete.club` 도 같은 배포를 가리킵니다.
- 로컬 실행: `cd beta && npm install && npm run dev`
- 배포 명령: `cd beta && npm run deploy`
- 테스트: `cd beta && npm test` (Vitest, `lib/mahjong/` 순수 로직) / `npm run test:scenarios` (통합 시나리오 114개)

원래 있던 순수 HTML/CSS/JS 단일 파일 버전(알파)은 위 재작성 버전으로 완전히 대체되어
제거했습니다 — 이전 버전이 필요하면 git 히스토리(`44cc819` 이전 커밋)에서 볼 수 있습니다.
