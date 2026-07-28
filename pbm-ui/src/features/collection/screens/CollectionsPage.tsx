import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import { createCollection, deleteCollection, fetchCollections } from '../services/collection.service'
import type { Collection } from '../interfaces/collection.interface'
import CollectionsGrid from '../components/CollectionsGrid'
import ShareDialog from '../components/ShareDialog'

function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [shareCollectionId, setShareCollectionId] = useState<string | null>(null)

  const loadCollections = () => {
    Promise.resolve()
      .then(() => {
        setIsLoading(true)
        setError(null)
        return fetchCollections()
      })
      .then((data) => setCollections(data))
      .catch(() => setError('Could not load collections.'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadCollections()
  }, [])

  const handleCreate = () => {
    setNewName('')
    setSaveError(null)
    setIsDialogOpen(true)
  }

  const handleOpen = (id: string) => {
    void id
    // Wired up once the collection detail route exists.
  }

  const handleShare = (id: string) => {
    setShareCollectionId(id)
  }

  const handleShareChange = (id: string, patch: Partial<Collection>) => {
    setCollections((current) =>
      current.map((collection) => (collection.id === id ? { ...collection, ...patch } : collection)),
    )
  }

  const handleDelete = (id: string) => {
    const previous = collections
    setCollections((current) => current.filter((collection) => collection.id !== id))
    deleteCollection(id).catch(() => {
      setCollections(previous)
      setError('Could not delete the collection.')
    })
  }

  const handleDialogClose = () => {
    if (isSaving) return
    setIsDialogOpen(false)
  }

  const handleDialogSave = () => {
    const name = newName.trim()
    if (!name) return

    setIsSaving(true)
    setSaveError(null)
    createCollection(name)
      .then(() => {
        setIsDialogOpen(false)
        loadCollections()
      })
      .catch(() => setSaveError('Could not create the collection.'))
      .finally(() => setIsSaving(false))
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

      {error ? (
        <Typography sx={{ color: 'error.main' }}>{error}</Typography>
      ) : (
        <CollectionsGrid
          status={status}
          collections={collections}
          onOpen={handleOpen}
          onShare={handleShare}
          onDelete={handleDelete}
          onCreate={handleCreate}
        />
      )}

      <Dialog open={isDialogOpen} onClose={handleDialogClose} fullWidth maxWidth="xs">
        <DialogTitle>New collection</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            error={Boolean(saveError)}
            helperText={saveError}
            disabled={isSaving}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleDialogSave()
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDialogSave}
            disabled={isSaving || !newName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <ShareDialog
        collection={collections.find((collection) => collection.id === shareCollectionId) ?? null}
        onClose={() => setShareCollectionId(null)}
        onChange={handleShareChange}
      />
    </Box>
  )
}

export default CollectionsPage
