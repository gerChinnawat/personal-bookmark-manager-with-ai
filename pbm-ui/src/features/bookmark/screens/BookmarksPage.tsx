import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import { createBookmark, deleteBookmark, fetchBookmarks } from '../services/bookmark.service'
import type { Bookmark } from '../interfaces/bookmark.interface'
import { fetchCollections } from '../../collection/services/collection.service'
import type { Collection } from '../../collection/interfaces/collection.interface'
import BookmarkFilterChips, { type FilterCollection } from '../components/BookmarkFilterChips'
import BookmarksGrid from '../components/BookmarksGrid'

const EMPTY_FORM = { url: '', title: '', notes: '', collectionId: '' }

function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterCollection>('all')

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const loadData = () => {
    setIsLoading(true)
    setError(null)
    Promise.all([fetchBookmarks(), fetchCollections()])
      .then(([bookmarkData, collectionData]) => {
        setBookmarks(bookmarkData)
        setCollections(collectionData)
      })
      .catch(() => setError('Could not load bookmarks.'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const collectionNameById = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection.name])),
    [collections],
  )

  const filteredBookmarks = useMemo(() => {
    if (filter === 'all') return bookmarks
    if (filter === 'none') return bookmarks.filter((bookmark) => !bookmark.collectionId)
    return bookmarks.filter((bookmark) => bookmark.collectionId === filter)
  }, [bookmarks, filter])

  const handleCreate = () => {
    setForm(EMPTY_FORM)
    setSaveError(null)
    setIsDialogOpen(true)
  }

  const handleDialogClose = () => {
    if (isSaving) return
    setIsDialogOpen(false)
  }

  const handleDialogSave = () => {
    const url = form.url.trim()
    const title = form.title.trim()
    if (!url || !title) return

    setIsSaving(true)
    setSaveError(null)
    createBookmark({
      url,
      title,
      notes: form.notes.trim() || undefined,
      collectionId: form.collectionId || undefined,
    })
      .then(() => {
        setIsDialogOpen(false)
        loadData()
      })
      .catch(() => setSaveError('Could not create the bookmark. Check the URL is http(s).'))
      .finally(() => setIsSaving(false))
  }

  const handleDelete = (id: string) => {
    const previous = bookmarks
    setBookmarks((current) => current.filter((bookmark) => bookmark.id !== id))
    deleteBookmark(id).catch(() => {
      setBookmarks(previous)
      setError('Could not delete the bookmark.')
    })
  }

  const status = isLoading ? 'loading' : filteredBookmarks.length === 0 ? 'empty' : 'data'

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontSize: 24, fontWeight: 500 }}>
          Bookmarks
        </Typography>
        <Button variant="contained" onClick={handleCreate}>
          New bookmark
        </Button>
      </Box>

      <BookmarkFilterChips collections={collections} filter={filter} onFilterChange={setFilter} />

      {error ? (
        <Typography sx={{ color: 'error.main' }}>{error}</Typography>
      ) : (
        <BookmarksGrid
          status={status}
          bookmarks={filteredBookmarks}
          collectionNameById={collectionNameById}
          onDelete={handleDelete}
        />
      )}

      <Dialog open={isDialogOpen} onClose={handleDialogClose} fullWidth maxWidth="xs">
        <DialogTitle>New bookmark</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="URL"
            placeholder="https://example.com"
            value={form.url}
            onChange={(event) => setForm((f) => ({ ...f, url: event.target.value }))}
            error={Boolean(saveError)}
            helperText={saveError}
            disabled={isSaving}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Title"
            value={form.title}
            onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
            disabled={isSaving}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Notes"
            multiline
            minRows={2}
            value={form.notes}
            onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value }))}
            disabled={isSaving}
          />
          <TextField
            fullWidth
            select
            margin="dense"
            label="Collection"
            value={form.collectionId}
            onChange={(event) => setForm((f) => ({ ...f, collectionId: event.target.value }))}
            disabled={isSaving}
          >
            <MenuItem value="">Uncategorised</MenuItem>
            {collections.map((collection) => (
              <MenuItem key={collection.id} value={collection.id}>
                {collection.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDialogSave}
            disabled={isSaving || !form.url.trim() || !form.title.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default BookmarksPage
