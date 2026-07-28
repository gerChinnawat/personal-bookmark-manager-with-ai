import { Box, Card, IconButton, Typography } from '@mui/material'
import type { Collection } from '../interfaces/collection.interface'
import { formatRelativeTime } from '../../../utils/relativeTime'

interface CollectionCardProps {
  collection: Collection
  onOpen: (id: string) => void
  onShare: (id: string) => void
}

function CollectionCard({ collection, onOpen, onShare }: CollectionCardProps) {
  return (
    <Card
      variant="elevation"
      elevation={1}
      onClick={() => onOpen(collection.id)}
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="h3" sx={{ fontSize: 16, fontWeight: 500 }}>
          {collection.name}
        </Typography>
        <IconButton
          size="small"
          aria-label={`Share ${collection.name}`}
          onClick={(event) => {
            event.stopPropagation()
            onShare(collection.id)
          }}
        >
          <Typography component="span" sx={{ fontSize: 14 }}>
            ↗
          </Typography>
        </IconButton>
      </Box>

      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
        {collection.count} {collection.count === 1 ? 'bookmark' : 'bookmarks'} · Updated{' '}
        {formatRelativeTime(collection.updatedAt)}
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
        {collection.colorSwatches.map((color, index) => (
          <Box
            key={`${collection.id}-swatch-${index}`}
            sx={{
              width: 16,
              height: 6,
              borderRadius: '2px',
              bgcolor: color,
            }}
          />
        ))}
      </Box>
    </Card>
  )
}

export default CollectionCard
