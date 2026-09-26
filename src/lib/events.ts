// Fan events — the dataset behind the Events page.
//
// Richer than the date tile the homepage needs: the Events page shows venue,
// price, attendance and a summary, so that shape lives here and mockData
// derives the smaller `UpcomingEvent` from it. One source of truth for both.
import { toSlug } from './slug'

export interface FanEvent {
  id: number
  title: string
  tag: string // category label, e.g. 'Anime'
  day: string
  month: string // 3-letter, uppercase
  /** ISO date, used for sorting. */
  date: string
  location: string // city name, or 'Online'
  isOnline: boolean
  summary: string
  /** Rough attendance, shown as social proof. */
  going: number
  price: string // 'Free' or 'From $25'
  featured?: boolean
}

/** Compact shape the homepage and dashboard render. */
export interface UpcomingEvent {
  id: number
  day: string
  month: string
  title: string
  location: string
  tag: string
}

export const EVENTS: FanEvent[] = [
  {
    id: 1,
    title: 'Anime Expo 2026',
    tag: 'Anime',
    day: '22',
    month: 'OCT',
    date: '2026-10-22',
    location: 'Lagos, Nigeria',
    isOnline: false,
    summary: 'Three days of screenings, panels and cosplay competitions on the continent’s biggest anime weekend.',
    going: 12400,
    price: 'From $30',
    featured: true,
  },
  {
    id: 2,
    title: 'K-Pop World Festival',
    tag: 'K-Pop',
    day: '26',
    month: 'OCT',
    date: '2026-10-26',
    location: 'Online',
    isOnline: true,
    summary: 'A livestreamed stage plus fan cam rooms, running across every time zone with subtitles.',
    going: 41800,
    price: 'Free',
    featured: true,
  },
  {
    id: 3,
    title: 'Comic Con Africa',
    tag: 'Comics',
    day: '05',
    month: 'NOV',
    date: '2026-11-05',
    location: 'Johannesburg, SA',
    isOnline: false,
    summary: 'Artists’ alley, indie panels and a retrospective on the last decade of African comics.',
    going: 8600,
    price: 'From $18',
    featured: true,
  },
  {
    id: 4,
    title: 'Riftbound invitational',
    tag: 'Gaming',
    day: '09',
    month: 'NOV',
    date: '2026-11-09',
    location: 'Online',
    isOnline: true,
    summary: 'Eight invited teams, best-of-three bracket, commentary in English and Portuguese.',
    going: 15200,
    price: 'Free',
  },
  {
    id: 5,
    title: 'Cosplay Craft Weekend',
    tag: 'Cosplay',
    day: '14',
    month: 'NOV',
    date: '2026-11-14',
    location: 'Manchester, UK',
    isOnline: false,
    summary: 'Bring a half-finished build and learn foam, thermofoil and finishing from working makers.',
    going: 340,
    price: 'From £12',
  },
  {
    id: 6,
    title: 'Manga Drawing Masterclass',
    tag: 'Manga',
    day: '21',
    month: 'NOV',
    date: '2026-11-21',
    location: 'Tokyo, Japan',
    isOnline: false,
    summary: 'A full-day session on panel layout and screentone, streamed afterwards for those who can’t travel.',
    going: 2100,
    price: 'From ¥4500',
  },
  {
    id: 7,
    title: 'Dune 40th anniversary screening',
    tag: 'Movies',
    day: '28',
    month: 'NOV',
    date: '2026-11-28',
    location: 'Online',
    isOnline: true,
    summary: 'A restored 4K print with a post-film discussion, hosted by the archive team.',
    going: 6100,
    price: 'Free',
  },
  {
    id: 8,
    title: 'Cosplay World Finals',
    tag: 'Cosplay',
    day: '06',
    month: 'DEC',
    date: '2026-12-06',
    location: 'Lyon, France',
    isOnline: false,
    summary: 'The international final, with a craftsmanship showcase judged separately from the competition.',
    going: 9800,
    price: 'From €40',
    featured: true,
  },
  {
    id: 9,
    title: 'Winter chillout: lo-fi mixes',
    tag: 'K-Pop',
    day: '12',
    month: 'DEC',
    date: '2026-12-12',
    location: 'Online',
    isOnline: true,
    summary: 'A six-hour co-listening room. No VOD, no clips — just the tracks, in order.',
    going: 7400,
    price: 'Free',
  },
  {
    id: 10,
    title: 'Sitcom marathon: the complete run',
    tag: 'TV Shows',
    day: '19',
    month: 'DEC',
    date: '2026-12-19',
    location: 'Dublin, Ireland',
    isOnline: false,
    summary: 'All nine seasons, back to back, with a pub quiz between the lunch and dinner screenings.',
    going: 1450,
    price: 'From €22',
  },
  {
    id: 11,
    title: 'Shonen jump anniversary showcase',
    tag: 'Anime',
    day: '02',
    month: 'JAN',
    date: '2027-01-02',
    location: 'Tokyo, Japan',
    isOnline: false,
    summary: 'Voice-cast reunions, new project announcements and a retrospective on 30 years of weekly serialization.',
    going: 5600,
    price: 'From ¥3800',
  },
  {
    id: 12,
    title: 'Indie game jam showcase',
    tag: 'Gaming',
    day: '17',
    month: 'JAN',
    date: '2027-01-17',
    location: 'Online',
    isOnline: true,
    summary: 'Forty-eight hours of teams, then a public play session of every entry built during the jam.',
    going: 9300,
    price: 'Free',
  },
]

// slug → that category's events.
export const EVENTS_BY_CATEGORY: Record<string, FanEvent[]> = {}
for (const event of EVENTS) {
  const key = toSlug(event.tag)
  if (!EVENTS_BY_CATEGORY[key]) EVENTS_BY_CATEGORY[key] = []
  EVENTS_BY_CATEGORY[key].push(event)
}

// Every city with an in-person event, for the Events page's city filter.
export const EVENT_CITIES: string[] = [...new Set(EVENTS.filter((e) => !e.isOnline).map((e) => e.location))].sort()

export const byDate = (a: FanEvent, b: FanEvent): number => a.date.localeCompare(b.date)

/** "12.4K" / "1.2K" — compact attendance for the card meta line. */
export function formatGoing(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}
