import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, XCircle, RefreshCw, Eye, Clock, AlertCircle, FileText, User, Calendar, DollarSign, Package, Check, X,
  TrendingUp, Shield, Star, Award, Target, Zap, Globe, Database, Activity, BarChart3, CreditCard, ShoppingCart
} from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useAuth } from '../contexts/AuthContext'
import { useCotizaciones } from '../hooks/useCotizaciones'
import { formatCurrency } from '../lib/utils'

const RevisorPanel = () => {
  const { userProfile, userRole, checkPermission } = useAuth()
  const { cotizaciones, saveCotizacion, refreshCotizaciones } = useCotizaciones()
  const [pendingQuotes, setPendingQuotes] = useState([])
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [showQuoteDetail, setShowQuoteDetail] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // 'pending', 'all', 'approved', 'rejected'
  const [selectedOptions, setSelectedOptions] = useState({})
  const [itemComments, setItemComments] = useState({})
  const [processingAction, setProcessingAction] = useState(false)
  
  // Estados para TRM oficial
  const [oficialTRM, setOficialTRM] = useState(null)
  const [trmLoading, setTrmLoading] = useState(false)
  const [trmError, setTrmError] = useState(null)
  const [lastTrmUpdate, setLastTrmUpdate] = useState(null)

  // Filtrar cotizaciones según el filtro
  useEffect(() => {
    console.log('🔄 [RevisorPanel] useEffect ejecutándose...')
    console.log('🔄 [RevisorPanel] cotizaciones:', cotizaciones)
    console.log('🔄 [RevisorPanel] filter:', filter)
    console.log('🔄 [RevisorPanel] loading:', loading)
    
    if (cotizaciones) {
      console.log('🔍 [RevisorPanel] Todas las cotizaciones recibidas:', cotizaciones)
      console.log('🔍 [RevisorPanel] Tipo de cotizaciones:', typeof cotizaciones)
      console.log('🔍 [RevisorPanel] Longitud de cotizaciones:', cotizaciones.length)
      
      // Verificar estructura de la primera cotización
      if (cotizaciones.length > 0) {
        const firstQuote = cotizaciones[0]
        console.log('🔍 [RevisorPanel] Primera cotización completa:', firstQuote)
        console.log('🔍 [RevisorPanel] Keys de la primera cotización:', Object.keys(firstQuote))
        console.log('🔍 [RevisorPanel] Status de la primera cotización:', firstQuote.status)
        console.log('🔍 [RevisorPanel] Rows de la primera cotización:', firstQuote.rows)
        console.log('🔍 [RevisorPanel] Tipo de rows:', typeof firstQuote.rows)
        console.log('🔍 [RevisorPanel] Longitud de rows:', firstQuote.rows?.length)
        
        if (firstQuote.rows && firstQuote.rows.length > 0) {
          console.log('🔍 [RevisorPanel] Primera row:', firstQuote.rows[0])
          console.log('🔍 [RevisorPanel] Keys de la primera row:', Object.keys(firstQuote.rows[0]))
        }
      }
      
      // Mostrar todos los estados disponibles
      const estados = [...new Set(cotizaciones.map(q => q.status).filter(Boolean))]
      console.log('📊 [RevisorPanel] Estados disponibles en las cotizaciones:', estados)
      
      let filtered = []
      
      switch (filter) {
        case 'pending':
          filtered = cotizaciones.filter(quote => {
            const isPending = quote.status === 'pending' || quote.status === 'sent_for_approval' || quote.status === 'pending_approval'
            console.log(`🔍 [RevisorPanel] Cotización ${quote.cotizacion_id}: status=${quote.status}, isPending=${isPending}`)
            return isPending
          })
          break
        case 'approved':
          filtered = cotizaciones.filter(quote => quote.status === 'approved')
          break
        case 'rejected':
          filtered = cotizaciones.filter(quote => quote.status === 'denied')
          break
        case 'revision':
          filtered = cotizaciones.filter(quote => quote.status === 'revision_requested')
          break
        case 'all':
        default:
          filtered = cotizaciones
          break
      }
      
      console.log('🔍 [RevisorPanel] Cotizaciones filtradas:', filtered)
      console.log('🔍 [RevisorPanel] Cantidad de cotizaciones filtradas:', filtered.length)
      
      if (filtered.length > 0) {
        console.log('🔍 [RevisorPanel] Primera cotización filtrada:', filtered[0])
        console.log('🔍 [RevisorPanel] Status de la primera cotización:', filtered[0].status)
        console.log('🔍 [RevisorPanel] Rows de la primera cotización filtrada:', filtered[0].rows)
      } else {
        console.log('⚠️ [RevisorPanel] No se encontraron cotizaciones con el filtro:', filter)
        console.log('⚠️ [RevisorPanel] Estados disponibles:', estados)
      }
      
      setPendingQuotes(filtered)
      setLoading(false)
    } else {
      console.log('⚠️ [RevisorPanel] cotizaciones es null o undefined')
    }
  }, [cotizaciones, filter])

  // Función para obtener TRM oficial de datos.gov.co
  const fetchOficialTRM = async () => {
    setTrmLoading(true)
    setTrmError(null)
    
    try {
      console.log('🏛️ Consultando TRM oficial de datos.gov.co...')
      
      const response = await fetch('https://www.datos.gov.co/resource/ceyp-9c7c.json?$select=valor,vigenciadesde&$order=vigenciadesde%20DESC&$limit=1')
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const data = await response.json()
      console.log('📋 Respuesta datos.gov.co:', data)

      if (data && data.length > 0 && data[0].valor) {
        const trm = parseFloat(data[0].valor)
        const fecha = data[0].vigenciadesde.split('T')[0]
        
        setOficialTRM(trm)
        setLastTrmUpdate(new Date().toLocaleString('es-CO'))
        console.log(`✅ TRM oficial obtenida: $${trm.toFixed(2)} (${fecha})`)
        
      } else {
        throw new Error('No se encontró valor de TRM en la respuesta')
      }
      
    } catch (error) {
      console.error('❌ Error obteniendo TRM oficial:', error)
      setTrmError(error.message)
    } finally {
      setTrmLoading(false)
    }
  }

  // Cargar TRM oficial al montar el componente
  useEffect(() => {
    fetchOficialTRM()
  }, [])

  // Verificar permisos
  if (!checkPermission('view_pending_quotes')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder al panel de revisor.</p>
        </div>
      </div>
    )
  }

  // Función para obtener el estado de la cotización
  const getQuoteStatus = (quote) => {
    switch (quote.status) {
      case 'pending':
      case 'sent_for_approval':
      case 'pending_approval':
        return { text: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-4 h-4" /> }
      case 'approved':
        return { text: 'Aprobada', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" /> }
      case 'denied':
        return { text: 'Rechazada', color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" /> }
      case 'revision_requested':
        return { text: 'Re-cotización', color: 'bg-orange-100 text-orange-800', icon: <RefreshCw className="w-4 h-4" /> }
      default:
        return { text: 'Desconocido', color: 'bg-gray-100 text-gray-800', icon: <AlertCircle className="w-4 h-4" /> }
    }
  }

  // Función para formatear ID de cotización
  const formatQuoteId = (id) => {
    if (!id) return 'N/A'
    if (typeof id === 'string') {
      return id.length > 8 ? id.slice(-8) : id
    }
    return id.toString()
  }

  // Función para agrupar filas por productos
  const getGroupedApprovalRows = (rows) => {
    if (!rows || rows.length === 0) return []

    console.log('🔍 [RevisorPanel] Procesando rows para agrupación:', rows)

    const itemsMap = new Map()

    rows.forEach((row, index) => {
      // Determinar el ID del item - usar diferentes estrategias
      let itemId = row.itemId
      if (!itemId) {
        if (row.itemName) {
          itemId = `item-${row.itemName.replace(/\s+/g, '-').toLowerCase()}`
        } else if (row.configuracion) {
          itemId = `item-${row.configuracion.replace(/\s+/g, '-').toLowerCase()}`
        } else if (row.marca && row.referencia) {
          itemId = `item-${row.marca}-${row.referencia}`.replace(/\s+/g, '-').toLowerCase()
        } else {
          itemId = `item-${row.id || index}`
        }
      }

      // Determinar el nombre del item
      let itemName = row.itemName
      if (!itemName) {
        if (row.configuracion) {
          itemName = row.configuracion
        } else if (row.marca && row.referencia) {
          itemName = `${row.marca} ${row.referencia}`
        } else if (row.item) {
          itemName = `Producto ${row.item}`
        } else {
          itemName = `Producto ${index + 1}`
        }
      }
      
      if (!itemsMap.has(itemId)) {
        itemsMap.set(itemId, {
          item: {
            id: itemId,
            name: itemName,
            description: row.itemDescription || row.configuracion || ''
          },
          options: []
        })
      }
      
      itemsMap.get(itemId).options.push(row)
    })

    const result = Array.from(itemsMap.values())
    console.log('🔍 [RevisorPanel] Resultado de agrupación:', result)
    return result
  }

  // Función para ver detalles de la cotización
  const viewQuoteDetail = (quote) => {
    console.log('🔍 [RevisorPanel] Cotización seleccionada:', quote)
    console.log('🔍 [RevisorPanel] Rows de la cotización:', quote.rows)
    console.log('🔍 [RevisorPanel] Estructura completa de rows:', quote.rows?.map(row => ({
      id: row.id,
      item: row.item,
      itemName: row.itemName,
      itemDescription: row.itemDescription,
      mayorista: row.mayorista,
      marca: row.marca,
      referencia: row.referencia,
      configuracion: row.configuracion,
      cantidad: row.cantidad,
      costoUSD: row.costoUSD,
      costoCOP: row.costoCOP,
      pvpUnitario: row.pvpUnitario,
      pvpTotal: row.pvpTotal,
      margen: row.margen,
      trm: row.trm
    })))
    
    setSelectedQuote(quote)
    setSelectedOptions({})
    setItemComments({})
    setShowQuoteDetail(true)
  }

  // Función para manejar aprobación/rechazo
  const handleApproval = async (approved) => {
    if (!selectedQuote || processingAction) return

    setProcessingAction(true)

    try {
      let updatedQuote = { ...selectedQuote }

      if (approved) {
        // APROBACIÓN: Verificar que se hayan seleccionado opciones
        const groupedRows = getGroupedApprovalRows(selectedQuote.rows)
        const hasAllSelections = groupedRows.every(group => selectedOptions[group.item.id])
        
        if (!hasAllSelections) {
          alert('Por favor selecciona una opción para cada producto antes de aprobar.')
          setProcessingAction(false)
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
          ...selectedQuote,
          rows: selectedRows,
          totalGeneral: newTotal,
          status: 'approved',
          selectedOptions: selectedOptions,
          itemComments: itemComments,
          approvalDate: new Date().toISOString(),
          approvalDateFormatted: new Date().toLocaleString('es-CO'),
          approvedBy: userProfile?.email || 'Revisor',
          updatedAt: new Date().toISOString()
        }

        console.log('✅ Cotización aprobada con opciones seleccionadas')

      } else {
        // RECHAZO: Recopilar comentarios
        const groupedRows = getGroupedApprovalRows(selectedQuote.rows)
        const hasComments = Object.values(itemComments).some(comment => comment && comment.trim())
        
        if (!hasComments) {
          alert('Por favor añade comentarios específicos para orientar la re-cotización.')
          setProcessingAction(false)
          return
        }

        // Actualizar cotización con comentarios
        updatedQuote = {
          ...selectedQuote,
          status: 'revision_requested',
          itemComments: itemComments,
          revisionDate: new Date().toISOString(),
          revisionDateFormatted: new Date().toLocaleString('es-CO'),
          revisedBy: userProfile?.email || 'Revisor',
          updatedAt: new Date().toISOString()
        }

        console.log('🔄 Re-cotización solicitada con comentarios')
      }
      
      // Guardar en base de datos
      await saveCotizacion(updatedQuote)
      
      console.log(`✅ Cotización ${selectedQuote.cotizacion_id || selectedQuote.id} ${approved ? 'aprobada' : 'enviada a revisión'}`)
      
      // Mostrar mensaje de éxito
      alert(approved 
        ? '✅ Cotización aprobada correctamente. El vendedor será notificado automáticamente.' 
        : '🔄 Solicitud de re-cotización enviada. El vendedor será notificado automáticamente.'
      )
      
      // Cerrar modal y refrescar datos
      setShowQuoteDetail(false)
      setSelectedQuote(null)
      setSelectedOptions({})
      setItemComments({})
      refreshCotizaciones()
      
    } catch (error) {
      console.error('❌ Error procesando aprobación:', error)
      alert('❌ Error al procesar la respuesta. Por favor intenta de nuevo.')
    } finally {
      setProcessingAction(false)
    }
  }

  // Estadísticas
  const stats = {
    pending: cotizaciones?.filter(q => q.status === 'pending' || q.status === 'sent_for_approval' || q.status === 'pending_approval').length || 0,
    approved: cotizaciones?.filter(q => q.status === 'approved').length || 0,
    rejected: cotizaciones?.filter(q => q.status === 'denied').length || 0,
    revision: cotizaciones?.filter(q => q.status === 'revision_requested').length || 0
  }

    return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header mejorado */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            {/* Header principal */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
              <div className="flex items-center">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Panel de Revisor
                  </h1>
                  <p className="text-gray-600 mt-1 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Gestiona y aprueba cotizaciones pendientes
                  </p>
                </div>
              </div>
              
              {/* TRM Oficial */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-green-600 font-medium">TRM Oficial</div>
                    <div className="flex items-center gap-2">
                      {trmLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm text-green-600">Consultando...</span>
                        </div>
                      ) : trmError ? (
                        <div className="text-sm text-red-500">No disponible</div>
                      ) : oficialTRM ? (
                        <div className="text-lg font-mono font-bold text-green-700">
                          ${oficialTRM.toFixed(2)}
                        </div>
                      ) : (
                        <div className="text-sm text-green-600">Cargando...</div>
                      )}
                      <div className="text-xs text-green-600 opacity-75">datos.gov.co</div>
                    </div>
                    {lastTrmUpdate && (
                      <div className="text-xs text-green-600 opacity-75">
                        {lastTrmUpdate}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Estadísticas mejoradas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
                    <div className="text-sm text-yellow-600 font-medium">Pendientes</div>
                  </div>
                  <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-700">{stats.approved}</div>
                    <div className="text-sm text-green-600 font-medium">Aprobadas</div>
                  </div>
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
                    <div className="text-sm text-red-600 font-medium">Rechazadas</div>
                  </div>
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-orange-700">{stats.revision}</div>
                    <div className="text-sm text-orange-600 font-medium">Re-cotización</div>
                  </div>
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-white" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Botones de depuración */}
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log('🔍 [DEBUG] Todas las cotizaciones:', cotizaciones)
                  console.log('🔍 [DEBUG] Cotizaciones filtradas:', pendingQuotes)
                  if (pendingQuotes.length > 0) {
                    console.log('🔍 [DEBUG] Primera cotización completa:', pendingQuotes[0])
                    console.log('🔍 [DEBUG] Rows de la primera cotización:', pendingQuotes[0].rows)
                  }
                  
                  // Verificar IndexedDB directamente
                  const db = indexedDB.open('CotizacionesDB', 1)
                  db.onsuccess = function(event) {
                    const database = event.target.result
                    const transaction = database.transaction(['cotizaciones'], 'readonly')
                    const store = transaction.objectStore('cotizaciones')
                    const request = store.getAll()
                    
                    request.onsuccess = function() {
                      const cotizacionesDB = request.result
                      console.log('🔍 [IndexedDB] Total de cotizaciones:', cotizacionesDB.length)
                      cotizacionesDB.forEach((quote, index) => {
                        console.log(`📋 [IndexedDB] Cotización ${index + 1}:`, {
                          id: quote.id,
                          cotizacion_id: quote.cotizacion_id,
                          clienteName: quote.clienteName,
                          status: quote.status,
                          totalGeneral: quote.totalGeneral,
                          rowsCount: quote.rows?.length || 0,
                          rows: quote.rows?.map(row => ({
                            id: row.id,
                            itemName: row.itemName,
                            mayorista: row.mayorista,
                            marca: row.marca,
                            referencia: row.referencia,
                            configuracion: row.configuracion,
                            pvpTotal: row.pvpTotal,
                            costoUSD: row.costoUSD,
                            cantidad: row.cantidad
                          }))
                        })
                      })
                    }
                  }
                }}
                className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
              >
                <Database className="w-4 h-4 mr-2" />
                Debug DB
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  console.log('🔄 [DEBUG] Forzando recarga de cotizaciones...')
                  try {
                    refreshCotizaciones()
                    console.log('✅ [DEBUG] Recarga completada')
                  } catch (error) {
                    console.error('❌ [DEBUG] Error en recarga:', error)
                  }
                }}
                className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recargar
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  // Crear cotización de prueba
                  const testQuote = {
                    cotizacion_id: `TEST-${Date.now()}`,
                    clienteName: 'Cliente de Prueba',
                    vendorName: 'Vendedor de Prueba',
                    vendorEmail: 'vendedor@test.com',
                    status: 'pending_approval',
                    totalGeneral: 1500000,
                    trmGlobal: oficialTRM || 4200,
                    rows: [
                      {
                        id: 1,
                        itemName: 'Laptop HP',
                        itemDescription: 'Laptop HP Pavilion',
                        mayorista: 'Distribuidor A',
                        marca: 'HP',
                        referencia: 'Pavilion 15',
                        configuracion: 'Intel i5, 8GB RAM, 256GB SSD',
                        cantidad: 1,
                        costoUSD: 500,
                        costoCOP: 2100000,
                        pvpUnitario: 1500000,
                        pvpTotal: 1500000,
                        margen: 30,
                        trm: oficialTRM || 4200
                      },
                      {
                        id: 2,
                        itemName: 'Laptop HP',
                        itemDescription: 'Laptop HP Pavilion',
                        mayorista: 'Distribuidor B',
                        marca: 'HP',
                        referencia: 'Pavilion 15',
                        configuracion: 'Intel i7, 16GB RAM, 512GB SSD',
                        cantidad: 1,
                        costoUSD: 700,
                        costoCOP: 2940000,
                        pvpUnitario: 1800000,
                        pvpTotal: 1800000,
                        margen: 25,
                        trm: oficialTRM || 4200
                      }
                    ],
                    notes: 'Cotización de prueba para el panel de revisor',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  }
                  
                  try {
                    await saveCotizacion(testQuote)
                    console.log('✅ Cotización de prueba creada')
                    alert('✅ Cotización de prueba creada. Revisa el panel.')
                  } catch (error) {
                    console.error('❌ Error creando cotización de prueba:', error)
                    alert('❌ Error creando cotización de prueba')
                  }
                }}
                className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                Crear Test
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros mejorados */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter('pending')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                filter === 'pending'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg'
                  : 'bg-white/80 hover:bg-yellow-50 border border-yellow-200 text-yellow-700 hover:border-yellow-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              Pendientes
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                filter === 'pending' ? 'bg-white/20' : 'bg-yellow-100'
              }`}>
                {stats.pending}
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                  : 'bg-white/80 hover:bg-blue-50 border border-blue-200 text-blue-700 hover:border-blue-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              Todas
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                filter === 'all' ? 'bg-white/20' : 'bg-blue-100'
              }`}>
                {cotizaciones?.length || 0}
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter('approved')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                filter === 'approved'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                  : 'bg-white/80 hover:bg-green-50 border border-green-200 text-green-700 hover:border-green-300'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Aprobadas
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                filter === 'approved' ? 'bg-white/20' : 'bg-green-100'
              }`}>
                {stats.approved}
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter('rejected')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                filter === 'rejected'
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg'
                  : 'bg-white/80 hover:bg-red-50 border border-red-200 text-red-700 hover:border-red-300'
              }`}
            >
              <XCircle className="w-4 h-4" />
              Rechazadas
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                filter === 'rejected' ? 'bg-white/20' : 'bg-red-100'
              }`}>
                {stats.rejected}
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter('revision')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                filter === 'revision'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                  : 'bg-white/80 hover:bg-orange-50 border border-orange-200 text-orange-700 hover:border-orange-300'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Re-cotización
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                filter === 'revision' ? 'bg-white/20' : 'bg-orange-100'
              }`}>
                {stats.revision}
              </span>
            </motion.button>
          </div>
        </div>
      </div>

             {/* Contenido principal */}
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
         {loading ? (
           <div className="flex justify-center items-center h-64">
             <div className="relative">
               <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
               </div>
             </div>
           </div>
         ) : pendingQuotes.length === 0 ? (
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-12 text-center border border-gray-200/50"
           >
             <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
               <FileText className="w-12 h-12 text-gray-400" />
             </div>
             <h3 className="text-xl font-semibold text-gray-900 mb-3">
               No hay cotizaciones {filter === 'pending' ? 'pendientes' : 'en esta categoría'}
             </h3>
             <p className="text-gray-600 max-w-md mx-auto">
               {filter === 'pending' 
                 ? 'Las cotizaciones enviadas para aprobación aparecerán aquí.'
                 : 'No se encontraron cotizaciones con el filtro seleccionado.'
               }
             </p>
           </motion.div>
         ) : (
           <div className="grid gap-6">
             {pendingQuotes.map((quote, index) => {
               const status = getQuoteStatus(quote)
               const isPending = quote.status === 'pending' || quote.status === 'sent_for_approval' || quote.status === 'pending_approval'
               
               return (
                 <motion.div
                   key={quote.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: index * 0.1 }}
                 >
                   <Card className="bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 border border-gray-200/50 overflow-hidden group">
                     <CardHeader className="pb-4">
                       <div className="flex justify-between items-start">
                         <div className="flex-1">
                           <div className="flex items-center gap-3 mb-4">
                             <div className="relative">
                               <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                 <CreditCard className="w-6 h-6 text-white" />
                               </div>
                               <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                                 <span className="text-xs font-bold text-white">{quote.rows?.length || 0}</span>
                               </div>
                             </div>
                             <div className="flex-1">
                               <CardTitle className="text-xl font-bold text-gray-900 mb-1">
                                 Cotización #{formatQuoteId(quote.cotizacion_id || quote.id)}
                               </CardTitle>
                               <div className="flex items-center gap-2">
                                 <Badge className={`${status.color} shadow-sm`}>
                                   <span className="flex items-center gap-1">
                                     {status.icon}
                                     {status.text}
                                   </span>
                                 </Badge>
                                 <span className="text-sm text-gray-500">
                                   {quote.createdAt ? 
                                     new Date(quote.createdAt).toLocaleDateString() : 'Fecha no disponible'}
                                 </span>
                               </div>
                             </div>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                             <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200/50">
                               <div className="flex items-center gap-2 mb-1">
                                 <User className="w-4 h-4 text-blue-600" />
                                 <span className="text-xs font-medium text-blue-700">Cliente</span>
                               </div>
                               <div className="text-sm font-semibold text-gray-900">
                                 {quote.clienteName || quote.customerName || 'No especificado'}
                               </div>
                             </div>
                             
                             <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200/50">
                               <div className="flex items-center gap-2 mb-1">
                                 <DollarSign className="w-4 h-4 text-green-600" />
                                 <span className="text-xs font-medium text-green-700">Total</span>
                               </div>
                               <div className="text-sm font-semibold text-gray-900">
                                 {formatCurrency(quote.totalGeneral || 0)}
                               </div>
                             </div>
                             
                             <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-3 border border-purple-200/50">
                               <div className="flex items-center gap-2 mb-1">
                                 <Package className="w-4 h-4 text-purple-600" />
                                 <span className="text-xs font-medium text-purple-700">Items</span>
                               </div>
                               <div className="text-sm font-semibold text-gray-900">
                                 {quote.rows?.length || 0}
                               </div>
                             </div>
                             
                             {quote.vendorName && (
                               <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-200/50">
                                 <div className="flex items-center gap-2 mb-1">
                                   <User className="w-4 h-4 text-orange-600" />
                                   <span className="text-xs font-medium text-orange-700">Vendedor</span>
                                 </div>
                                 <div className="text-sm font-semibold text-gray-900">
                                   {quote.vendorName}
                                 </div>
                               </div>
                             )}
                           </div>

                           {/* Información de items si está disponible */}
                           {quote.rows && quote.rows.length > 0 && (
                             <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200/50">
                               <div className="flex items-center gap-2 mb-3">
                                 <ShoppingCart className="w-4 h-4 text-gray-600" />
                                 <span className="text-sm font-medium text-gray-700">Items de la cotización</span>
                               </div>
                               <div className="space-y-2">
                                 {quote.rows.slice(0, 3).map((row, index) => (
                                   <div key={index} className="flex justify-between items-center bg-white/60 rounded-lg p-2">
                                     <span className="text-sm text-gray-700">
                                       {row.itemName || row.configuracion || `Item ${index + 1}`}
                                     </span>
                                     <span className="text-sm font-semibold text-gray-900">
                                       {formatCurrency(row.pvpTotal || 0)}
                                     </span>
                                   </div>
                                 ))}
                                 {quote.rows.length > 3 && (
                                   <div className="text-center text-sm text-gray-500 italic bg-white/40 rounded-lg py-2">
                                     ... y {quote.rows.length - 3} más
                                   </div>
                                 )}
                               </div>
                             </div>
                           )}
                         </div>
                         
                         <div className="flex flex-col gap-2">
                           <motion.button
                             whileHover={{ scale: 1.05 }}
                             whileTap={{ scale: 0.95 }}
                             onClick={() => viewQuoteDetail(quote)}
                             className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                               isPending
                                 ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-xl'
                                 : 'bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-lg hover:shadow-xl'
                             }`}
                           >
                             <Eye className="w-4 h-4 mr-2 inline" />
                             {isPending ? 'Revisar' : 'Ver Detalles'}
                           </motion.button>
                         </div>
                       </div>
                     </CardHeader>
                     
                     {quote.notes && (
                       <CardContent className="pt-0">
                         <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200/50">
                           <div className="flex items-center gap-2 mb-2">
                             <FileText className="w-4 h-4 text-yellow-600" />
                             <span className="text-sm font-medium text-yellow-700">Notas del vendedor</span>
                           </div>
                           <p className="text-sm text-gray-700">
                             {quote.notes}
                           </p>
                         </div>
                       </CardContent>
                     )}
                   </Card>
                 </motion.div>
               )
             })}
           </div>
         )}
       </div>

             {/* Modal de detalles y aprobación de cotización mejorado */}
       <AnimatePresence>
         {showQuoteDetail && selectedQuote && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
           >
             <motion.div
               initial={{ scale: 0.95, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.95, opacity: 0, y: 20 }}
               className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden border border-gray-200/50"
             >
               {/* Header del modal */}
               <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
                 <div className="flex justify-between items-start">
                   <div className="flex-1">
                     <div className="flex items-center gap-4 mb-2">
                       <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                         <Award className="w-6 h-6" />
                       </div>
                       <div>
                         <h2 className="text-2xl font-bold">
                           Revisión de Cotización #{formatQuoteId(selectedQuote.cotizacion_id || selectedQuote.id)}
                         </h2>
                         <div className="flex items-center gap-4 mt-1 text-blue-100">
                           <div className="flex items-center gap-2">
                             <User className="w-4 h-4" />
                             <span>{selectedQuote.clienteName || selectedQuote.customerName || 'No especificado'}</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <User className="w-4 h-4" />
                             <span>{selectedQuote.vendorName || 'No especificado'}</span>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                   <motion.button
                     whileHover={{ scale: 1.1 }}
                     whileTap={{ scale: 0.9 }}
                     onClick={() => setShowQuoteDetail(false)}
                     className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
                   >
                     <X className="w-5 h-5" />
                   </motion.button>
                 </div>
               </div>

               <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
                 {/* Información de la cotización mejorada */}
                 <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                   {/* Información General */}
                   <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200/50">
                     <div className="flex items-center gap-3 mb-4">
                       <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                         <BarChart3 className="w-5 h-5 text-white" />
                       </div>
                       <h3 className="font-semibold text-gray-900">Información General</h3>
                     </div>
                     <div className="space-y-3 text-sm">
                       <div className="flex justify-between items-center">
                         <span className="text-gray-600">Estado:</span>
                         <Badge className={getQuoteStatus(selectedQuote).color}>
                           {getQuoteStatus(selectedQuote).text}
                         </Badge>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-gray-600">Fecha:</span>
                         <span className="font-medium">
                           {selectedQuote.createdAt ? 
                             new Date(selectedQuote.createdAt).toLocaleDateString() : 'No disponible'}
                         </span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-gray-600">Total:</span>
                         <span className="font-bold text-green-600">
                           {formatCurrency(selectedQuote.totalGeneral || 0)}
                         </span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-gray-600">Items:</span>
                         <span className="font-medium">{selectedQuote.rows?.length || 0}</span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-gray-600">TRM Usada:</span>
                         <span className="font-medium">{selectedQuote.trmGlobal || 'No especificado'}</span>
                       </div>
                     </div>
                   </div>
                   
                   {/* Detalles del Cliente */}
                   <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200/50">
                     <div className="flex items-center gap-3 mb-4">
                       <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                         <User className="w-5 h-5 text-white" />
                       </div>
                       <h3 className="font-semibold text-gray-900">Detalles del Cliente</h3>
                     </div>
                     <div className="space-y-3 text-sm">
                       <div>
                         <div className="text-gray-600 mb-1">Cliente:</div>
                         <div className="font-medium text-gray-900">
                           {selectedQuote.clienteName || selectedQuote.customerName || 'No especificado'}
                         </div>
                       </div>
                       <div>
                         <div className="text-gray-600 mb-1">Vendedor:</div>
                         <div className="font-medium text-gray-900">
                           {selectedQuote.vendorName || 'No especificado'}
                         </div>
                       </div>
                       <div>
                         <div className="text-gray-600 mb-1">Email:</div>
                         <div className="font-medium text-gray-900">
                           {selectedQuote.vendorEmail || 'No especificado'}
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* TRM Oficial */}
                   <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-5 border border-purple-200/50">
                     <div className="flex items-center gap-3 mb-4">
                       <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                         <TrendingUp className="w-5 h-5 text-white" />
                       </div>
                       <h3 className="font-semibold text-gray-900">TRM Oficial</h3>
                     </div>
                     <div className="space-y-3 text-sm">
                       <div className="flex justify-between items-center">
                         <span className="text-gray-600">TRM Actual:</span>
                         <span className="font-bold text-purple-600">
                           ${oficialTRM?.toFixed(2) || 'N/A'}
                         </span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-gray-600">TRM Cotización:</span>
                         <span className="font-medium">
                           ${selectedQuote.trmGlobal || 'N/A'}
                         </span>
                       </div>
                       {oficialTRM && selectedQuote.trmGlobal && (
                         <div className="flex justify-between items-center">
                           <span className="text-gray-600">Diferencia:</span>
                           <span className={`font-medium ${
                             Math.abs(oficialTRM - selectedQuote.trmGlobal) > 100 ? 'text-red-600' : 'text-green-600'
                           }`}>
                             ${Math.abs(oficialTRM - selectedQuote.trmGlobal).toFixed(2)}
                           </span>
                         </div>
                       )}
                       <div className="text-xs text-gray-500 mt-2">
                         Fuente: datos.gov.co
                       </div>
                     </div>
                   </div>

                   {/* Acciones */}
                   <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-200/50">
                     <div className="flex items-center gap-3 mb-4">
                       <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                         <Target className="w-5 h-5 text-white" />
                       </div>
                       <h3 className="font-semibold text-gray-900">Acciones</h3>
                     </div>
                     <div className="space-y-3">
                       <motion.button
                         whileHover={{ scale: 1.02 }}
                         whileTap={{ scale: 0.98 }}
                         disabled={processingAction}
                         onClick={() => handleApproval(true)}
                         className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                       >
                         <Check className="w-4 h-4 mr-2 inline" />
                         {processingAction ? 'Procesando...' : 'Aprobar Cotización'}
                       </motion.button>
                       <motion.button
                         whileHover={{ scale: 1.02 }}
                         whileTap={{ scale: 0.98 }}
                         disabled={processingAction}
                         onClick={() => handleApproval(false)}
                         className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-4 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                       >
                         <X className="w-4 h-4 mr-2 inline" />
                         {processingAction ? 'Procesando...' : 'Solicitar Re-cotización'}
                       </motion.button>
                     </div>
                   </div>
                 </div>

                                 {/* Items de la cotización con opciones de selección mejoradas */}
                 {selectedQuote.rows && selectedQuote.rows.length > 0 ? (
                   <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-6 mb-8 border border-gray-200/50">
                     <div className="flex items-center gap-3 mb-6">
                       <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                         <ShoppingCart className="w-5 h-5 text-white" />
                       </div>
                       <h3 className="text-xl font-bold text-gray-900">Items de la Cotización</h3>
                     </div>
                     
                     <div className="space-y-8">
                       {getGroupedApprovalRows(selectedQuote.rows).map((group, groupIndex) => (
                         <motion.div
                           key={group.item.id}
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: groupIndex * 0.1 }}
                           className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 shadow-sm"
                         >
                           <div className="flex items-center gap-3 mb-4">
                             <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                               <Package className="w-4 h-4 text-white" />
                             </div>
                             <h4 className="text-lg font-semibold text-gray-900">{group.item.name}</h4>
                           </div>
                           
                           {/* Opciones del producto mejoradas */}
                           <div className="space-y-4 mb-6">
                             {group.options.map((row, optionIndex) => (
                               <motion.div 
                                 key={row.id}
                                 initial={{ opacity: 0, x: -20 }}
                                 animate={{ opacity: 1, x: 0 }}
                                 transition={{ delay: (groupIndex * 0.1) + (optionIndex * 0.05) }}
                                 className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                                   selectedOptions[group.item.id] === row.id
                                     ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg'
                                     : 'border-gray-200 hover:border-blue-300 bg-white/60'
                                 }`}
                                 onClick={() => setSelectedOptions(prev => ({
                                   ...prev,
                                   [group.item.id]: row.id
                                 }))}
                               >
                                 {/* Indicador de selección */}
                                 <div className="absolute top-4 right-4">
                                   <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                     selectedOptions[group.item.id] === row.id
                                       ? 'bg-blue-500 border-blue-500 scale-110'
                                       : 'border-gray-300'
                                   }`}>
                                     {selectedOptions[group.item.id] === row.id && (
                                       <Check className="w-3 h-3 text-white" />
                                     )}
                                   </div>
                                 </div>

                                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                   <div className="space-y-4">
                                     {/* Información del proveedor */}
                                     <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-4">
                                       <div className="flex items-center gap-2 mb-2">
                                         <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                                         <span className="font-semibold text-gray-900">
                                           {row.mayorista || 'Sin proveedor'}
                                         </span>
                                       </div>
                                       
                                       <div className="grid grid-cols-2 gap-3 text-sm">
                                         {row.marca && (
                                           <div>
                                             <span className="text-gray-600">Marca:</span>
                                             <div className="font-medium text-gray-900">{row.marca}</div>
                                           </div>
                                         )}
                                         {row.referencia && (
                                           <div>
                                             <span className="text-gray-600">Referencia:</span>
                                             <div className="font-medium text-gray-900">{row.referencia}</div>
                                           </div>
                                         )}
                                       </div>
                                       
                                       {row.configuracion && (
                                         <div className="mt-3">
                                           <span className="text-gray-600 text-sm">Configuración:</span>
                                           <div className="font-medium text-gray-900 text-sm mt-1">
                                             {row.configuracion}
                                           </div>
                                         </div>
                                       )}
                                     </div>

                                     {/* Información de costos */}
                                     <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                                       <div className="flex items-center gap-2 mb-3">
                                         <DollarSign className="w-4 h-4 text-green-600" />
                                         <span className="font-semibold text-gray-900">Información de Costos</span>
                                       </div>
                                       
                                       <div className="space-y-2 text-sm">
                                         <div className="flex justify-between">
                                           <span className="text-gray-600">Cantidad:</span>
                                           <span className="font-medium">{row.cantidad || 1}</span>
                                         </div>
                                         {row.costoUSD > 0 && (
                                           <div className="flex justify-between">
                                             <span className="text-gray-600">Costo USD:</span>
                                             <span className="font-medium">${row.costoUSD}</span>
                                           </div>
                                         )}
                                         {row.costoCOP > 0 && (
                                           <div className="flex justify-between">
                                             <span className="text-gray-600">Costo COP:</span>
                                             <span className="font-medium">{formatCurrency(row.costoCOP)}</span>
                                           </div>
                                         )}
                                         {row.pvpUnitario > 0 && (
                                           <div className="flex justify-between">
                                             <span className="text-gray-600">Precio Unitario:</span>
                                             <span className="font-medium">{formatCurrency(row.pvpUnitario)}</span>
                                           </div>
                                         )}
                                         {row.margen > 0 && (
                                           <div className="flex justify-between">
                                             <span className="text-gray-600">Margen:</span>
                                             <span className="font-medium text-green-600">{row.margen}%</span>
                                           </div>
                                         )}
                                       </div>
                                     </div>
                                   </div>

                                   {/* Precio total destacado */}
                                   <div className="flex flex-col justify-center">
                                     <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white text-center">
                                       <div className="text-sm opacity-90 mb-2">Precio Total</div>
                                       <div className="text-3xl font-bold">
                                         {formatCurrency(row.pvpTotal || 0)}
                                       </div>
                                       <div className="text-xs opacity-75 mt-1">
                                         Incluye IVA y costos
                                       </div>
                                     </div>
                                   </div>
                                 </div>
                               </motion.div>
                             ))}
                           </div>

                           {/* Comentarios mejorados */}
                           <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200/50">
                             <div className="flex items-center gap-2 mb-3">
                               <FileText className="w-4 h-4 text-yellow-600" />
                               <label className="text-sm font-medium text-yellow-700">
                                 Comentarios para este producto
                               </label>
                             </div>
                             <textarea
                               value={itemComments[group.item.id] || ''}
                               onChange={(e) => setItemComments(prev => ({
                                 ...prev,
                                 [group.item.id]: e.target.value
                               }))}
                               placeholder="Agregar comentarios específicos para orientar la re-cotización..."
                               className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white/60 resize-none"
                               rows={3}
                             />
                           </div>
                         </motion.div>
                       ))}
                     </div>
                   </div>
                 ) : (
                   <motion.div 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 mb-8 border border-yellow-200/50"
                   >
                     <div className="flex items-center gap-3 mb-4">
                       <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                         <AlertCircle className="w-5 h-5 text-white" />
                       </div>
                       <h3 className="text-xl font-bold text-yellow-900">Información de Items No Disponible</h3>
                     </div>
                     <p className="text-yellow-700 mb-4">
                       No se encontraron datos de items en esta cotización. Esto puede deberse a:
                     </p>
                     <ul className="text-yellow-700 mb-4 list-disc list-inside space-y-1">
                       <li>La cotización no tiene items configurados</li>
                       <li>Los datos no se guardaron correctamente</li>
                       <li>Problema de sincronización con la base de datos</li>
                     </ul>
                     <div className="bg-white/60 rounded-lg p-4 border border-yellow-300/50">
                       <p className="text-sm text-gray-600">
                         <strong>Datos disponibles:</strong> {JSON.stringify(selectedQuote.rows || [], null, 2)}
                       </p>
                     </div>
                   </motion.div>
                 )}

                 {/* Notas mejoradas */}
                 {selectedQuote.notes && (
                   <motion.div 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200/50"
                   >
                     <div className="flex items-center gap-3 mb-4">
                       <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                         <FileText className="w-5 h-5 text-white" />
                       </div>
                       <h3 className="text-xl font-bold text-gray-900">Notas del Vendedor</h3>
                     </div>
                     <div className="bg-white/60 rounded-lg p-4 border border-blue-300/50">
                       <p className="text-gray-700 leading-relaxed">{selectedQuote.notes}</p>
                     </div>
                   </motion.div>
                 )}
               </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  )
}

export default RevisorPanel
