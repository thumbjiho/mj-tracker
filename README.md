# mj-tracker (리치 점봉판)

리치 마작 점수 계산/기록 앱. 4인 좌석을 원형(pinwheel) 레이아웃으로 배치하고, 론/쯔모/유국 처리, 리치봉·본장 관리, 점수 그래프를 지원합니다.

## 알파 (`/public`, 저장소 루트)

단일 파일(`public/index.html`)로 작성된 순수 HTML/CSS/JS 앱. 별도 빌드 없이 정적으로 서빙됩니다.

- 배포: https://play.machete.club (Cloudflare Workers, 정적 자산)
- 로컬 실행: `open public/index.html` 또는 `npx serve public`
- 배포 명령: `npx wrangler deploy` (저장소 루트 `wrangler.jsonc` 사용)

## 베타 (`/beta`)

Next.js + React + Tailwind CSS로 재작성한 버전. 자세한 구조는 [`beta/README.md`](beta/README.md) 참고.

- 배포: https://beta.play.machete.club (Cloudflare Workers, OpenNext)
- 로컬 실행: `cd beta && npm install && npm run dev`
- 배포 명령: `cd beta && npm run deploy`

두 버전은 서로 다른 Worker·저장소 키를 쓰므로 데이터가 섞이지 않습니다. 베타가
충분히 검증되면 `play.machete.club` 라우트를 베타 쪽으로 옮길 예정입니다.
