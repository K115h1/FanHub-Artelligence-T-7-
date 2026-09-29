// bookmark.service, the signed-in user's saved titles.
//
// The API exposes a toggle rather than add/remove, because that is what the UI
// button does; the toggle returns the resulting state so the caller never has
// to guess.
export { getBookmarks, toggleBookmark } from './content.service'
