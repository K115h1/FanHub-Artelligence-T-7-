// http.ts — shared fetch wrapper (scaffold placeholder).
// Responsibilities:
//   * prefixes VITE_API_URL from the environment (never hardcode secrets)
//   * attaches session credentials/Authorization header
//   * JSON (de)serialization
//   * normalizes errors into ApiError (src/types/api.ts)
//   * maps 401 → session expired, 403 → forbidden, 500 → generic message
// Every service in this folder must go through this wrapper.
export {}
