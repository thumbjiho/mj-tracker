# mj-tracker (리치 점봉판)

리치 마작 점수 계산/기록 앱. 4인 좌석을 원형(pinwheel) 레이아웃으로 배치하고, 론/쯔모/유국 처리, 리치봉·본장 관리, 점수 그래프를 지원합니다.

## 현재 상태 (Alpha)

단일 파일(`index.html`)로 작성된 순수 HTML/CSS/JS 앱입니다. 별도 빌드 과정 없이 정적으로 서빙됩니다.

## 로컬 실행

```bash
open index.html
# 또는
npx serve .
```

## 배포

Cloudflare Pages에 정적 사이트로 배포됩니다.

```bash
npx wrangler pages deploy . --project-name=mj-tracker
```

## 로드맵

베타 버전에서는 Next.js + React + Tailwind CSS 기반으로 재작성하여 컴포넌트/디자인 시스템을 도입하고, Cloudflare Workers(OpenNext)로 배포할 예정입니다.
