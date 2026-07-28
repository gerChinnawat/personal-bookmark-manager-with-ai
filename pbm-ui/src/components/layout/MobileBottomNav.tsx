import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material'
import { useLocation, useNavigate } from 'react-router'
import { navItems } from './navItems'

function MobileBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const currentPath = navItems.find((item) => item.path === location.pathname)?.path ?? false

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1,
      }}
    >
      <BottomNavigation
        value={currentPath}
        onChange={(_event, newValue) => navigate(newValue)}
        showLabels
      >
        {navItems.map((item) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            value={item.path}
          />
        ))}
      </BottomNavigation>
    </Paper>
  )
}

export default MobileBottomNav
