"use client";

import { useEffect } from "react";

/**
 * App Router error boundary for everything under this layout (i.e. the whole
 * game UI, since it all lives under app/page.tsx). Without this, an
 * unexpected render error leaves the visitor staring at a blank screen with
 * no way back in. Game state is saved to localStorage on every change (see
 * state/game-context.tsx), so "다시 시도" is safe — it just re-mounts and
 * reloads whatever was last saved.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="dim" style={{ position: "fixed" }}>
      <div className="full dlg sm">
        <div className="f-head center">
          <div className="f-title">문제가 발생했습니다</div>
        </div>
        <div className="f-body">
          <div className="dlg-text">
            예상치 못한 오류가 발생했습니다. 점수 기록은 계속 저장되어 있으니 다시 시도해도 안전합니다.
          </div>
        </div>
        <div className="f-foot">
          <button type="button" className="primary" onClick={reset}>
            다시 시도
          </button>
        </div>
      </div>
    </div>
  );
}
