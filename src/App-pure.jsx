import React from 'react'
import CostosTablePure from './components/CostosTablePure'
import { ThemeProvider } from './hooks/useTheme.jsx'
import './index-pure.css'

function AppPure() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="costos-theme">
      <CostosTablePure />
    </ThemeProvider>
  )
}

export default AppPure