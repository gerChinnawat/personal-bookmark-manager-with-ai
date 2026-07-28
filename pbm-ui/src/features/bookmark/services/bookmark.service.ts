import type { Bookmark } from '../interfaces/bookmark.interface'

const MOCK_BOOKMARKS: Bookmark[] = [
  {
    id: 'stratechery-1',
    title: 'The Bill Gates Line',
    domain: 'stratechery.com',
    url: 'https://stratechery.com/',
    notes: 'Good framing on platform vs aggregator strategy.',
    collectionId: 'reading-list',
    updatedAt: '2026-07-25T09:00:00Z',
  },
  {
    id: 'increment-1',
    title: 'How Discord Stores Trillions of Messages',
    domain: 'increment.com',
    url: 'https://increment.com/',
    collectionId: 'reading-list',
    updatedAt: '2026-07-23T09:00:00Z',
  },
  {
    id: 'seriouseats-1',
    title: 'The Food Lab: Best Braised Short Ribs',
    domain: 'seriouseats.com',
    url: 'https://www.seriouseats.com/',
    notes: 'Use chuck short ribs, not flanken cut.',
    collectionId: 'recipes',
    updatedAt: '2026-07-24T09:00:00Z',
  },
  {
    id: 'kingarthurbaking-1',
    title: 'No-Knead Sourdough Bread',
    domain: 'kingarthurbaking.com',
    url: 'https://www.kingarthurbaking.com/',
    collectionId: 'recipes',
    updatedAt: '2026-07-22T09:00:00Z',
  },
  {
    id: 'openid-1',
    title: 'OpenID Connect Core 1.0',
    domain: 'openid.net',
    url: 'https://openid.net/',
    notes: 'Spec reference for the auth flow.',
    collectionId: 'research',
    updatedAt: '2026-07-10T09:00:00Z',
  },
  {
    id: 'crunchydata-1',
    title: 'Postgres Row-Level Security',
    domain: 'crunchydata.com',
    url: 'https://www.crunchydata.com/',
    updatedAt: '2026-07-18T09:00:00Z',
  },
]

const MOCK_DELAY_MS = 600

export function fetchBookmarks(): Promise<Bookmark[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_BOOKMARKS), MOCK_DELAY_MS)
  })
}
