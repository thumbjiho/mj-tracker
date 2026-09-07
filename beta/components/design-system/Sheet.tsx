"use client";

import type { ReactNode } from "react";
import { AppButton } from "./Button";

interface SheetProps {
  title: string;
  onClose?: () => void;
  onBack?: () => void;
  steps?: { n: number; i: number };
  question?: ReactNode;
  footer?: ReactNode;
  small?: boolean;
  children: ReactNode;
}

/** Shared modal shell for every wizard/menu/dialog in the app. */
export function Sheet({ title, onClose, onBack, steps, question, footer, small, children }: SheetProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(6,10,9,0.8)] p-4">
      <div
        className={`flex max-h-full w-full flex-col rounded-[20px] border border-line-2 bg-panel shadow-2xl ${
          small ? "max-w-[420px]" : "max-w-[600px]"
        }`}
      >
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="뒤로"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-panel-2 text-xl text-ink-2"
            >
              ‹
            </button>
          ) : onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-panel-2 text-xl text-ink-2"
            >
              ×
            </button>
          ) : (
            <span className="w-10 shrink-0" />
          )}
          <div className="flex-1 text-lg font-semibold">{title}</div>
          {steps && (
            <div className="flex shrink-0 gap-1.5">
              {Array.from({ length: steps.n }, (_, k) => (
                <span key={k} className={`h-1.5 w-1.5 rounded-full ${k < steps.i ? "bg-amber" : "bg-line-2"}`} />
              ))}
            </div>
          )}
        </div>
        {question && <div className="px-4 pb-3 text-sm text-ink-2">{question}</div>}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex flex-col gap-2.5">{children}</div>
        </div>
        {footer && <div className="flex gap-2 px-4 pb-4">{footer}</div>}
      </div>
    </div>
  );
}

export function WizardNav({
  onPrev,
  prevDisabled,
  onNext,
  nextDisabled,
  nextLabel = "다음",
}: {
  onPrev: () => void;
  prevDisabled?: boolean;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <button
        type="button"
        onClick={onPrev}
        disabled={prevDisabled}
        aria-label="이전"
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line-2 bg-panel-2 text-2xl text-ink disabled:opacity-30"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="flex-[1.4] rounded-2xl bg-amber py-4 text-lg font-semibold text-[#1a1408] disabled:opacity-40"
      >
        {nextLabel}
      </button>
    </div>
  );
}

export function ConfirmDialog({
  title,
  text,
  okLabel,
  danger,
  onOk,
  onCancel,
}: {
  title: string;
  text: string;
  okLabel: string;
  danger?: boolean;
  onOk: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet
      title={title}
      small
      footer={
        <>
          <AppButton variant="ghost" className="flex-1" onClick={onCancel}>
            취소
          </AppButton>
          <AppButton variant={danger ? "warn" : "primary"} className="flex-1" onClick={onOk}>
            {okLabel}
          </AppButton>
        </>
      }
    >
      <p className="py-1 text-base leading-relaxed text-ink-2">{text}</p>
    </Sheet>
  );
}
