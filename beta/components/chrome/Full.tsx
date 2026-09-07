"use client";

import type { ReactNode } from "react";

interface NavConfig {
  onPrev: () => void;
  prevDisabled?: boolean;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  middle?: ReactNode;
}

interface FullProps {
  title: string;
  small?: boolean;
  dialog?: boolean;
  center?: boolean;
  noClose?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  q?: ReactNode;
  steps?: { n: number; i: number };
  nav?: NavConfig;
  footer?: ReactNode;
  footCol?: boolean;
  children: ReactNode;
}

function Dots({ n, i, out }: { n: number; i: number; out?: boolean }) {
  return (
    <div className={`steps${out ? " out" : ""}`}>
      {Array.from({ length: n }, (_, k) => (
        <i key={k} className={k < i ? "on" : ""} />
      ))}
    </div>
  );
}

/** Ports full() from the alpha's script almost line-for-line (see the DOM it built there). */
export function Full({
  title,
  small,
  dialog,
  center,
  noClose,
  onBack,
  onClose,
  q,
  steps,
  nav,
  footer,
  footCol,
  children,
}: FullProps) {
  const head = center ? (
    <div className="f-head center">
      {!noClose && (
        <button type="button" className="xbtn" onClick={onClose} aria-label="닫기">
          ×
        </button>
      )}
      <div className="f-title">{title}</div>
    </div>
  ) : (
    <div className="f-head">
      {!noClose && (
        <button type="button" className="back" onClick={onBack ?? onClose} aria-label="뒤로">
          {onBack ? "‹" : "×"}
        </button>
      )}
      <div className="f-title">{title}</div>
    </div>
  );

  let footHtml: ReactNode = null;
  if (nav) {
    footHtml = (
      <div className="f-foot nav">
        <button type="button" className="nb" onClick={nav.onPrev} disabled={nav.prevDisabled} aria-label="이전">
          ‹
        </button>
        {nav.middle && <div className="navmid">{nav.middle}</div>}
        <button type="button" className="primary nav-next" onClick={nav.onNext} disabled={nav.nextDisabled}>
          {nav.nextLabel ?? "다음"}
        </button>
      </div>
    );
  } else if (footer) {
    footHtml = <div className={`f-foot ${footCol ? "col" : ""}`}>{footer}</div>;
  }

  const inner = (
    <div className={`full ${dialog ? "dlg" : ""} ${small ? "sm" : ""}`}>
      {head}
      {q != null && <div className={`f-q ${center ? "center" : ""}`}>{q}</div>}
      <div className="f-body">{children}</div>
      {footHtml}
    </div>
  );

  if (dialog) {
    return (
      <div className="dim">
        {inner}
        {steps && <Dots n={steps.n} i={steps.i} out />}
      </div>
    );
  }
  return inner;
}
