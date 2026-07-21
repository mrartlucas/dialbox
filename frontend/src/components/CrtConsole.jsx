import React, { useEffect, useRef } from "react";

const ROLE_STYLES = {
  system: "text-neutral-500",
  line: "crt-glow",
  program: "amber-glow",
  caller: "text-cyan-300",
  error: "text-red-400",
};

export default function CrtConsole({ lines, statusLabel }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    // Scroll ONLY the console's own container — never the page (scrollIntoView
    // would drag the whole window down to the monitor on every new line).
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div
      className="scanlines relative flex h-full flex-col overflow-hidden rounded-sm border-2 border-neutral-800 bg-black"
      data-testid="crt-console"
    >
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
          Line Monitor
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] crt-glow">
          {statusLabel}
        </span>
      </div>
      <div ref={scrollRef} className="hide-scrollbar flex-1 space-y-2 overflow-y-auto p-4 font-mono text-sm leading-relaxed flicker">
        {lines.length === 0 && (
          <p className="text-neutral-600">// handset on hook — lift to open the line</p>
        )}
        {lines.map((l, i) => (
          <p key={i} className={ROLE_STYLES[l.role] || "text-neutral-400"} data-testid={`console-line-${i}`}>
            {l.role === "caller" ? "> " : ""}
            {l.text}
          </p>
        ))}
      </div>
    </div>
  );
}
