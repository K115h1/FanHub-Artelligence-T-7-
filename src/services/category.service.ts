// category.service — the 8 fandom categories and their genres.
//
// Both live under /api/contents on the API, so these are thin re-exports of
// the calls in content.service rather than a second set of requests. Kept as a
// separate file so a page asking for "categories" does not look like it is
// asking for content.
export { getCategories, getGenres } from './content.service'
