import { Box, useMediaQuery, useTheme } from '@mui/material'
import { Outlet } from 'react-router'
import Sidebar from './Sidebar'
import MobileBottomNav from './MobileBottomNav'

function AppShell() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'))

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {isDesktop && <Sidebar />}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            px: { xs: '16px', sm: '32px' },
            py: { xs: '18px', sm: '40px' },
          }}
        >
          <Outlet />
        </Box>

        {!isDesktop && <MobileBottomNav />}
      </Box>
    </Box>
  )
}

export default AppShell
