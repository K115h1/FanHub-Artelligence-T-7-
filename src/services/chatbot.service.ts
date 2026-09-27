// chatbot.service — DEFERRED, deliberately empty.
//
// The SRS marks the AI chatbot as optional and says to build it only after
// every mandatory requirement is complete. The database already has a
// chatbot_queries table ready for it, but there is no ChatbotController on the
// API and no UI, so there is nothing to call.
//
// When it is built: the API needs a POST /api/chatbot endpoint that stores the
// question and answer, and the key comes from configuration the way TMDB_API_KEY
// does — never from the frontend bundle.
export {}
