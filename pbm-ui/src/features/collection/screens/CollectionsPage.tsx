import { useEffect, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { fetchCollections } from '../services/collection.service'
import type { Collection } from '../interfaces/collection.interface'
import CollectionsGrid from '../components/CollectionsGrid'

function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetchCollections().then((data) => {
      if (!cancelled) {
        setCollections(data)
        setIsLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const handleCreate = () => {
    // Wired up once the New Collection modal exists.
  }

  const handleOpen = (id: string) => {
    void id
    // Wired up once the collection detail route exists.
  }

  const handleShare = (id: string) => {
    void id
    // Wired up once the Share modal exists.
  }

  const status = isLoading ? 'loading' : collections.length === 0 ? 'empty' : 'data'

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: 24, fontWeight: 500 }}>
          Collections
        </Typography>
        <Button variant="contained" onClick={handleCreate}>
          New collection
        </Button>
      </Box>

      <CollectionsGrid
        status={status}
        collections={collections}
        onOpen={handleOpen}
        onShare={handleShare}
        onCreate={handleCreate}
      />
    </Box>
  )
}

export default CollectionsPage
