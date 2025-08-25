import React, { useEffect, useState } from 'react'
import CostosTable from './components/CostosTable'
import ApprovalPage from './components/ApprovalPage'
import ProtectedRoute from './components/ProtectedRoute'
import AuthModal from './components/AuthModal'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './hooks/useTheme.jsx'

function App() {
  const [isApprovalPage, setIsApprovalPage] = useState(false)

  // Detectar si es una página de aprobación
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const approvalId = urlParams.get('approval_id')
    
    if (approvalId) {
      console.log('🔐 Detectada página de aprobación, saltando autenticación')
      setIsApprovalPage(true)
    } else {
      setIsApprovalPage(false)
    }
  }, [])

  return (
    <ThemeProvider defaultTheme="light" storageKey="costos-theme">
      <AuthProvider>
        {isApprovalPage ? (
          // Página de aprobación sin autenticación requerida
          <ApprovalPage />
        ) : (
          // Aplicación normal con autenticación requerida
          <>
            <ProtectedRoute>
              <CostosTable />
            </ProtectedRoute>
            <AuthModal />
          </>
        )}
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App