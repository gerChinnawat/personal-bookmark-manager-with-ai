import { Box, Button, Skeleton, Typography } from '@mui/material'
import type { Collection } from '../interfaces/collection.interface'
import CollectionCard from './CollectionCard'

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(240px, 1fr))' },
  gap: { xs: '10px', sm: '14px' },
}

interface CollectionsGridProps {
  status: 'loading' | 'empty' | 'data'
  collections: Collection[]
  onOpen: (id: string) => void
  onShare: (id: string) => void
  onDelete: (id: string) => void
  onCreate: () => void
}

function CollectionsGrid({ status, collections, onOpen, onShare, onDelete, onCreate }: CollectionsGridProps) {
  if (status === 'loading') {
    return (
      <Box sx={GRID_SX}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" height={110} />
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
        <Typography sx={{ fontSize: 24 }}>□</Typography>
        <Typography sx={{ color: 'text.secondary' }}>No collections yet</Typography>
        <Button variant="contained" onClick={onCreate}>
          New collection
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={GRID_SX}>
      {collections.map((collection) => (
        <CollectionCard
          key={collection.id}
          collection={collection}
          onOpen={onOpen}
          onShare={onShare}
          onDelete={onDelete}
        />
      ))}
    </Box>
  )
}

export default CollectionsGrid
