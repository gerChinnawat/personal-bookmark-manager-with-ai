import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App.tsx'
import theme from './theme.ts'
import Auth0ProviderWithNavigate from './features/auth/providers/Auth0ProviderWithNavigate.tsx'
import ApiAuthBridge from './features/auth/providers/ApiAuthBridge.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Auth0ProviderWithNavigate>
          <ApiAuthBridge>
            <App />
          </ApiAuthBridge>
        </Auth0ProviderWithNavigate>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
