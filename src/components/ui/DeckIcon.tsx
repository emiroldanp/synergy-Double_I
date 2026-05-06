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
      <g transform="rotate(-12, 12, 12)">
        {/* Back card */}
        <rect x="8" y="3" width="11" height="15" rx="1.5" strokeOpacity={empty ? '0.08' : '0.2'} />
        {/* Card 3 */}
        <rect x="6" y="5" width="11" height="15" rx="1.5" strokeOpacity={empty ? '0.15' : '0.4'} />
        {/* Card 2 */}
        <rect x="4" y="7" width="11" height="15" rx="1.5" strokeOpacity={empty ? '0.25' : '0.65'} />
        {/* Front card */}
        <rect x="2" y="9" width="11" height="15" rx="1.5" strokeOpacity={empty ? '0.45' : '1'} />
        {/* Art/text separator at 1/3 height */}
        {!empty && (
          <line x1="4" y1="14" x2="11" y2="14" strokeWidth="1" strokeOpacity="0.7" />
        )}
      </g>
    </svg>
  )
}
