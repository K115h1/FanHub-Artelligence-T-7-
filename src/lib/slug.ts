// toSlug, normalises a display label into a route/category slug.
//
// Lives in its own module because both mockData and events need it, and
// mockData imports from events (to derive UPCOMING_EVENTS). Keeping it here
// stops that pair forming an import cycle.
export const toSlug = (label: string): string =>
  label.toLowerCase().replace(/\s+/g, '-')
