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
      {/* Deck of cards tilted left — back to front, each card offset */}
      <g transform="rotate(-15, 11, 13)">
        {/* Card 4 — back of deck */}
        <rect x="7.5" y="2" width="10" height="14" rx="1.5"
          strokeOpacity={empty ? 0.05 : 0.12} />
        {/* Card 3 */}
        <rect x="6" y="3.5" width="10" height="14" rx="1.5"
          strokeOpacity={empty ? 0.1 : 0.28} />
        {/* Card 2 */}
        <rect x="4.5" y="5" width="10" height="14" rx="1.5"
          strokeOpacity={empty ? 0.18 : 0.52} />
        {/* Card 1 — front */}
        <rect x="3" y="6.5" width="10" height="14" rx="1.5"
          strokeOpacity={empty ? 0.35 : 1} />
        {/* Art separator on front card */}
        {!empty && (
          <line x1="4.5" y1="12" x2="11.5" y2="12"
            strokeWidth="0.75" strokeOpacity="0.65" />
        )}
      </g>
    </svg>
  )
}
