// Mock data — local fixtures for the homepage + dashboard.
// Stands in for the C# API until the backend is connected; swapping to real
// data later means replacing these arrays with service calls (see src/services).
import type { LucideIcon } from 'lucide-react'
import {
  Gamepad2,
  Tv,
  Clapperboard,
  Music,
  BookOpen,
  Ghost,
  Sparkles,
  Drama,
} from 'lucide-react'

// ---------- Categories (the 8 SRS categories) ----------

export interface Category {
  slug: string
  name: string
  icon: LucideIcon
}

export const CATEGORIES: Category[] = [
  { slug: 'anime', name: 'Anime', icon: Drama },
  { slug: 'gaming', name: 'Gaming', icon: Gamepad2 },
  { slug: 'movies', name: 'Movies', icon: Clapperboard },
  { slug: 'tv-shows', name: 'TV Shows', icon: Tv },
  { slug: 'k-pop', name: 'K-Pop', icon: Music },
  { slug: 'comics', name: 'Comics', icon: BookOpen },
  { slug: 'manga', name: 'Manga', icon: Ghost },
  { slug: 'cosplay', name: 'Cosplay', icon: Sparkles },
]

// ---------- Hero carousel ----------

export interface Slide {
  id: number
  kicker: string // small text above the headline
  title: string
  blurb: string
}

export const SLIDES: Slide[] = [
  {
    id: 1,
    kicker: 'Welcome to',
    title: 'Fan Hub Plus',
    blurb: 'Your all-in-one destination for Anime, Gaming, Movies, TV Shows, K-Pop, Comics, Manga and Cosplay!',
  },
  {
    id: 2,
    kicker: 'Explore',
    title: 'Every Fandom, One Home',
    blurb: 'Browse characters, articles, events and community picks — all in one glassy place.',
  },
  {
    id: 3,
    kicker: 'Community',
    title: 'Share What You Love',
    blurb: 'Rate content, build bookmarks, join fan events and submit your own creations.',
  },
]

// ---------- Content cards (Featured Content / Popular) ----------

export interface ContentItem {
  id: number
  title: string
  description: string
  type: string // content type badge (Anime, Gaming, Movies, K-Pop...)
  views: string // display string for now ("132K"); becomes a number with the API
}

export const FEATURED_CONTENT: ContentItem[] = [
  {
    id: 1,
    title: 'One Piece — The Final Saga',
    description: 'The adventure reaches its final chapter!',
    type: 'Anime',
    views: '132K',
  },
  {
    id: 2,
    title: 'Elden Ring',
    description: 'A new journey through the Lands Between.',
    type: 'Gaming',
    views: '98K',
  },
  {
    id: 3,
    title: 'Spider-Man: No Way Home',
    description: 'Three Spider-Men. One epic movie.',
    type: 'Movies',
    views: '216K',
  },
  {
    id: 4,
    title: 'BTS — The Story So Far',
    description: 'From debut to global icons.',
    type: 'K-Pop',
    views: '164K',
  },
]

export const POPULAR_THIS_WEEK: ContentItem[] = [
  { ...FEATURED_CONTENT[0], views: '132K views' },
  { ...FEATURED_CONTENT[1], views: '98K views' },
  { ...FEATURED_CONTENT[2], views: '216K views' },
  { ...FEATURED_CONTENT[3], views: '164K views' },
]

// ---------- Articles ----------

export interface Article {
  id: number
  title: string
  excerpt: string
  type: string
  readMeta: string // "12K views · 2h ago"
}

export const ARTICLES: Article[] = [
  {
    id: 1,
    title: 'Demon Slayer Season 3: Everything We Know So Far',
    excerpt: 'Hashira training, new arcs and release rumors collected in one place.',
    type: 'Anime',
    readMeta: '12K views · 2h ago',
  },
  {
    id: 2,
    title: 'Top 10 Open World Games You Must Play',
    excerpt: 'From vast kingdoms to neon cities — the biggest worlds in gaming.',
    type: 'Gaming',
    readMeta: '24K views · 5h ago',
  },
  {
    id: 3,
    title: 'Joker: Folie à Deux — A Deeper Look',
    excerpt: 'What the sequel means for the franchise and its characters.',
    type: 'Movies',
    readMeta: '18K views · 8h ago',
  },
  {
    id: 4,
    title: 'K-Pop Comebacks You Shouldn’t Miss',
    excerpt: 'This month’s most anticipated releases, ranked by the community.',
    type: 'K-Pop',
    readMeta: '16K views · 12h ago',
  },
]

// ---------- Upcoming events (dashboard) ----------

export interface UpcomingEvent {
  id: number
  day: string
  month: string
  title: string
  location: string
  tag: string
}

export const UPCOMING_EVENTS: UpcomingEvent[] = [
  { id: 1, day: '22', month: 'OCT', title: 'Anime Expo 2025', location: 'Lagos, Nigeria', tag: 'Anime' },
  { id: 2, day: '26', month: 'OCT', title: 'K-Pop World Festival', location: 'Online', tag: 'K-Pop' },
  { id: 3, day: '05', month: 'NOV', title: 'Comic Con Africa', location: 'Johannesburg, SA', tag: 'Comics' },
]
