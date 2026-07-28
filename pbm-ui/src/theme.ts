import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      dark: '#115293',
    },
    error: {
      main: '#d32f2f',
    },
    text: {
      primary: 'rgba(0,0,0,0.87)',
      secondary: 'rgba(0,0,0,0.6)',
      disabled: 'rgba(0,0,0,0.38)',
    },
    divider: 'rgba(0,0,0,0.12)',
    background: {
      default: '#fafafa',
      paper: '#fff',
    },
  },
  shape: {
    borderRadius: 4,
  },
  typography: {
    fontFamily: "'Roboto','Helvetica Neue',Arial,sans-serif",
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        outlined: {
          borderColor: 'rgba(0,0,0,0.5)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 1,
      },
    },
  },
})

export default theme
