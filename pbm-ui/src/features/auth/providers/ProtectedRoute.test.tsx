import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { useAuth0 } from '@auth0/auth0-react'
import ProtectedRoute from './ProtectedRoute'

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: vi.fn(),
}))

const mockedUseAuth0 = vi.mocked(useAuth0)

function renderProtectedRoute(initialPath = '/collections') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/collections" element={<div>Collections page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('shows a spinner while Auth0 is still loading', () => {
    mockedUseAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    } as ReturnType<typeof useAuth0>)

    renderProtectedRoute()

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.queryByText('Collections page')).not.toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })

  it('renders the protected content when authenticated', () => {
    mockedUseAuth0.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    } as ReturnType<typeof useAuth0>)

    renderProtectedRoute()

    expect(screen.getByText('Collections page')).toBeInTheDocument()
  })

  it('redirects to /login, preserving the attempted path, when unauthenticated', () => {
    mockedUseAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    } as ReturnType<typeof useAuth0>)

    renderProtectedRoute('/collections')

    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Collections page')).not.toBeInTheDocument()
  })
})
