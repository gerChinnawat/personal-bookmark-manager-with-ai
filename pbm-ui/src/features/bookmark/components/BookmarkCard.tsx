import { Box, Card, Chip, Typography } from '@mui/material'
import type { Bookmark } from '../interfaces/bookmark.interface'
import { formatRelativeTime } from '../../../utils/relativeTime'

interface BookmarkCardProps {
  bookmark: Bookmark
  collectionName?: string
}

function BookmarkCard({ bookmark, collectionName }: BookmarkCardProps) {
  const initial = (bookmark.domain || '?').charAt(0).toUpperCase()

  return (
    <Card
      variant="elevation"
      elevation={1}
      component="a"
      href={bookmark.url}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxSizing: 'border-box',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: '4px',
            bgcolor: 'rgba(25,118,210,0.12)',
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initial}
        </Box>
        <Typography
          sx={{
            fontSize: 11.5,
            color: 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {bookmark.domain}
        </Typography>
      </Box>

      <Typography
        component="h4"
        sx={{ fontSize: 14, fontWeight: 500, color: 'text.primary', m: 0, mb: 0.75, lineHeight: 1.35 }}
      >
        {bookmark.title}
      </Typography>

      {bookmark.notes && (
        <Typography
          sx={{
            fontSize: 12.5,
            color: 'text.secondary',
            m: 0,
            mb: 1.25,
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {bookmark.notes}
        </Typography>
      )}

      <Box sx={{ flex: 1 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.75, gap: 1 }}>
        {collectionName ? (
          <Chip
            label={collectionName}
            size="small"
            sx={{
              fontSize: 11,
              fontWeight: 500,
              color: 'primary.main',
              bgcolor: 'rgba(25,118,210,0.08)',
              height: 'auto',
              '& .MuiChip-label': { px: 1.125, py: 0.375 },
            }}
          />
        ) : (
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Uncategorised</Typography>
        )}
        <Typography sx={{ fontSize: 11, color: 'text.disabled', whiteSpace: 'nowrap' }}>
          {formatRelativeTime(bookmark.updatedAt)}
        </Typography>
      </Box>
    </Card>
  )
}

export default BookmarkCard
