import { Navigate, Route, Routes } from 'react-router'
import AppShell from './components/layout/AppShell'
import AllPage from './features/all/screens/AllPage'
import BookmarksPage from './features/bookmark/screens/BookmarksPage'
import CollectionsPage from './features/collection/screens/CollectionsPage'
import LoginPage from './features/auth/screens/LoginPage'
import ProtectedRoute from './features/auth/providers/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/collections" replace />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/all" element={<AllPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
