import type { Collection } from '../interfaces/collection.interface'

const MOCK_COLLECTIONS: Collection[] = [
  {
    id: 'reading-list',
    name: 'Reading List',
    count: 8,
    updatedAt: '2026-07-20T10:00:00Z',
    colorSwatches: ['#1976d2', '#42a5f5', '#90caf9'],
  },
  {
    id: 'recipes',
    name: 'Recipes',
    count: 14,
    updatedAt: '2026-07-24T10:00:00Z',
    colorSwatches: ['#d32f2f', '#f06292', '#ffb74d'],
  },
  {
    id: 'research',
    name: 'Research',
    count: 3,
    updatedAt: '2026-07-10T10:00:00Z',
    colorSwatches: ['#388e3c', '#81c784'],
  },
]

const MOCK_DELAY_MS = 600

export function fetchCollections(): Promise<Collection[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_COLLECTIONS), MOCK_DELAY_MS)
  })
}
