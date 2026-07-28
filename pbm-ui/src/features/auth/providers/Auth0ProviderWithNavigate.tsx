import type { ReactNode } from 'react'
import { Auth0Provider, type AppState } from '@auth0/auth0-react'
import { useNavigate } from 'react-router'

const domain = import.meta.env.VITE_AUTH0_DOMAIN
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID
const audience = import.meta.env.VITE_AUTH0_AUDIENCE

function Auth0ProviderWithNavigate({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo ?? '/', { replace: true })
  }

  if (!(domain && clientId && audience)) {
    throw new Error(
      'Missing Auth0 config: set VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, VITE_AUTH0_AUDIENCE',
    )
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        // Auth0's app config has a fixed callback of http://localhost:3000/callback
        // ("Callback URL mismatch" otherwise — confirmed live, DECISIONS.md ADR-010).
        redirect_uri: `${window.location.origin}/callback`,
        audience,
      }}
      // Default cacheLocation ("memory") loses the session on every full
      // page reload — confirmed live (DECISIONS.md ADR-011). localStorage
      // persists the cached token across reloads without depending on a
      // refresh-token grant this Auth0 client may not have enabled.
      cacheLocation="localstorage"
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  )
}

export default Auth0ProviderWithNavigate
