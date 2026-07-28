import { Box, Typography, IconButton } from '@mui/material'
import { NavLink } from 'react-router'
import { navItems } from './navItems'

const USER_EMAIL = 'candidate@test.com'
const USER_INITIALS = 'CT'

function Sidebar() {
  return (
    <Box
      component="nav"
      sx={{
        width: 212,
        flexShrink: 0,
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 2.5 }}>
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: '4px',
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#fff' }} />
        </Box>
        <Typography sx={{ fontWeight: 500, fontSize: 15, color: 'text.primary' }}>
          readlater
        </Typography>
      </Box>

      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {navItems.map((item) => (
          <Box component="li" key={item.path}>
            <NavLink
              to={item.path}
              style={{ textDecoration: 'none' }}
            >
              {({ isActive }) => (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    px: 2,
                    py: 1.25,
                    mx: 1,
                    borderRadius: '4px',
                    bgcolor: isActive ? 'rgba(25,118,210,0.08)' : 'transparent',
                  }}
                >
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: isActive ? 'primary.main' : '#D8D4C9',
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? 'text.primary' : 'text.secondary',
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              )}
            </NavLink>
          </Box>
        ))}
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: 'rgba(25,118,210,0.12)',
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {USER_INITIALS}
        </Box>
        <Typography
          sx={{
            fontSize: 12,
            color: 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flexGrow: 1,
          }}
        >
          {USER_EMAIL}
        </Typography>
        <IconButton size="small" aria-label="Sign out">
          <Typography component="span" sx={{ fontSize: 14, color: 'text.secondary' }}>
            ↰
          </Typography>
        </IconButton>
      </Box>
    </Box>
  )
}

export default Sidebar
