// Ratings, per-account star ratings for content and articles.
//
// Stored locally as `kind:refId → 1. 5`, so the detail page can write a rating
// and every card showing that item can display it. A real average across users
// arrives with the API; until then this is one person's score.
import { createContext, useContext } from 'react'

export type RatingKind = 'content' | 'article'

export interface RatingsContextValue {
  /** 0 when the member hasn't rated this yet. */
  get: (kind: RatingKind, refId: number) => number
  /** Passing the same value again clears the rating, so a misclick is undoable. */
  set: (kind: RatingKind, refId: number, value: number) => void
  ratedCount: number
}

export const RatingsContext = createContext<RatingsContextValue>({
  get: () => 0,
  set: () => {},
  ratedCount: 0,
})

export const useRatings = () => useContext(RatingsContext)
