// One banner image per fandom, keyed by the category slug the router uses.
//
// WHY A MANIFEST AND NOT A CONVENTION
//   The obvious rule is "the image for /category/gaming lives at
//   /images/categories/gaming.jpg", and for six of the eight that happens to be
//   true. It stops being true the moment a fandom's name and its slug differ:
//   k-pop is `k-pop` but tvshows is `tv-shows`, and a person dropping a file in
//   would reasonably guess either. Naming them in one table means the answer is
//   written down rather than inferred, and adding a fandom is a single line.
//
// NOT ALL EIGHT ARE PHOTOGRAPHS
//   Seven were supplied as 1600x900 photographs. Manga had none supplied, so its
//   banner is generated SVG (see the entry below). Every category now has a
//   banner, so the gradient fallback is a safety net rather than a visible state.
//
// FALLBACK
//   These are set as a CSS background-image. A path that 404s simply fails to
//   paint, and the gradient underneath still shows, there is no broken-image
//   icon and no error state to handle.
//
// WHERE THEY CAME FROM
//   Seven of these were supplied as 1600x900 photographs and copied in by
//   scripts/placeCategoryArt.mjs, which also reports their dimensions. Re-run it
//   to refresh them from Downloads. It handles the photographic set only, it
//   will not touch manga.svg.

/** Category slug -> banner path. Missing key means "gradient only". */
export const CATEGORY_BANNERS: Record<string, string> = {
  movies: '/images/categories/movies.jpg',
  anime: '/images/categories/anime.jpg',
  gaming: '/images/categories/gaming.jpg',
  comics: '/images/categories/comics.jpg',
  'k-pop': '/images/categories/kpop.jpg',
  'tv-shows': '/images/categories/tv-shows.jpg',
  cosplay: '/images/categories/cosplay.jpg',
  // Manga is the odd one out: no photograph was supplied, so this is a GENERATED
  // SVG (panels, screentone, speed lines) rather than a photograph, which is
  // why it is the one `.svg` among the `.jpg` files. It is deliberately abstract:
  // a generated illustration of a fictional character would misrepresent the
  // category, whereas a panel composition reads as "manga" without claiming to
  // be a specific title. To swap in a real photo, drop a 1600x900 JPEG at
  // public/images/categories/manga.jpg and change only this line; the two are
  // interchangeable because these are CSS backgrounds.
  manga: '/images/categories/manga.svg',
}

/** The banner for a slug, or undefined when that fandom has none. */
export function categoryBanner(slug: string): string | undefined {
  return CATEGORY_BANNERS[slug]
}
