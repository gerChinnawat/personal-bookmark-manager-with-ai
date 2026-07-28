import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { Box, CircularProgress, Typography } from '@mui/material'
import { fetchSharedCollection } from '../services/collection.service'
import { fetchSharedBookmarks } from '../../bookmark/services/bookmark.service'
import type { Collection } from '../interfaces/collection.interface'
import type { Bookmark } from '../../bookmark/interfaces/bookmark.interface'
import BookmarkCard from '../../bookmark/components/BookmarkCard'

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(240px, 1fr))' },
  gap: { xs: '10px', sm: '14px' },
}

function SharedCollectionPage() {
  const { token } = useParams<{ token: string }>()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [status, setStatus] = useState<'loading' | 'not-found' | 'data'>('loading')

  useEffect(() => {
    Promise.resolve()
      .then(() => {
        if (!token) {
          setStatus('not-found')
          return null
        }
        setStatus('loading')
        return Promise.all([fetchSharedCollection(token), fetchSharedBookmarks(token)])
      })
      .then((result) => {
        if (!result) return
        const [collectionData, bookmarkData] = result
        setCollection(collectionData)
        setBookmarks(bookmarkData)
        setStatus('data')
      })
      .catch(() => setStatus('not-found'))
  }, [token])

  if (status === 'loading') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (status === 'not-found' || !collection) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ color: 'text.secondary' }}>
          This link doesn't exist, or sharing has been turned off.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', p: { xs: 2, sm: 4 } }}>
      <Typography variant="h4" component="h1" sx={{ fontSize: 24, fontWeight: 500, mb: 3 }}>
        {collection.name}
      </Typography>

      {bookmarks.length === 0 ? (
        <Typography sx={{ color: 'text.secondary' }}>No bookmarks in this collection yet.</Typography>
      ) : (
        <Box sx={GRID_SX}>
          {bookmarks.map((bookmark) => (
            <BookmarkCard key={bookmark.id} bookmark={bookmark} collectionName={collection.name} />
          ))}
        </Box>
      )}
    </Box>
  )
}

export default SharedCollectionPage
