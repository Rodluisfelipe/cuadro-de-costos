import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useCotizaciones } from '../hooks/useCotizaciones'
import { purchaseService } from '../lib/purchaseService'

const BuyerPanel = () => {
  const { userProfile, userRole, checkPermission } = useAuth()
  const { cotizaciones, refreshCotizaciones } = useCotizaciones()
  const [approvedQuotes, setApprovedQuotes] = useState([])
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingPrices, setEditingPrices] = useState({})

  // Filtrar solo cotizaciones aprobadas
  useEffect(() => {
    if (cotizaciones) {
      const approved = cotizaciones.filter(quote => 
        quote.approvalStatus === 'approved' && 
        quote.approvedOptions && 
        quote.approvedOptions.length > 0
      )
      setApprovedQuotes(approved)
      setLoading(false)
    }
  }, [cotizaciones])

  // Verificar permisos
  if (!checkPermission('view_approved_quotes')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder al panel de comprador.</p>
        </div>
      </div>
    )
  }

  // Función para formatear ID de cotización
  const formatQuoteId = (id) => {
    if (!id) return 'N/A'
    if (typeof id === 'string') {
      return id.length > 8 ? id.slice(-8) : id
    }
    return id.toString()
  }

  // Función para calcular diferencia de margen usando el servicio
  const calculateMarginDifference = (originalPrice, finalPrice, margin) => {
    return purchaseService.calculateMarginDifference(originalPrice, finalPrice, margin)
  }

  // Función para actualizar precio final
  const updateFinalPrice = async (quoteId, itemIndex, newPrice) => {
    try {
      if (!userProfile) {
        throw new Error('Usuario no válido')
      }

      // Validar permisos
      purchaseService.validateBuyerPermissions(userProfile)

      // Actualizar precio en Firebase
      const result = await purchaseService.updateFinalPurchasePrice(
        quoteId, 
        itemIndex, 
        newPrice, 
        userProfile
      )

      if (result.success) {
        // Actualizar estado local
        setEditingPrices(prev => ({
          ...prev,
          [`${quoteId}-${itemIndex}`]: newPrice
        }))

        // Refrescar cotizaciones para mostrar datos actualizados
        refreshCotizaciones()

        // Mostrar mensaje de éxito (aquí se puede agregar un toast)
        console.log('✅ Precio final actualizado exitosamente')
      }

    } catch (error) {
      console.error('❌ Error actualizando precio:', error)
      // Aquí se puede mostrar un mensaje de error al usuario
      alert(`Error: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando cotizaciones aprobadas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="text-3xl mr-3">🛒</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Panel de Comprador</h1>
                <p className="text-sm text-gray-600">
                  Gestiona precios finales de cotizaciones aprobadas
                </p>
              </div>
            </div>
            
            {/* Estadísticas rápidas */}
            <div className="flex space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{approvedQuotes.length}</div>
                <div className="text-xs text-gray-500">Cotizaciones Aprobadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {approvedQuotes.reduce((acc, quote) => 
                    acc + (quote.approvedOptions?.length || 0), 0
                  )}
                </div>
                <div className="text-xs text-gray-500">Items Aprobados</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {approvedQuotes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay cotizaciones aprobadas
            </h3>
            <p className="text-gray-600">
              Las cotizaciones aprobadas por el revisor aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {approvedQuotes.map((quote) => (
              <div key={quote.id} className="bg-white rounded-lg shadow-sm border">
                {/* Header de la cotización */}
                <div className="p-6 border-b bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Cotización #{formatQuoteId(quote.id)}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Cliente: {quote.customerName || 'Cliente no especificado'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Aprobada el: {quote.approvalDate ? 
                          new Date(quote.approvalDate).toLocaleDateString() : 'Fecha no disponible'}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Aprobada
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        Total: ${quote.totalSale?.toLocaleString() || '0'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items aprobados */}
                <div className="p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Items Aprobados para Compra</h4>
                  
                  <div className="space-y-4">
                    {quote.approvedOptions?.map((item, index) => {
                      const editKey = `${quote.id}-${index}`
                      // Obtener precio final guardado o usar precio de edición local
                      const savedPurchaseData = quote.purchaseData?.[index]
                      const savedFinalPrice = savedPurchaseData?.finalPurchasePrice
                      const currentFinalPrice = editingPrices[editKey] || savedFinalPrice || item.precio || 0
                      const marginCalc = calculateMarginDifference(
                        item.precio, 
                        currentFinalPrice, 
                        item.margen || 0
                      )

                      return (
                        <div key={index} className="border rounded-lg p-4 bg-gray-50">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Información del producto */}
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">
                                {item.configuracion || 'Producto'}
                              </h5>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p><span className="font-medium">Proveedor:</span> {item.proveedor}</p>
                                <p><span className="font-medium">Referencia:</span> {item.referencia || 'N/A'}</p>
                                <p><span className="font-medium">Precio Cotizado:</span> ${item.precio?.toLocaleString()}</p>
                                <p><span className="font-medium">Margen Original:</span> {item.margen || 0}%</p>
                              </div>
                            </div>

                            {/* Precio final de compra */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Precio Final de Compra
                                </label>
                                {savedFinalPrice && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✓ Guardado
                                  </span>
                                )}
                              </div>
                              <div className="space-y-2">
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                  <input
                                    type="number"
                                    value={currentFinalPrice}
                                    onChange={(e) => setEditingPrices(prev => ({
                                      ...prev,
                                      [editKey]: parseFloat(e.target.value) || 0
                                    }))}
                                    className="pl-8 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                  />
                                </div>
                                <button
                                  onClick={() => updateFinalPrice(quote.id, index, currentFinalPrice)}
                                  className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                                  disabled={!currentFinalPrice || currentFinalPrice <= 0}
                                >
                                  {savedFinalPrice ? 'Actualizar Precio' : 'Guardar Precio'}
                                </button>
                              </div>
                              {savedPurchaseData?.updatedAt && (
                                <div className="text-xs text-gray-500 mt-2">
                                  Actualizado: {new Date(savedPurchaseData.updatedAt).toLocaleString()}
                                </div>
                              )}
                            </div>

                            {/* Análisis de margen */}
                            <div>
                              <h6 className="text-sm font-medium text-gray-700 mb-2">Análisis de Margen</h6>
                              {marginCalc ? (
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Margen Original:</span>
                                    <span className="font-medium">{marginCalc.originalMargin.toFixed(1)}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Margen Nuevo:</span>
                                    <span className="font-medium">{marginCalc.newMargin.toFixed(1)}%</span>
                                  </div>
                                  <div className="flex justify-between border-t pt-2">
                                    <span className="text-gray-600">Diferencia:</span>
                                    <span className={`font-bold ${
                                      marginCalc.marginDifference > 0 
                                        ? 'text-green-600' 
                                        : marginCalc.marginDifference < 0 
                                        ? 'text-red-600' 
                                        : 'text-gray-600'
                                    }`}>
                                      {marginCalc.marginDifference > 0 ? '+' : ''}{marginCalc.marginDifference.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Ahorro/Costo:</span>
                                    <span className={`font-medium ${
                                      marginCalc.priceDifference < 0 
                                        ? 'text-green-600' 
                                        : marginCalc.priceDifference > 0 
                                        ? 'text-red-600' 
                                        : 'text-gray-600'
                                    }`}>
                                      ${Math.abs(marginCalc.priceDifference).toLocaleString()}
                                      {marginCalc.priceDifference < 0 ? ' ahorro' : marginCalc.priceDifference > 0 ? ' adicional' : ''}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-2">
                                    Costo base: ${marginCalc.originalCost.toLocaleString()}
                                  </div>
                                  {marginCalc.isImprovement && (
                                    <div className="text-xs text-green-600 font-medium">
                                      ✅ Mejora el margen
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500">
                                  Ingresa un precio para ver el análisis
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BuyerPanel
