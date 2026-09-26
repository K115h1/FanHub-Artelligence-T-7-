// Shared domain models.
//
// These mirror the MySQL tables 1:1 (see database/01_schema.sql) and the C#
// entities in FanHubPlus.Domain — one contract across all three tiers.
//
// Naming per rubric: interfaces/types are PascalCase with NO "I" prefix.
//
// NOTE: this file previously held only comments while the real shapes lived
// next to the data that used them. `UserSettings` is the first type to move
// here, because it is now shared by the provider, the context and the UI.

// ---------- User (device-local, until the API lands) ----------

/** How prominently an account appears in public lists and recommendations. */
export type ProfileVisibility = 'public' | 'followers' | 'private'

/**
 * Per-account preferences. Persisted to localStorage by SettingsProvider.
 *
 * These are deliberately client-side only for now: the API has no settings
 * endpoint, so there is nowhere to sync them to. When `settings.service.ts`
 * exists, only the provider's load/save functions change.
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
  /** Include this account's reading activity in anonymous site-wide stats. */
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
