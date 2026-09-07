"use client";

import { Full } from "./Full";

/**
 * Ports confirmDlg(). Note: the alpha's "danger" OK button uses a `danger`
 * class that has no matching CSS rule (only `.primary.warn` and
 * `.ghost.danger` exist) — so a "dangerous" confirm button renders as a
 * normal amber primary button in the source too. Kept as-is on purpose.
 */
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
    <Full
      title={title}
      dialog
      small
      noClose
      footer={
        <>
          <button type="button" className="ghost" onClick={onCancel}>
            취소
          </button>
          <button type="button" className={`primary ${danger ? "danger" : ""}`} onClick={onOk}>
            {okLabel}
          </button>
        </>
      }
    >
      <div className="dlg-text">{text}</div>
    </Full>
  );
}
