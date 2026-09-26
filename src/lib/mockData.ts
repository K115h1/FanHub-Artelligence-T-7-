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
  description: string // short blurb shown on the category page
}

export const CATEGORIES: Category[] = [
  {
    slug: 'anime',
    name: 'Anime',
    icon: Drama,
    description: 'Animated worlds, shonen battles and slice-of-life favourites.',
  },
  {
    slug: 'gaming',
    name: 'Gaming',
    icon: Gamepad2,
    description: 'Console, PC and mobile titles the community can’t put down.',
  },
  {
    slug: 'movies',
    name: 'Movies',
    icon: Clapperboard,
    description: 'Blockbusters, indies and everything hitting the big screen.',
  },
  {
    slug: 'tv-shows',
    name: 'TV Shows',
    icon: Tv,
    description: 'Binge-worthy series, reality hits and streaming originals.',
  },
  {
    slug: 'k-pop',
    name: 'K-Pop',
    icon: Music,
    description: 'Comebacks, charts and the groups ruling the stage.',
  },
  {
    slug: 'comics',
    name: 'Comics',
    icon: BookOpen,
    description: 'Superheroes, graphic novels and indie panels.',
  },
  {
    slug: 'manga',
    name: 'Manga',
    icon: Ghost,
    description: 'Weekly serials, chapter drops and all-time classics.',
  },
  {
    slug: 'cosplay',
    name: 'Cosplay',
    icon: Sparkles,
    description: 'Craft, conventions and costumes worth the spotlight.',
  },
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
  {
    id: 5,
    title: 'Stranger Things — The Final Season',
    description: 'Hawkins braces for one last stand.',
    type: 'TV Shows',
    views: '142K',
  },
  {
    id: 6,
    title: 'Batman: Court of Owls',
    description: 'The Dark Knight versus an ancient secret society.',
    type: 'Comics',
    views: '76K',
  },
  {
    id: 7,
    title: 'Berserk — The Golden Age',
    description: 'Guts rises through war, ambition and fate.',
    type: 'Manga',
    views: '88K',
  },
  {
    id: 8,
    title: 'World Cosplay Summit 2025',
    description: 'The best builds from this year’s global stage.',
    type: 'Cosplay',
    views: '64K',
  },
  {
    id: 9,
    title: 'Jujutsu Kaisen — Cursed Energy Returns',
    description: 'Sorcerers gather for the next brutal arc.',
    type: 'Anime',
    views: '118K',
  },
  {
    id: 10,
    title: 'The Legend of Zelda: Echoes of Wisdom',
    description: 'A new hero wields a very different kind of power.',
    type: 'Gaming',
    views: '105K',
  },
  {
    id: 11,
    title: 'Dune: Part Two',
    description: 'Paul Atreides unites the desert and fulfils the prophecy.',
    type: 'Movies',
    views: '189K',
  },
  {
    id: 12,
    title: 'SEVENTEEN — God of Music',
    description: 'Thirteen members, one unstoppable summer anthem.',
    type: 'K-Pop',
    views: '137K',
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
  {
    id: 5,
    title: 'Stranger Things Final Season: Everything We Know',
    excerpt: 'Casting, theories and the night the Upside Down returns.',
    type: 'TV Shows',
    readMeta: '9K views · 6h ago',
  },
  {
    id: 6,
    title: 'Batman: Court of Owls — A Reading Order',
    excerpt: 'Where to start and which issues matter before diving in.',
    type: 'Comics',
    readMeta: '7K views · 9h ago',
  },
  {
    id: 7,
    title: 'Where to Start With Manga (If You’re New)',
    excerpt: 'Ten beginner-friendly series across every genre.',
    type: 'Manga',
    readMeta: '11K views · 1d ago',
  },
  {
    id: 8,
    title: 'Cosplay on a Budget: Smart Crafting Tips',
    excerpt: 'Foam, fabric and paint tricks that won’t break the bank.',
    type: 'Cosplay',
    readMeta: '6K views · 1d ago',
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

// ---------- Category maps (hashmaps) ----------
// One pass over each list groups its items by category slug, so every page
// can pull "its" data with a single O(1) lookup instead of re-filtering.

// "TV Shows" → "tv-shows" — same shape as the slugs used in CATEGORIES.
export const toSlug = (label: string): string =>
  label.toLowerCase().replace(/\s+/g, '-')

const groupByCategory = <T>(items: T[], getType: (item: T) => string): Record<string, T[]> => {
  const grouped: Record<string, T[]> = {}
  for (const item of items) {
    const key = toSlug(getType(item))
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(item)
  }
  return grouped
}

// slug → that category's items (each map is built once at load time).
export const CONTENT_BY_CATEGORY = groupByCategory(FEATURED_CONTENT, (item) => item.type)
export const ARTICLES_BY_CATEGORY = groupByCategory(ARTICLES, (item) => item.type)
export const EVENTS_BY_CATEGORY = groupByCategory(UPCOMING_EVENTS, (event) => event.tag)

// slug → category metadata (name / icon / description).
export const CATEGORY_MAP: Record<string, Category> = {}
for (const category of CATEGORIES) {
  CATEGORY_MAP[category.slug] = category
}
