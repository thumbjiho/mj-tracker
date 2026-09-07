import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "리치 점봉판",
  description: "리치 마작 점수 계산기",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      {/*
        next/font/google can't self-host these three families for Korean text —
        their Google Fonts metadata only exposes latin/latin-ext subsets, so a
        next/font build would silently drop the Korean glyphs. Loading the
        actual Google Fonts CSS keeps Korean rendering correct everywhere.
      */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router root layout is the correct place for a global stylesheet link */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600&family=Rajdhani:wght@600;700&family=Noto+Serif+KR:wght@700&display=swap"
        precedence="default"
      />
      {/* sizing/background/overflow for html+body come from the ported .board app's global CSS (html,body{...} in globals.css), not Tailwind, to match the alpha exactly */}
      <body>{children}</body>
    </html>
  );
}
