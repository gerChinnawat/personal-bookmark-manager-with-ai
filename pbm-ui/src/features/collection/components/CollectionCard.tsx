import { Box, Card, IconButton, Typography } from '@mui/material'
import ShareIcon from '@mui/icons-material/Share'
import ClearIcon from '@mui/icons-material/Clear';
import type { Collection } from '../interfaces/collection.interface'
import { formatRelativeTime } from '../../../utils/relativeTime'

interface CollectionCardProps {
  collection: Collection
  onOpen: (id: string) => void
  onShare: (id: string) => void
  onDelete?: (id: string) => void
}

function CollectionCard({ collection, onOpen, onShare, onDelete }: CollectionCardProps) {
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
        <div>
          <IconButton
            size="small"
            aria-label={`Share ${collection.name}`}
            onClick={(event) => {
              event.stopPropagation()
              onShare(collection.id)
            }}
          >
            <Typography component="span" sx={{ fontSize: 7 }}>
              <ShareIcon fontSize="small" />
            </Typography>
          </IconButton>
          {onDelete && (
            <IconButton
              size="small"
              aria-label={`Delete ${collection.name}`}
              onClick={(event) => {
                event.stopPropagation()
                onDelete(collection.id)
              }}
            >
              <Typography component="span" sx={{ fontSize: 7 }}>
                <ClearIcon fontSize="small" />
              </Typography>
            </IconButton>
          )}
        </div>
      </Box>

      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
        Updated {formatRelativeTime(collection.updatedAt)}
      </Typography>
    </Card>
  )
}

export default CollectionCard
