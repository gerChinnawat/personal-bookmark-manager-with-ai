import { Box, Button, Paper, Typography } from '@mui/material'

function LoginPage() {
  const handleContinueWithAuth0 = () => {
    // Wired up once Auth0 (Authorization Code + PKCE) integration exists.
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          width: 340,
          maxWidth: '100%',
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: '4px',
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1.5,
          }}
        >
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#fff' }} />
        </Box>

        <Typography sx={{ fontWeight: 500, fontSize: 15, color: 'text.primary', mb: 3 }}>
          readlater
        </Typography>

        <Typography variant="h5" component="h1" sx={{ fontSize: 20, fontWeight: 500, mb: 1 }}>
          Sign in
        </Typography>

        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 3 }}>
          Private bookmarks. Only you can see what you save.
        </Typography>

        <Button
          variant="contained"
          fullWidth
          onClick={handleContinueWithAuth0}
        >
          Continue with Auth0
        </Button>

        <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 2 }}>
          Authorization Code + PKCE · candidate@test.com
        </Typography>
      </Paper>
    </Box>
  )
}

export default LoginPage
