// Seed data for the admin moderation queues.
//
// The `feedback` and `fan_submissions` tables are empty in the database, so both
// moderation pages would open blank and prove nothing. These entries are what
// the API will return; AdminDataProvider copies them in on first run and then
// persists any status changes to localStorage.
//
// Dates are fixed strings rather than offsets from "now" so the demo looks the
// same every time it is opened.

import type { FanSubmission, FeedbackItem } from '../../types/models'

export const SEED_FEEDBACK: FeedbackItem[] = [
  {
    id: 'fb_001',
    userId: 'acc_demo_user',
    userName: 'Grace Hopper',
    type: 'suggestion',
    message:
      'The Explorer would be much easier to use if the genre filters stayed put when you change fandom. Right now they reset and you lose your place.',
    email: 'user@fanhubplus.test',
    rating: 4,
    status: 'open',
    createdAt: '2026-09-18T09:12:00Z',
  },
  {
    id: 'fb_002',
    userId: null,
    userName: 'Anonymous visitor',
    type: 'bug',
    message:
      'On my laptop the hero carousel never advances past the first slide. Autoplay is on in my settings but nothing happens. Chrome, 1360px wide.',
    email: 'visitor@example.com',
    rating: 2,
    status: 'open',
    createdAt: '2026-09-17T20:41:00Z',
  },
  {
    id: 'fb_003',
    userId: 'acc_demo_user',
    userName: 'Grace Hopper',
    type: 'query',
    message: 'Is there a way to watch the trailers here, or is this site articles and images only? The media player page is still a placeholder.',
    email: 'user@fanhubplus.test',
    rating: 3,
    status: 'reviewed',
    createdAt: '2026-09-15T13:05:00Z',
  },
  {
    id: 'fb_004',
    userId: null,
    userName: 'Anonymous visitor',
    type: 'content',
    message:
      'The synopsis for "Les Misérables" on the content page is empty. Several of the classics have no description at all — any chance of filling those in?',
    email: 'visitor@example.com',
    rating: 4,
    status: 'open',
    createdAt: '2026-09-14T08:27:00Z',
  },
  {
    id: 'fb_005',
    userId: 'acc_demo_user',
    userName: 'Grace Hopper',
    type: 'bug',
    message:
      'Bookmarks vanished after I signed out and back in. I had about thirty saved. Not sure if that is expected behaviour.',
    email: 'user@fanhubplus.test',
    rating: 2,
    status: 'resolved',
    createdAt: '2026-09-11T16:30:00Z',
  },
  {
    id: 'fb_006',
    userId: null,
    userName: 'Anonymous visitor',
    type: 'suggestion',
    message: 'Please add a dark mode toggle to the header rather than burying it in profile settings. Took me a while to find it.',
    email: 'visitor@example.com',
    rating: 3,
    status: 'dismissed',
    createdAt: '2026-09-08T11:19:00Z',
  },
]

export const SEED_SUBMISSIONS: FanSubmission[] = [
  {
    id: 'sub_001',
    userId: 'acc_demo_user',
    userName: 'Grace Hopper',
    categorySlug: 'anime',
    title: 'Why "Cowboy Bebop" still holds up in 2026',
    body:
      'Twenty years after it aired, the crew of the Bebop are still the benchmark for a ragtag found-family. The finale earns its silence, and the jazz score does the rest. Would be glad to expand this into a full article.',
    status: 'pending',
    createdAt: '2026-09-19T10:00:00Z',
  },
  {
    id: 'sub_002',
    userId: 'acc_demo_user',
    userName: 'Grace Hopper',
    categorySlug: 'movies',
    title: 'The practical effects in "Mad Max: Fury Road" were shot in real desert',
    body:
      'Almost no CGI vehicles in the action sequences. The production bought real cars, modified them, and crashed them for one take. Happy to write this up properly with sources.',
    status: 'pending',
    createdAt: '2026-09-18T15:22:00Z',
  },
  {
    id: 'sub_003',
    userId: 'acc_second',
    userName: 'Kai Nakamura',
    categorySlug: 'gaming',
    title: 'Hollow Knight fan art collection',
    body:
      'Submitting a set of five digital paintings of Hallownest landmarks. Happy for these to be featured on the gaming landing page with credit.',
    status: 'pending',
    createdAt: '2026-09-16T19:44:00Z',
  },
  {
    id: 'sub_004',
    userId: 'acc_second',
    userName: 'Kai Nakamura',
    categorySlug: 'k-pop',
    title: 'How idle-song choreography differs from main-stage',
    body:
      'Idle routines are built for a seated audience and camera reframing rather than the arena, so the formations read differently. Requesting an article slot.',
    status: 'approved',
    createdAt: '2026-09-12T09:15:00Z',
  },
  {
    id: 'sub_005',
    userId: 'acc_third',
    userName: 'Priya Raman',
    categorySlug: 'comics',
    title: 'Recommendation thread: underread European series',
    body:
      'Several smaller European titles deserve the same shelf space as the usual suspects. Happy to put together a recommended-reading list.',
    status: 'rejected',
    createdAt: '2026-09-09T21:03:00Z',
  },
]
