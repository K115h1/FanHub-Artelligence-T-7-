// Shared domain models, mirroring database/01_schema.sql and the C# entities.
// Naming per rubric: PascalCase, no "I" prefix on types.

// ---------------------------------------------------------------------------
// API shapes
//
// These are what the services return, and they match the C# DTOs exactly.
// Ids are numbers because the database uses INT UNSIGNED — the string-id
// shapes further down are the older localStorage mock shapes, kept until the
// remaining mock consumers are migrated.
// ---------------------------------------------------------------------------

export interface Account {
  id: number
  name: string
  email: string
  avatarPath: string | null
  bio: string | null
  isVerified: boolean
  role: UserRole
  createdAt: string
}

export interface CategoryDto {
  id: number
  slug: string
  name: string
  description: string | null
  accentHex: string | null
  contentCount: number
}

export interface Genre {
  id: number
  name: string
  slug: string
}

/** The card view. A listing page never needs the long synopsis. */
export interface ContentSummary {
  id: number
  title: string
  slug: string
  contentType: string
  status: string
  categorySlug: string
  shortSynopsis: string | null
  posterPath: string | null
  releaseYear: number | null
  communityRating: number | null
  viewCount: number
  genres: string[]
}

export interface ContentDetail extends ContentSummary {
  categoryName: string
  synopsis: string | null
  releaseDate: string | null
  runtimeMinutes: number | null
  episodeCount: number | null
  language: string | null
  country: string | null
  creator: string | null
  castList: string | null
  backdropPath: string | null
  communityRatingCount: number | null
  popularityScore: number
  externalId: string | null
  externalSource: string | null
  /** Null unless the request carried a token. */
  userRating: number | null
}

export interface FanEvent {
  id: number
  title: string
  slug: string
  summary: string | null
  location: string | null
  city: string | null
  isOnline: boolean
  startsAt: string | null
  endsAt: string | null
  ticketUrl: string | null
  priceNote: string | null
  categorySlug: string
}

export interface Character {
  id: number
  name: string
  slug: string
  bio: string | null
  imagePath: string | null
  categorySlug: string
}

export interface MerchandiseItem {
  id: number
  name: string
  slug: string
  description: string | null
  imagePath: string | null
  tag: string | null
  priceNote: string | null
  isUpcoming: boolean
  categorySlug: string
}

export interface UpcomingRelease {
  id: number
  title: string
  releaseDate: string | null
  url: string | null
  categorySlug: string
}

export interface FeedbackEntry {
  id: number
  type: string
  message: string
  email: string | null
  rating: number | null
  status: string
  userName: string | null
  createdAt: string
}

export interface SubmissionEntry {
  id: number
  title: string
  body: string
  status: string
  categorySlug: string
  userName: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Local mock shapes (pre-API)
// ---------------------------------------------------------------------------

/** Mirrors the `roles` table. Visitor is implicit — it means not signed in. */
export type UserRole = 'registered' | 'admin'

/** How prominently an account appears in public lists and recommendations. */
export type ProfileVisibility = 'public' | 'followers' | 'private'

/** Mirrors `fan_submissions.status`. */
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

/** Mirrors `feedback.status`. */
export type FeedbackStatus = 'open' | 'reviewed' | 'resolved' | 'dismissed'

/** A fan submission moving through the moderation queue. */
export interface FanSubmission {
  id: string
  userId: string
  userName: string
  categorySlug: string
  title: string
  body: string
  status: SubmissionStatus
  createdAt: string
}

/** A feedback entry in the moderation queue. */
export interface FeedbackItem {
  id: string
  userId: string | null
  userName: string
  type: 'bug' | 'suggestion' | 'query' | 'content'
  message: string
  email: string
  rating: number
  status: FeedbackStatus
  createdAt: string
}

/**
 * Per-account preferences, persisted to localStorage by SettingsProvider.
 * Client-side only for now: the API has no settings endpoint to sync to.
 */
export interface UserSettings {
  /** Master switch for the home hero carousel. */
  carouselAutoplay: boolean
  /** Text scale applied to <html> as a CSS custom property. */
  fontScale: number
  /** Disables non-essential animation app-wide (SRS accessibility item). */
  reduceMotion: boolean
  /** Whether this account shows up in public follower/following lists. */
  profileVisibility: ProfileVisibility
  /** Opt in to "For You" / "Based on recent activity" personalisation. */
  personalisedRecommendations: boolean
  /** Include reading activity in anonymous site-wide stats. */
  shareActivityForAnalytics: boolean
  /** Opt in to product/demo announcements by email. */
  emailNotifications: boolean
}

/** Font scales offered in Settings, as a multiplier on the root font size. */
export const FONT_SCALES = [0.9, 1, 1.1, 1.25] as const

export const DEFAULT_SETTINGS: UserSettings = {
  carouselAutoplay: true,
  fontScale: 1,
  reduceMotion: false,
  profileVisibility: 'public',
  personalisedRecommendations: true,
  shareActivityForAnalytics: false,
  emailNotifications: true,
}

/** localStorage key for the saved settings blob. */
export const SETTINGS_STORAGE_KEY = 'fanhub-settings'
