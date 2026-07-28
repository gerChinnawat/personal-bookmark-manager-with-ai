import { Navigate, Route, Routes } from 'react-router'
import AppShell from './components/layout/AppShell'
import AllPage from './pages/AllPage'
import BookmarksPage from './pages/BookmarksPage'
import CollectionsPage from './features/collection/screens/CollectionsPage'
import LoginPage from './pages/LoginPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/collections" replace />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/all" element={<AllPage />} />
      </Route>
    </Routes>
  )
}

export default App
