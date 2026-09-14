"use client";

/**
 * Catches errors in the root layout itself (app/error.tsx can't — it only
 * covers what the layout renders). This has to render its own <html>/<body>
 * since it fully replaces the layout, so it intentionally doesn't depend on
 * globals.css or any other component.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F1513",
          color: "#ECE6D6",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ marginBottom: 16 }}>문제가 발생했습니다.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "12px 24px",
              borderRadius: 14,
              background: "#F5B342",
              color: "#1a1408",
              fontWeight: 600,
              border: "1px solid #F5B342",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
