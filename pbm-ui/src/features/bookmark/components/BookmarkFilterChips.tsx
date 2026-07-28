import { Box, Chip } from '@mui/material'
import type { Collection } from '../../collection/interfaces/collection.interface'

export type FilterCollection = 'all' | 'none' | string

interface BookmarkFilterChipsProps {
  collections: Collection[]
  filter: FilterCollection
  onFilterChange: (filter: FilterCollection) => void
}

function BookmarkFilterChips({ collections, filter, onFilterChange }: BookmarkFilterChipsProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        pb: 0.5,
        mb: 2,
      }}
    >
      <Chip
        label="All"
        clickable
        color={filter === 'all' ? 'primary' : undefined}
        variant={filter === 'all' ? 'filled' : 'outlined'}
        onClick={() => onFilterChange('all')}
      />
      <Chip
        label="Uncategorised"
        clickable
        color={filter === 'none' ? 'primary' : undefined}
        variant={filter === 'none' ? 'filled' : 'outlined'}
        onClick={() => onFilterChange('none')}
      />
      {collections.map((collection) => (
        <Chip
          key={collection.id}
          label={collection.name}
          clickable
          color={filter === collection.id ? 'primary' : undefined}
          variant={filter === collection.id ? 'filled' : 'outlined'}
          onClick={() => onFilterChange(collection.id)}
          sx={{ flexShrink: 0 }}
        />
      ))}
    </Box>
  )
}

export default BookmarkFilterChips
