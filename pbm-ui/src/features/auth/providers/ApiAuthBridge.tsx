import { useEffect, type ReactNode } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import apiService from '../../../services/api.service'

// Feeds the Auth0 access token into apiService's axios interceptor, and
// sends the user back through the login redirect on a 401 (expired/revoked
// token) rather than leaving them stuck on a broken page.
function ApiAuthBridge({ children }: { children: ReactNode }) {
  const { getAccessTokenSilently, loginWithRedirect, isAuthenticated } = useAuth0()

  useEffect(() => {
    apiService.registerTokenGetter(async () => {
      if (!isAuthenticated) return null
      try {
        return await getAccessTokenSilently()
      } catch {
        return null
      }
    })

    apiService.registerUnauthorizedHandler(() => {
      loginWithRedirect({
        appState: { returnTo: window.location.pathname },
      })
    })
  }, [getAccessTokenSilently, loginWithRedirect, isAuthenticated])

  return <>{children}</>
}

export default ApiAuthBridge
