/** La marca de DojoManager: el nudo de una cinta. */
function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <rect width="40" height="40" rx="12" fill="var(--color-violet-600)" />
      <path
        d="M6 17.5h28v5H6z"
        fill="var(--color-amber-300)"
      />
      <path
        d="m17 23-5 9h4.6l3.4-6 3.4 6H28l-5-9z"
        fill="var(--color-amber-300)"
      />
      <rect
        x="15"
        y="14"
        width="10"
        height="12"
        rx="3"
        fill="var(--color-amber-200)"
        stroke="var(--color-violet-600)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default BrandMark;
