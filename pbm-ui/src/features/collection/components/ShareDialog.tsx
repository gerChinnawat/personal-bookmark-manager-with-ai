import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import type { Collection } from '../interfaces/collection.interface'
import { disableShare, enableShare } from '../services/collection.service'

interface ShareDialogProps {
  collection: Collection | null
  onClose: () => void
  onChange: (id: string, patch: Partial<Collection>) => void
}

function ShareDialog({ collection, onClose, onChange }: ShareDialogProps) {
  const [isToggling, setIsToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Promise.resolve().then(() => {
      setError(null)
      setCopied(false)
    })
  }, [collection?.id])

  if (!collection) return null

  const shareUrl = collection.shareToken
    ? `${window.location.origin}/share/${collection.shareToken}`
    : ''

  const handleToggle = (checked: boolean) => {
    setIsToggling(true)
    setError(null)
    const request = checked ? enableShare(collection.id) : disableShare(collection.id)
    request
      .then((result) => {
        onChange(collection.id, {
          shareEnabled: checked,
          shareToken: checked ? (result as { shareToken: string }).shareToken : collection.shareToken,
        })
      })
      .catch(() => setError(checked ? 'Could not enable sharing.' : 'Could not disable sharing.'))
      .finally(() => setIsToggling(false))
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
    })
  }

  return (
    <Dialog open={Boolean(collection)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Share "{collection.name}"</DialogTitle>
      <DialogContent>
        <FormControlLabel
          control={
            <Switch
              checked={collection.shareEnabled}
              disabled={isToggling}
              onChange={(event) => handleToggle(event.target.checked)}
            />
          }
          label="Anyone with the link can view this collection"
        />

        {error && (
          <Typography sx={{ color: 'error.main', fontSize: 13, mt: 1 }}>{error}</Typography>
        )}

        {collection.shareEnabled && shareUrl && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <TextField
              fullWidth
              size="small"
              value={shareUrl}
              slotProps={{ input: { readOnly: true } }}
              onFocus={(event) => event.target.select()}
            />
            <Button variant="outlined" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  )
}

export default ShareDialog
