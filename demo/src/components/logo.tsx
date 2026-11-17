export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-blue-700 text-white">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="3" fill="currentColor" />
          <circle cx="16" cy="8" r="3" fill="#fb923c" />
          <path d="M3 19c0-3 2.5-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M11 19c0-3 2.5-5 5-5s5 2 5 5" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-lg font-extrabold tracking-tight text-blue-800">
        Tutor<span className="text-orange-500">Par</span>
      </span>
    </span>
  );
}
