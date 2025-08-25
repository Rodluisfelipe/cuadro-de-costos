import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, ArrowLeft, Home } from 'lucide-react'
import PinValidationModal from './PinValidationModal.jsx'
import { useCotizaciones } from '../hooks/useCotizaciones.jsx'
import { validatePinFormat } from '../lib/pinUtils.js'
import { formatCurrency } from '../lib/utils'

// URL base de la aplicación desplegada
const APP_BASE_URL = 'https://cuadro-de-costos.vercel.app'

const ApprovalPage = () => {
  const [approvalId, setApprovalId] = useState(null)
  const [showPinValidation, setShowPinValidation] = useState(false)
  const [pinAttempts, setPinAttempts] = useState(0)
  const [approvalQuote, setApprovalQuote] = useState(null)
  const [showApprovalView, setShowApprovalView] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState({})
  const [itemComments, setItemComments] = useState({})
  const [loading, setLoading] = useState(true)

  const { getCotizacionById, saveCotizacion } = useCotizaciones()

  // Detectar approval_id en la URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const approvalIdFromUrl = urlParams.get('approval_id')
    
    if (approvalIdFromUrl) {
      console.log('🔐 Página de aprobación cargada para:', approvalIdFromUrl)
      setApprovalId(approvalIdFromUrl)
      setShowPinValidation(true)
      setLoading(false)
    } else {
      // No hay approval_id, redirigir a la página principal
      setLoading(false)
    }
  }, [])

  // Validar PIN de seguridad
  const validateSecurityPin = async (enteredPin) => {
    try {
      if (!approvalId) {
        console.error('❌ No hay ID de aprobación')
        return false
      }

      console.log('🔐 Validando PIN para cotización:', approvalId)
      
      // Obtener la cotización de la base de datos
      const quote = await getCotizacionById(approvalId)
      
      if (!quote) {
        console.error('❌ Cotización no encontrada:', approvalId)
        alert('Error: Cotización no encontrada')
        return false
      }

      // Verificar si la cotización tiene PIN de seguridad
      if (!quote.securityPin || !quote.securityPin.pin) {
        console.error('❌ Cotización sin PIN de seguridad')
        alert('Error: Esta cotización no tiene un PIN de seguridad configurado')
        return false
      }

      // Validar formato del PIN ingresado
      if (!validatePinFormat(enteredPin)) {
        console.error('❌ Formato de PIN inválido')
        return false
      }

      // Comparar PINs
      const isValidPin = enteredPin === quote.securityPin.pin
      
      if (isValidPin) {
        console.log('✅ PIN válido - cargando cotización')
        
        // Actualizar estadísticas de uso del PIN
        try {
          const updatedSecurityPin = {
            ...quote.securityPin,
            usageCount: (quote.securityPin.usageCount || 0) + 1,
            lastUsed: new Date().toISOString()
          }
          
          await saveCotizacion({
            id: quote.id,
            securityPin: updatedSecurityPin
          })
        } catch (error) {
          console.warn('⚠️ Error actualizando estadísticas de PIN:', error)
          // No fallar la validación por esto
        }
        
        // Cargar la cotización para aprobación
        setShowPinValidation(false)
        setPinAttempts(0)
        setApprovalQuote(quote)
        setShowApprovalView(true)
        
        return true
      } else {
        console.log('❌ PIN incorrecto')
        setPinAttempts(prev => prev + 1)
        return false
      }
      
    } catch (error) {
      console.error('❌ Error validando PIN:', error)
      alert('Error al validar el PIN. Intenta de nuevo.')
      return false
    }
  }

  // Función para agrupar filas por productos (similar a CostosTable)
  const getGroupedApprovalRows = (rows) => {
    if (!rows || rows.length === 0) return []

    const itemsMap = new Map()

    rows.forEach(row => {
      const itemId = row.itemId || `item-${row.id}`
      const itemName = row.itemName || `Producto ${row.item}`
      
      if (!itemsMap.has(itemId)) {
        itemsMap.set(itemId, {
          item: {
            id: itemId,
            name: itemName,
            description: row.itemDescription || ''
          },
          options: []
        })
      }
      
      itemsMap.get(itemId).options.push(row)
    })

    return Array.from(itemsMap.values())
  }

  // Manejar aprobación
  const handleApproval = async (approved) => {
    if (!approvalQuote) return

    let updatedQuote = { ...approvalQuote }

    if (approved) {
      // APROBACIÓN: Verificar que se hayan seleccionado opciones
      const groupedRows = getGroupedApprovalRows(approvalQuote.rows)
      const hasAllSelections = groupedRows.every(group => selectedOptions[group.item.id])
      
      if (!hasAllSelections) {
        alert('Por favor selecciona una opción para cada producto antes de aprobar.')
        return
      }

      // Crear filas finales con solo las opciones seleccionadas
      const selectedRows = []
      groupedRows.forEach(group => {
        const selectedRowId = selectedOptions[group.item.id]
        const selectedRow = group.options.find(row => row.id === selectedRowId)
        if (selectedRow) {
          selectedRows.push(selectedRow)
        }
      })

      // Calcular nuevo total
      const newTotal = selectedRows.reduce((sum, row) => sum + (row.pvpTotal || 0), 0)

      // Actualizar cotización con opciones seleccionadas
      updatedQuote = {
        ...approvalQuote,
        rows: selectedRows,
        totalGeneral: newTotal,
        status: 'approved',
        selectedOptions: selectedOptions,
        itemComments: itemComments,
        approvalDate: new Date().toISOString(),
        approvalDateFormatted: new Date().toLocaleString('es-CO')
      }

      console.log('✅ Cotización aprobada con opciones seleccionadas')

    } else {
      // RE-COTIZACIÓN: Recopilar comentarios
      const groupedRows = getGroupedApprovalRows(approvalQuote.rows)
      const hasComments = Object.values(itemComments).some(comment => comment && comment.trim())
      
      if (!hasComments) {
        alert('Por favor añade comentarios específicos para orientar la re-cotización.')
        return
      }

      // Actualizar cotización con comentarios
      updatedQuote = {
        ...approvalQuote,
        status: 'revision_requested',
        itemComments: itemComments,
        revisionDate: new Date().toISOString(),
        revisionDateFormatted: new Date().toLocaleString('es-CO')
      }

      console.log('🔄 Re-cotización solicitada con comentarios')
    }
    
    try {
      // Guardar en base de datos
      const existingQuote = await getCotizacionById(approvalQuote.cotizacion_id)
      
      if (existingQuote) {
        await saveCotizacion({
          id: existingQuote.id,
          ...existingQuote,
          ...updatedQuote,
          cotizacion_id: existingQuote.cotizacion_id,
          date: existingQuote.date,
          dateFormatted: existingQuote.dateFormatted,
          createdAt: existingQuote.createdAt,
          updatedAt: new Date().toISOString()
        })
        console.log('✅ Cotización actualizada con ID:', existingQuote.id)
      } else {
        await saveCotizacion(updatedQuote)
        console.log('✅ Nueva cotización creada')
      }
      
      console.log(`✅ Cotización ${approvalQuote.cotizacion_id} ${approved ? 'aprobada' : 'enviada a revisión'}`)
      
      // Mostrar mensaje de éxito
      alert(approved 
        ? '✅ Cotización aprobada correctamente. El vendedor será notificado automáticamente.' 
        : '🔄 Solicitud de re-cotización enviada. El vendedor será notificado automáticamente.'
      )
      
      // Redirigir a página de éxito
      setShowApprovalView(false)
      setApprovalQuote(null)
      
    } catch (error) {
      console.error('❌ Error guardando estado:', error)
      alert('❌ Error al procesar la respuesta. Por favor intenta de nuevo.')
    }
  }

  // Si está cargando
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            🔐 Cargando página de aprobación...
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Por favor espera un momento
          </p>
        </div>
      </div>
    )
  }

  // Si no hay approval_id, mostrar error
  if (!approvalId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Enlace No Válido
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Este enlace no contiene una cotización válida para aprobación.
            </p>
            
            <button
              onClick={() => window.location.href = APP_BASE_URL}
              className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              Ir a la Página Principal
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Si ya se validó el PIN y se cargó la cotización, mostrar vista de aprobación
  if (showApprovalView && approvalQuote) {
    const groupedRows = getGroupedApprovalRows(approvalQuote.rows)
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  🔍 Aprobación de Cotización
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Cliente: {approvalQuote.clienteName} • ID: {approvalQuote.cotizacion_id}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(approvalQuote.totalGeneral || 0)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Total General
                </div>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div className="space-y-4 mb-6">
            {groupedRows.map((group, groupIndex) => (
              <div key={group.item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  📦 {group.item.name}
                </h3>
                
                <div className="space-y-3">
                  {group.options.map((option, optionIndex) => (
                    <div 
                      key={option.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedOptions[group.item.id] === option.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedOptions(prev => ({
                        ...prev,
                        [group.item.id]: option.id
                      }))}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              selectedOptions[group.item.id] === option.id
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {selectedOptions[group.item.id] === option.id && (
                                <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                              )}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {option.mayorista}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div><strong>Marca:</strong> {option.marca}</div>
                            <div><strong>Referencia:</strong> {option.referencia}</div>
                            <div><strong>Configuración:</strong> {option.configuracion}</div>
                            <div><strong>Cantidad:</strong> {option.cantidad}</div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-xl font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(option.pvpTotal || 0)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Total
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comentarios */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Comentarios para este producto:
                  </label>
                  <textarea
                    value={itemComments[group.item.id] || ''}
                    onChange={(e) => setItemComments(prev => ({
                      ...prev,
                      [group.item.id]: e.target.value
                    }))}
                    placeholder="Agregar comentarios específicos para este producto..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Botones de Acción */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => handleApproval(true)}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
              >
                ✅ Aprobar Cotización
              </button>
              
              <button
                onClick={() => handleApproval(false)}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors"
              >
                🔄 Solicitar Re-cotización
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Mostrar modal de PIN por defecto
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <PinValidationModal
        isOpen={showPinValidation}
        onValidate={validateSecurityPin}
        onClose={() => {
          setShowPinValidation(false)
          setPinAttempts(0)
          // Redirigir a la página principal si se cancela
          window.location.href = APP_BASE_URL
        }}
        clienteName={approvalQuote?.clienteName || 'Cliente'}
        cotizacionId={approvalId}
        attempts={pinAttempts}
        maxAttempts={3}
      />
    </div>
  )
}

export default ApprovalPage
