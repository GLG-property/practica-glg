"use client";

import { useState, useEffect } from "react";

/** Tastatură numerică mare pentru introducerea PIN-ului. */
export function PinKeypad({
  length,
  onComplete,
  busy,
  error,
  labels,
}: {
  length: number;
  onComplete: (pin: string) => void;
  busy?: boolean;
  error?: string | null;
  labels: { clear: string; enter: string };
}) {
  const [pin, setPin] = useState("");

  // Golim PIN-ul dacă apare o eroare (încercare greșită).
  useEffect(() => {
    if (error) setPin("");
  }, [error]);

  function press(digit: string) {
    if (busy) return;
    setPin((p) => (p.length >= length ? p : p + digit));
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  function clearAll() {
    setPin("");
  }

  function submit() {
    if (pin.length === length && !busy) onComplete(pin);
  }

  // Auto-submit când s-a completat PIN-ul.
  useEffect(() => {
    if (pin.length === length) {
      const t = setTimeout(() => onComplete(pin), 150);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, length]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Indicatori PIN (puncte) */}
      <div className="flex gap-2.5 my-3" aria-hidden>
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={`w-3 h-3 rounded-full border-2 ${
              i < pin.length ? "bg-brand border-brand" : "border-slate-300"
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-status-noshow text-sm font-semibold text-center mb-2" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 w-full max-w-[260px]">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
          <KeyButton key={n} onClick={() => press(n)} disabled={busy}>
            {n}
          </KeyButton>
        ))}
        <KeyButton onClick={clearAll} disabled={busy} variant="ghost">
          {labels.clear}
        </KeyButton>
        <KeyButton onClick={() => press("0")} disabled={busy}>
          0
        </KeyButton>
        <KeyButton onClick={backspace} disabled={busy} variant="ghost">
          ⌫
        </KeyButton>
      </div>

      <button
        onClick={submit}
        disabled={pin.length !== length || busy}
        className="btn-primary w-full max-w-[260px] mt-3 disabled:opacity-40"
      >
        {busy ? "…" : labels.enter}
      </button>
    </div>
  );
}

function KeyButton({
  children,
  onClick,
  disabled,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "ghost";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-14 rounded-xl font-bold transition active:scale-95 ${
        variant === "ghost"
          ? "bg-slate-100 text-slate-600 text-sm"
          : "bg-white border border-slate-200 text-slate-900 text-xl hover:border-brand"
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}
