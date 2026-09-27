// Shared domain models, mirroring database/01_schema.sql and the C# entities.
// Naming per rubric: PascalCase, no "I" prefix on types.

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
