/**
 * La marca de DojoManager: el nudo de una cinta. El amarillo va literal para
 * que la vista oscura, que invierte la escala de colores, no lo cambie.
 */
function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <rect width="40" height="40" rx="12" fill="var(--color-violet-600)" />
      <path
        d="M6 17.5h28v5H6z"
        fill="oklch(87.9% 0.169 91.605)"
      />
      <path
        d="m17 23-5 9h4.6l3.4-6 3.4 6H28l-5-9z"
        fill="oklch(87.9% 0.169 91.605)"
      />
      <rect
        x="15"
        y="14"
        width="10"
        height="12"
        rx="3"
        fill="oklch(92.4% 0.12 95.746)"
        stroke="var(--color-violet-600)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default BrandMark;
