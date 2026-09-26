// Detail copy for the content and article detail pages.
//
// Kept out of mockData so those arrays stay scannable: the cards only need a
// title and a blurb, while the detail pages need a synopsis, facts and body
// copy. Keyed by id, so a missing entry is a visible gap rather than a crash.
import { FEATURED_CONTENT } from './mockData'

export interface ContentDetail {
  synopsis: string
  /** Short factual line: creator, studio or director. */
  credit: string
  year: number
  genres: string[]
  /** Episodes for series, runtime for films, "—" for one-offs. */
  length: string
  /** Cast or principal cast. */
  cast: string[]
}

const contentDetails: Record<number, ContentDetail> = {
  1: {
    synopsis:
      'The straw hat crew is scattered across the final stretch of the Grand Line, and the stakes have never been higher. What began as a race for the One Piece has become a fight over what the world will look like afterwards — and who gets to decide it.',
    credit: 'Created by Eiichiro Oda',
    year: 1999,
    genres: ['Adventure', 'Action', 'Shonen'],
    length: '1,100+ episodes',
    cast: ['Monkey D. Luffy', 'Roronoa Zoro', 'Nami', 'Sanji'],
  },
  2: {
    synopsis:
      'A shattered world, a ring that was never meant to be worn, and a demigod quietly dismantling the order that kept the Lands Between in place. You are not a chosen one — you are a Tarnished, and the game rarely tells you which of you that makes you.',
    credit: 'FromSoftware',
    year: 2022,
    genres: ['Action RPG', 'Open World', 'Soulslike'],
    length: '60+ hours',
    cast: ['The player', 'Melina', 'Ranni', 'Sire Radahn'],
  },
  3: {
    synopsis:
      'With the multiverse cracking open, the only person who can fix it is the one everyone is arguing about. A reunion story that finally gives each of the three Spiders-Man a reason to stay in the frame.',
    credit: 'Directed by Jon Watts',
    year: 2021,
    genres: ['Superhero', 'Sci-Fi', 'Action'],
    length: '2h 28m',
    cast: ['Tom Holland', 'Zendaya', 'Andrew Garfield'],
  },
  4: {
    synopsis:
      'Seven members, a decade of experiments in sound, and the slow argument about what a K-Pop group is actually for. Told through the records themselves rather than through the headlines.',
    credit: 'BIGHIT MUSIC',
    year: 2013,
    genres: ['Documentary', 'Music', 'Biographical'],
    length: '3h 20m',
    cast: ['RM', 'Jin', 'SUGA', 'j-hope', 'Jimin', 'V', 'Jung Kook'],
  },
  5: {
    synopsis:
      'The kids are grown, the threat is bigger, and Hawkins is running out of roads. A final season built around the question of whether a town can survive the thing it has been hiding from since 1983.',
    credit: 'Duffer Brothers',
    year: 2025,
    genres: ['Sci-Fi', 'Horror', 'Coming of Age'],
    length: '8 episodes',
    cast: ['Millie Bobby Brown', 'Finn Wolfhard', 'Winona Ryder'],
  },
  6: {
    synopsis:
      'A society that eats its own history discovers an even older one underneath it. A dense, paranoid superhero noir that rewards being a month behind the reading orders.',
    credit: 'Scott Snyder & Greg Capullo',
    year: 2009,
    genres: ['Superhero', 'Noir', 'Graphic Novel'],
    length: 'Collected in 3 volumes',
    cast: ['Bruce Wayne', 'Nightwing', 'Black Mask'],
  },
  7: {
    synopsis:
      'The Golden Age trilogy, and the reason it still matters: a hero who cannot be saved, a party that cannot be made whole, and a set of choices that keep being wrong in ways nobody planned for.',
    credit: 'Kentaro Miura',
    year: 1989,
    genres: ['Dark Fantasy', 'Action', 'Seinen'],
    length: 'Collected in 14 volumes',
    cast: ['Guts', 'C Griffith', 'SchSuite Midwitch'],
  },
  8: {
    synopsis:
      'Every year the world’s best builds gather, and every year the judging changes what "best" means. This year separates the competition from the craftsmanship showcase — and for once they disagree about the winner.',
    credit: 'World Cosplay Summit',
    year: 2025,
    genres: ['Cosplay', 'Convention', 'Competition'],
    length: '3 days',
    cast: ['Winners from 42 countries'],
  },
  9: {
    synopsis:
      'The curses came back harder, the students came back stronger, and the school is still running on a budget and a prayer. A new arc that starts immediately and explains itself exactly never.',
    credit: 'Gege Akutami',
    year: 2018,
    genres: ['Action', 'Supernatural', 'Shonen'],
    length: 'Ongoing',
    cast: ['Yuji Itadori', 'Megumi Fushiguro', 'Satoru Gojo'],
  },
  10: {
    synopsis:
      'A kingdom in trouble sends for the one person who does not want the job. A Switch exclusive about what happens when the hero is tired and the puzzle is built for someone younger.',
    credit: 'Nintendo EPD',
    year: 2025,
    genres: ['Action Adventure', 'Puzzle', 'Fantasy'],
    length: '40+ hours',
    cast: ['The player', 'Princess Zelda', 'Tulin'],
  },
  11: {
    synopsis:
      'Paul takes the desert, pays for it in the only currency he has, and starts to understand why the Bene Gesserit warned him. The second half of the adaptation trades spectacle for dread, and gains something for it.',
    credit: 'Directed by Denis Villeneuve',
    year: 2024,
    genres: ['Sci-Fi', 'Epic', 'Political'],
    length: '2h 46m',
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson'],
  },
  12: {
    synopsis:
      'Thirteen members, an album that refused to be a single, and a summer that reset the chart. A self-titled record built as a thirteen-way conversation rather than a frontman’s diary.',
    credit: 'PLEDIS Entertainment',
    year: 2025,
    genres: ['K-Pop', 'Album', 'Performance'],
    length: '14 tracks',
    cast: ['S.Coups', 'Jeonghan', 'Joshua', 'Jun', 'Hoshi', 'Woozi', 'DK', 'Mingyu', 'The8', 'Seungkwan', 'Vernon', 'Dino', 'Hansol'],
  },
}

export interface ArticleDetail {
  author: string
  readMinutes: number
  body: string[]
}

const articleDetails: Record<number, ArticleDetail> = {
  1: {
    author: 'Rin Okabe',
    readMinutes: 7,
    body: [
      'The third season was always going to be a bridge. The films split the cast in ways the manga never had to, and the anime had the unenviable job of making both halves feel like one story rather than two competing ones.',
      'So the studio did something sensible: it slowed down. The first four episodes are almost entirely setup. No new threats, no power escalations — just the survivors of what came before sitting in rooms and working out what they are now.',
      'The Hashira returns are the obvious draw and the least interesting part. The interesting material is in the connective tissue: a younger student asking a question that the veterans can no longer answer, and nobody in the room willing to say so out loud.',
      'Where it does move, it moves fast. The arc that closes out the back half gives one character a decision that reframes everything they did in the first season, and it is worth the wait.',
      'Release dates are still region-locked, so check locally before planning around it. The short version: patient for four episodes, then it earns the rest.',
    ],
  },
  2: {
    author: 'Dev Patel',
    readMinutes: 9,
    body: [
      'There is a particular kind of game where the map is the point. You are not clearing enemies so much as learning a geography, and the good ones make the learning feel like discovery rather than homework.',
      'The entries below are ordered by how much they respect that idea, not by raw size. A smaller world that rewards wandering beats a larger one that punishes it.',
      'What they share is a rule: the interesting thing is almost never behind the obvious door. If a corridor feels like filler, walk it twice. The shortcut is usually somewhere you would not have looked at speed.',
      'The one to skip is the fourth. It is not bad, exactly — it is just content, and it asks you to grind through the difference.',
      'Save your progress before the third area. Not because it is difficult, but because it will quietly reset one inventory item and nobody will mention it.',
    ],
  },
  3: {
    author: 'Priya Raman',
    readMinutes: 6,
    body: [
      'Sequels that repeat the first film beat for beat get reviewed as lazy. Sequels that quietly answer questions the first one raised get called a miscalculation, which is a strange thing to be punished for.',
      'This one does both. The structural beats are recognisably the same — the same breakdown, the same escalation — but the framing has shifted enough that the ending lands differently.',
      'The co-writers were reportedly at odds over the third act, and you can see the seam. Two endings, one of them longer and considerably worse, and the production kept both long enough to be sure.',
      'The performances carry it. One actor is doing very little for most of the runtime and then does something in the last ten minutes that reframes the whole character.',
      'Worth watching for the craft. Worth rewatching for the fact that it is braver than the marketing suggested.',
    ],
  },
  4: {
    author: 'Ji-woo Han',
    readMinutes: 5,
    body: [
      'Comeback season is decided in advance by the calendar, and that is the first problem with ranking anything within it. A group releasing in November is competing on a completely different set of conditions to one releasing in June.',
      'What tends to survive the cut is the release with a point of view. Staging that could be a concert for anyone is a competent, forgettable choice; staging that only works because these seven have performed together for a decade is not.',
      'This year the strong entries cluster around the same idea: less choreography, more arrangement. It reads as a retreat, and it is not — it is a group that has learned what it can carry.',
      'The pre-singles were the right call. By the time the track drops you already know who is singing, so the video gets to be a film instead of an advert.',
      'Rankings at the bottom are a write-off, as usual. Do not spend the streaming minutes.',
    ],
  },
  5: {
    author: 'Sam Okafor',
    readMinutes: 8,
    body: [
      'Every ending for a show this popular is negotiated, and the negotiations are always visible if you know where to look. You can see the seams in this one: two finales, one of which is clearly a contingency.',
      'The season itself is a lesson in what happens when a genre runs out of road. The first four episodes are mystery, the middle is consequence, and the back half is a series of people deciding what to do now that the mystery is answered.',
      'That pivot is the risk and it mostly works. The one episode that does not is the sixth, which asks the audience to hold three timelines at once during a fight scene, for reasons that never become clear.',
      'The cast carry the middle stretch almost entirely. Two of them have scenes with no dialogue that do more than an hour of exposition elsewhere.',
      'Watch it. Then go back and rewatch the first season, because the thing this season is really about is only visible on a second pass.',
    ],
  },
  6: {
    author: 'Tomas Lindqvist',
    readMinutes: 6,
    body: [
      'Reading orders for a long comic run are usually a compromise between chronology and availability. This one is a compromise in favour of chronology, which is the right call and the annoying one.',
      'Start at volume one. Yes, it is slow, and no, the villain does not appear for eight issues. The groundwork is doing the entire job of making the later twist land.',
      'The trade paperback line is worth avoiding where it reorders. The omniscient edition keeps the original structure and adds nothing you cannot read in the margins of the single issues.',
      'Two side arcs can be skipped without much loss, and one of them — the fourth arc — is genuinely better than the main run and worth the detour afterwards.',
      'The trade edition is currently out of print in several regions. The digital release is complete and correctly ordered, so start there if the shelf is empty.',
    ],
  },
  7: {
    author: 'Aiko Tanabe',
    readMinutes: 10,
    body: [
      'The beginner’s list is always compromised by whoever wrote it. This one is not, which is why it is worth reading past the list itself.',
      'The advice underneath is simple and correct: pick one series, read it properly, and finish it before starting another. The format rewards completion in a way most readers are not prepared for, and switching every fortnight is the single most common reason people say they cannot get into it.',
      'The three the author recommends for a first read are chosen for different reasons, not for difficulty. One is comfortable, one is short, and one is structurally strange enough that it teaches you something the other two cannot.',
      'What to avoid, and the list is longer than the recommendations: anything that begins with a film adaptation you have not seen, and anything where the first volume is mostly flashback.',
      'The final section covers what to read once the format has clicked, including the three series almost nobody starts with and everyone finishes.',
    ],
  },
  8: {
    author: 'Marta Kowalczyk',
    readMinutes: 6,
    body: [
      'Budget cosplay advice skews either towards materials you cannot buy in your country or towards techniques that assume a workshop. This guide does neither, and it is unusually specific about failure.',
      'The central trick is that most of a convincing prop is silhouette, and silhouette is cheap. If the outline is wrong, no amount of detail rescues it — and the outline is fixable with card, foam and a week of evenings.',
      'Finishing is where budget builds fall apart, and the advice here is to do less of it. Three good passes beat eight rushed ones, and the last two hours on a prop are the two hours most worth skipping.',
      'Paint is addressed honestly: the cheap range is fine for priming and basecoats, and a single good topcoat is the one place worth spending. Everything else, buy in small amounts and test on scrap.',
      'The section on hair is the strongest part of the guide and the reason to read it even if you skip the rest.',
    ],
  },
}

/** Detail for a content item, or null when the id has no entry. */
export function getContentDetail(id: number): ContentDetail | null {
  return contentDetails[id] ?? null
}

/** Detail for an article, or null when the id has no entry. */
export function getArticleDetail(id: number): ArticleDetail | null {
  return articleDetails[id] ?? null
}

/** Same category, different id — the "more like this" row. */
export function relatedContent(id: number, limit = 4) {
  const source = FEATURED_CONTENT.find((item) => item.id === id)
  if (!source) return []
  return FEATURED_CONTENT.filter((item) => item.type === source.type && item.id !== id).slice(0, limit)
}
