interface DeckIconProps {
  className?: string
  empty?: boolean
}

export function DeckIcon({ className, empty = false }: DeckIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Back card */}
      <rect x="8" y="5" width="12" height="16" rx="2" strokeOpacity={empty ? '0.15' : '0.3'} />
      {/* Middle card */}
      <rect x="5.5" y="3.5" width="12" height="16" rx="2" strokeOpacity={empty ? '0.3' : '0.6'} />
      {/* Front card */}
      <rect x="3" y="2" width="12" height="16" rx="2" strokeOpacity={empty ? '0.5' : '1'} />
      {/* Art area line — only on non-empty */}
      {!empty && (
        <line x1="5.5" y1="6.5" x2="12.5" y2="6.5" strokeWidth="1" strokeOpacity="0.6" />
      )}
    </svg>
  )
}
