import React from 'react'
import CostosTable from './components/CostosTable'
import ProtectedRoute from './components/ProtectedRoute'
import AuthModal from './components/AuthModal'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './hooks/useTheme.jsx'

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="costos-theme">
      <AuthProvider>
        <ProtectedRoute>
          <CostosTable />
        </ProtectedRoute>
        <AuthModal />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App