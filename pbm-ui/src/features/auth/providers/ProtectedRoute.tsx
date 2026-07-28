import { Box, CircularProgress } from '@mui/material'
import { useAuth0 } from '@auth0/auth0-react'
import { Navigate, Outlet, useLocation } from 'react-router'

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth0()
  const location = useLocation()

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ returnTo: location.pathname }} />
    )
  }

  return <Outlet />
}

export default ProtectedRoute
