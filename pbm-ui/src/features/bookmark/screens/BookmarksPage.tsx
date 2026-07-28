import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { fetchBookmarks } from '../services/bookmark.service'
import type { Bookmark } from '../interfaces/bookmark.interface'
import { fetchCollections } from '../../collection/services/collection.service'
import type { Collection } from '../../collection/interfaces/collection.interface'
import BookmarkFilterChips, { type FilterCollection } from '../components/BookmarkFilterChips'
import BookmarksGrid from '../components/BookmarksGrid'

function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterCollection>('all')

  useEffect(() => {
    let cancelled = false

    Promise.all([fetchBookmarks(), fetchCollections()]).then(([bookmarkData, collectionData]) => {
      if (!cancelled) {
        setBookmarks(bookmarkData)
        setCollections(collectionData)
        setIsLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const collectionNameById = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection.name])),
    [collections],
  )

  const filteredBookmarks = useMemo(() => {
    if (filter === 'all') return bookmarks
    if (filter === 'none') return bookmarks.filter((bookmark) => !bookmark.collectionId)
    return bookmarks.filter((bookmark) => bookmark.collectionId === filter)
  }, [bookmarks, filter])

  const handleCreate = () => {
    // Wired up once the New Bookmark modal exists.
  }

  const status = isLoading ? 'loading' : filteredBookmarks.length === 0 ? 'empty' : 'data'

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: 24, fontWeight: 500 }}>
          Bookmarks
        </Typography>
        <Button variant="contained" onClick={handleCreate}>
          New bookmark
        </Button>
      </Box>

      <BookmarkFilterChips collections={collections} filter={filter} onFilterChange={setFilter} />

      <BookmarksGrid status={status} bookmarks={filteredBookmarks} collectionNameById={collectionNameById} />
    </Box>
  )
}

export default BookmarksPage
