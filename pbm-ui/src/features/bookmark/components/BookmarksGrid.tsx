import { Box, Skeleton, Typography } from '@mui/material'
import type { Bookmark } from '../interfaces/bookmark.interface'
import BookmarkCard from './BookmarkCard'

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(240px, 1fr))' },
  gap: { xs: '10px', sm: '14px' },
}

interface BookmarksGridProps {
  status: 'loading' | 'empty' | 'data'
  bookmarks: Bookmark[]
  collectionNameById: Map<string, string>
  onDelete?: (id: string) => void
}

function BookmarksGrid({ status, bookmarks, collectionNameById, onDelete }: BookmarksGridProps) {
  if (status === 'loading') {
    return (
      <Box sx={GRID_SX}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" height={140} />
        ))}
      </Box>
    )
  }

  if (status === 'empty') {
    return (
      <Box
        sx={{
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1,
          p: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Typography sx={{ fontSize: 24 }}>🔗</Typography>
        <Typography sx={{ color: 'text.secondary' }}>No bookmarks here</Typography>
      </Box>
    )
  }

  return (
    <Box sx={GRID_SX}>
      {bookmarks.map((bookmark) => (
        <BookmarkCard
          key={bookmark.id}
          bookmark={bookmark}
          collectionName={bookmark.collectionId ? collectionNameById.get(bookmark.collectionId) : undefined}
          onDelete={onDelete}
        />
      ))}
    </Box>
  )
}

export default BookmarksGrid
