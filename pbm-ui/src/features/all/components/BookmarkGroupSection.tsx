import { Box, Typography } from '@mui/material'
import type { Bookmark } from '../../bookmark/interfaces/bookmark.interface'
import BookmarkCard from '../../bookmark/components/BookmarkCard'

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(240px, 1fr))' },
  gap: { xs: '10px', sm: '14px' },
}

interface BookmarkGroupSectionProps {
  title: string
  bookmarks: Bookmark[]
  collectionName?: string
}

function BookmarkGroupSection({ title, bookmarks, collectionName }: BookmarkGroupSectionProps) {
  return (
    <Box component="section" sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
        <Typography variant="h6" component="h2" sx={{ fontSize: 18, fontWeight: 500 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
          {bookmarks.length} {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
        </Typography>
      </Box>

      <Box sx={GRID_SX}>
        {bookmarks.map((bookmark) => (
          <BookmarkCard key={bookmark.id} bookmark={bookmark} collectionName={collectionName} />
        ))}
      </Box>
    </Box>
  )
}

export default BookmarkGroupSection
