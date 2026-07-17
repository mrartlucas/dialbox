import React from "react";

const KEYS = [
  ["1", ""],
  ["2", "ABC"],
  ["3", "DEF"],
  ["4", "GHI"],
  ["5", "JKL"],
  ["6", "MNO"],
  ["7", "PQRS"],
  ["8", "TUV"],
  ["9", "WXYZ"],
  ["*", ""],
  ["0", "OPER"],
  ["#", ""],
];

export default function Keypad({ onPress, disabled }) {
  return (
    <div className="grid grid-cols-3 gap-3" data-testid="phone-keypad">
      {KEYS.map(([digit, letters]) => (
        <button
          key={digit}
          disabled={disabled}
          data-testid={`keypad-button-${digit === "*" ? "star" : digit === "#" ? "hash" : digit}`}
          onClick={() => onPress(digit)}
          className={`tactile group relative flex h-16 flex-col items-center justify-center rounded-sm border-2 border-neutral-700 bg-gradient-to-b from-neutral-200 to-neutral-400 font-mono text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed hover:from-neutral-100 hover:to-neutral-300`}
        >
          <span className="text-2xl font-bold leading-none">{digit}</span>
          {letters && (
            <span className="mt-0.5 text-[9px] tracking-[0.15em] text-neutral-600">{letters}</span>
          )}
        </button>
      ))}
    </div>
  );
}
