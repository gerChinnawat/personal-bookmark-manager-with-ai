import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CollectionsPage from './CollectionsPage'
import { createCollection, fetchCollections } from '../services/collection.service'
import type { Collection } from '../interfaces/collection.interface'

vi.mock('../services/collection.service', () => ({
  fetchCollections: vi.fn(),
  createCollection: vi.fn(),
}))

const mockedFetchCollections = vi.mocked(fetchCollections)
const mockedCreateCollection = vi.mocked(createCollection)

const collection: Collection = {
  id: 'c1',
  name: 'Reading list',
  createdAt: '2026-07-28T00:00:00.000Z',
  updatedAt: '2026-07-28T00:00:00.000Z',
}

describe('CollectionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads and displays collections on mount', async () => {
    mockedFetchCollections.mockResolvedValue([collection])

    render(<CollectionsPage />)

    expect(await screen.findByText('Reading list')).toBeInTheDocument()
    expect(mockedFetchCollections).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state when there are no collections', async () => {
    mockedFetchCollections.mockResolvedValue([])

    render(<CollectionsPage />)

    expect(await screen.findByText('No collections yet')).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    mockedFetchCollections.mockRejectedValue(new Error('network error'))

    render(<CollectionsPage />)

    expect(await screen.findByText('Could not load collections.')).toBeInTheDocument()
  })

  it('creates a collection and reloads the list', async () => {
    const user = userEvent.setup()
    mockedFetchCollections.mockResolvedValueOnce([]).mockResolvedValueOnce([collection])
    mockedCreateCollection.mockResolvedValue(collection)

    render(<CollectionsPage />)
    await screen.findByText('No collections yet')

    await user.click(screen.getAllByRole('button', { name: 'New collection' })[0])
    await user.type(screen.getByLabelText('Name'), 'Reading list')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(mockedCreateCollection).toHaveBeenCalledWith('Reading list'))
    expect(await screen.findByText('Reading list')).toBeInTheDocument()
    expect(mockedFetchCollections).toHaveBeenCalledTimes(2)
  })
})
