import React from 'react'
import CostosTable from './components/CostosTable'
import { ThemeProvider } from './hooks/useTheme.jsx'

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="costos-theme">
      <CostosTable />
    </ThemeProvider>
  )
}

export default App