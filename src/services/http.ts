// http.ts — shared fetch wrapper (not built yet). Every service in this folder
// must go through it. It needs to: prefix VITE_API_URL (never hardcode secrets),
// attach credentials, handle JSON, normalize errors into ApiError (types/api.ts),
// and map 401/403/500 to friendly messages.
export {}
