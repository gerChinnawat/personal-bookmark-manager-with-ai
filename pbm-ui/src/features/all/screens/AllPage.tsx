import { useEffect, useMemo, useState } from 'react'
import { Box, Skeleton, Typography } from '@mui/material'
import { fetchBookmarks } from '../../bookmark/services/bookmark.service'
import type { Bookmark } from '../../bookmark/interfaces/bookmark.interface'
import { fetchCollections } from '../../collection/services/collection.service'
import type { Collection } from '../../collection/interfaces/collection.interface'
import BookmarkGroupSection from '../components/BookmarkGroupSection'

function AllPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  const groups = useMemo(() => {
    const byCollection = collections
      .map((collection) => ({
        key: collection.id,
        title: collection.name,
        collectionName: collection.name,
        bookmarks: bookmarks.filter((bookmark) => bookmark.collectionId === collection.id),
      }))
      .filter((group) => group.bookmarks.length > 0)

    const uncategorised = bookmarks.filter((bookmark) => !bookmark.collectionId)

    return uncategorised.length > 0
      ? [...byCollection, { key: 'uncategorised', title: 'Uncategorised', collectionName: undefined, bookmarks: uncategorised }]
      : byCollection
  }, [bookmarks, collections])

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontSize: 24, fontWeight: 500, mb: 3 }}>
        All
      </Typography>

      {isLoading ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(240px, 1fr))' },
            gap: { xs: '10px', sm: '14px' },
          }}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" height={140} />
          ))}
        </Box>
      ) : (
        groups.map((group) => (
          <BookmarkGroupSection
            key={group.key}
            title={group.title}
            bookmarks={group.bookmarks}
            collectionName={group.collectionName}
          />
        ))
      )}
    </Box>
  )
}

export default AllPage
