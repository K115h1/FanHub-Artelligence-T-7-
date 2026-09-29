// RatingDisplay, read-only stars for a card.
//
// Shows nothing until the member has rated the item, so cards don't all carry a
// misleading "0 stars". The interactive version lives on the detail page.
import { Star } from 'lucide-react'
import { useRatings, type RatingKind } from '../../context/RatingsContext'

export default function RatingDisplay({ kind, refId }: { kind: RatingKind; refId: number }) {
  const { get } = useRatings()
  const rating = get(kind, refId)

  if (rating === 0) return null

  return (
    <span className="inline-flex items-center gap-0.5" title={`Your rating: ${rating} of 5`}>
      <Star size={12} className="text-accent" fill="currentColor" aria-hidden="true" />
      <span className="text-ink-muted">{rating}</span>
      <span className="sr-only">out of 5 — your rating</span>
    </span>
  )
}
