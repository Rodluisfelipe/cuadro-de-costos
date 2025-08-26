import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, RefreshCw, Eye, Clock, AlertCircle, FileText, User, Calendar, DollarSign, Package, Check, X } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useAuth } from '../contexts/AuthContext'
import { useCotizaciones } from '../hooks/useCotizaciones'
import { formatCurrency } from '../lib/utils'

const RevisorPanel = () => {
  const { userProfile, userRole, checkPermission } = useAuth()
  const { cotizaciones, saveCotizacion, refetchCotizaciones } = useCotizaciones()
  const [pendingQuotes, setPendingQuotes] = useState([])
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [showQuoteDetail, setShowQuoteDetail] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // 'pending', 'all', 'approved', 'rejected'
  const [selectedOptions, setSelectedOptions] = useState({})
  const [itemComments, setItemComments] = useState({})
  const [processingAction, setProcessingAction] = useState(false)

  // Filtrar cotizaciones según el filtro
  useEffect(() => {
    if (cotizaciones) {
      console.log('🔍 [RevisorPanel] Todas las cotizaciones recibidas:', cotizaciones)
      
      let filtered = []
      
      switch (filter) {
        case 'pending':
          filtered = cotizaciones.filter(quote => 
            quote.status === 'pending' || quote.status === 'sent_for_approval' || quote.status === 'pending_approval'
          )
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
      console.log('🔍 [RevisorPanel] Estructura de la primera cotización:', filtered[0])
      
      setPendingQuotes(filtered)
      setLoading(false)
    }
  }, [cotizaciones, filter])

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
      await refetchCotizaciones()
      
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
                         <div className="flex items-center">
               <div className="text-3xl mr-3">✅</div>
               <div>
                 <h1 className="text-2xl font-bold text-gray-900">Panel de Revisor</h1>
                 <p className="text-sm text-gray-600">
                   Gestiona y aprueba cotizaciones pendientes
                 </p>
               </div>
             </div>
             
             {/* Botón de depuración temporal */}
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
             >
               🔍 Debug DB
             </Button>
            
            {/* Estadísticas rápidas */}
            <div className="flex space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-xs text-gray-500">Pendientes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                <div className="text-xs text-gray-500">Aprobadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                <div className="text-xs text-gray-500">Rechazadas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.revision}</div>
                <div className="text-xs text-gray-500">Re-cotización</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('pending')}
            >
              <Clock className="w-4 h-4 mr-2" />
              Pendientes ({stats.pending})
            </Button>
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Todas ({cotizaciones?.length || 0})
            </Button>
            <Button
              variant={filter === 'approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('approved')}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Aprobadas ({stats.approved})
            </Button>
            <Button
              variant={filter === 'rejected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('rejected')}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rechazadas ({stats.rejected})
            </Button>
            <Button
              variant={filter === 'revision' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('revision')}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-cotización ({stats.revision})
            </Button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : pendingQuotes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay cotizaciones {filter === 'pending' ? 'pendientes' : 'en esta categoría'}
            </h3>
            <p className="text-gray-600">
              {filter === 'pending' 
                ? 'Las cotizaciones enviadas para aprobación aparecerán aquí.'
                : 'No se encontraron cotizaciones con el filtro seleccionado.'
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {pendingQuotes.map((quote) => {
              const status = getQuoteStatus(quote)
              const isPending = quote.status === 'pending' || quote.status === 'sent_for_approval' || quote.status === 'pending_approval'
              
              return (
                <Card key={quote.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">
                            Cotización #{formatQuoteId(quote.cotizacion_id || quote.id)}
                          </CardTitle>
                          <Badge className={status.color}>
                            <span className="flex items-center gap-1">
                              {status.icon}
                              {status.text}
                            </span>
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>Cliente: {quote.clienteName || quote.customerName || 'No especificado'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Creada: {quote.createdAt ? 
                              new Date(quote.createdAt).toLocaleDateString() : 'Fecha no disponible'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            <span>Total: {formatCurrency(quote.totalGeneral || 0)}</span>
                          </div>
                        </div>

                        {/* Información adicional */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mt-2">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            <span>Items: {quote.rows?.length || 0}</span>
                          </div>
                          {quote.vendorName && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>Vendedor: {quote.vendorName}</span>
                            </div>
                          )}
                        </div>

                        {/* Información de items si está disponible */}
                        {quote.rows && quote.rows.length > 0 && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                            <div className="font-medium mb-1">Items:</div>
                            {quote.rows.slice(0, 3).map((row, index) => (
                              <div key={index} className="flex justify-between">
                                <span>{row.itemName || row.configuracion || `Item ${index + 1}`}</span>
                                <span>{formatCurrency(row.pvpTotal || 0)}</span>
                              </div>
                            ))}
                            {quote.rows.length > 3 && (
                              <div className="text-gray-500 italic">
                                ... y {quote.rows.length - 3} más
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewQuoteDetail(quote)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {isPending ? 'Revisar' : 'Ver Detalles'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {quote.notes && (
                    <CardContent className="pt-0">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-700">
                          <strong>Notas:</strong> {quote.notes}
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de detalles y aprobación de cotización */}
      <AnimatePresence>
        {showQuoteDetail && selectedQuote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Revisión de Cotización #{formatQuoteId(selectedQuote.cotizacion_id || selectedQuote.id)}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Cliente: {selectedQuote.clienteName || selectedQuote.customerName || 'No especificado'}
                    </p>
                    <p className="text-gray-600">
                      Vendedor: {selectedQuote.vendorName || 'No especificado'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuoteDetail(false)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>

                                 {/* Información de la cotización */}
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                   <div className="bg-gray-50 rounded-lg p-4">
                     <h3 className="font-semibold text-gray-900 mb-2">Información General</h3>
                     <div className="space-y-2 text-sm">
                       <div><strong>Estado:</strong> {getQuoteStatus(selectedQuote).text}</div>
                       <div><strong>Fecha de creación:</strong> {selectedQuote.createdAt ? 
                         new Date(selectedQuote.createdAt).toLocaleString() : 'No disponible'}</div>
                       <div><strong>Total:</strong> {formatCurrency(selectedQuote.totalGeneral || 0)}</div>
                       <div><strong>Items:</strong> {selectedQuote.rows?.length || 0}</div>
                       <div><strong>TRM:</strong> {selectedQuote.trmGlobal || selectedQuote.trmOficial || 'No especificado'}</div>
                     </div>
                   </div>
                   
                   <div className="bg-gray-50 rounded-lg p-4">
                     <h3 className="font-semibold text-gray-900 mb-2">Detalles del Cliente</h3>
                     <div className="space-y-2 text-sm">
                       <div><strong>Nombre:</strong> {selectedQuote.clienteName || selectedQuote.customerName || 'No especificado'}</div>
                       <div><strong>Vendedor:</strong> {selectedQuote.vendorName || 'No especificado'}</div>
                       <div><strong>Email:</strong> {selectedQuote.vendorEmail || 'No especificado'}</div>
                     </div>
                   </div>

                   <div className="bg-gray-50 rounded-lg p-4">
                     <h3 className="font-semibold text-gray-900 mb-2">Información Técnica</h3>
                     <div className="space-y-2 text-sm">
                       <div><strong>ID Cotización:</strong> {selectedQuote.cotizacion_id || selectedQuote.id}</div>
                       <div><strong>Última actualización:</strong> {selectedQuote.updatedAt ? 
                         new Date(selectedQuote.updatedAt).toLocaleString() : 'No disponible'}</div>
                       <div><strong>Fecha:</strong> {selectedQuote.dateFormatted || 'No disponible'}</div>
                       {selectedQuote.notes && <div><strong>Notas:</strong> {selectedQuote.notes.substring(0, 50)}...</div>}
                     </div>
                   </div>

                   <div className="bg-gray-50 rounded-lg p-4">
                     <h3 className="font-semibold text-gray-900 mb-2">Acciones</h3>
                     <div className="space-y-2">
                       <Button
                         className="w-full"
                         disabled={processingAction}
                         onClick={() => handleApproval(true)}
                       >
                         <Check className="w-4 h-4 mr-2" />
                         {processingAction ? 'Procesando...' : 'Aprobar Cotización'}
                       </Button>
                       <Button
                         variant="outline"
                         className="w-full"
                         disabled={processingAction}
                         onClick={() => handleApproval(false)}
                       >
                         <X className="w-4 h-4 mr-2" />
                         {processingAction ? 'Procesando...' : 'Solicitar Re-cotización'}
                       </Button>
                     </div>
                   </div>
                 </div>

                {/* Items de la cotización con opciones de selección */}
                {selectedQuote.rows && selectedQuote.rows.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Items de la Cotización</h3>
                    <div className="space-y-6">
                      {getGroupedApprovalRows(selectedQuote.rows).map((group) => (
                        <div key={group.item.id} className="bg-white rounded-lg p-4 border">
                          <h4 className="font-medium text-gray-900 mb-3">{group.item.name}</h4>
                          
                                                     {/* Opciones del producto */}
                           <div className="space-y-3 mb-4">
                             {group.options.map((row) => (
                               <div 
                                 key={row.id}
                                 className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                   selectedOptions[group.item.id] === row.id
                                     ? 'border-blue-500 bg-blue-50'
                                     : 'border-gray-200 hover:border-gray-300'
                                 }`}
                                 onClick={() => setSelectedOptions(prev => ({
                                   ...prev,
                                   [group.item.id]: row.id
                                 }))}
                               >
                                 <div className="flex items-center justify-between">
                                   <div className="flex-1">
                                     <div className="flex items-center gap-2 mb-2">
                                       <div className={`w-4 h-4 rounded-full border-2 ${
                                         selectedOptions[group.item.id] === row.id
                                           ? 'bg-blue-500 border-blue-500'
                                           : 'border-gray-300'
                                       }`}>
                                         {selectedOptions[group.item.id] === row.id && (
                                           <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                                         )}
                                       </div>
                                       <span className="font-medium text-gray-900">
                                         {row.mayorista || 'Sin proveedor'}
                                       </span>
                                     </div>
                                     
                                     <div className="text-sm text-gray-600 space-y-1">
                                       {row.marca && <div><strong>Marca:</strong> {row.marca}</div>}
                                       {row.referencia && <div><strong>Referencia:</strong> {row.referencia}</div>}
                                       {row.configuracion && <div><strong>Configuración:</strong> {row.configuracion}</div>}
                                       <div><strong>Cantidad:</strong> {row.cantidad || 1}</div>
                                       {row.costoUSD > 0 && <div><strong>Costo USD:</strong> ${row.costoUSD}</div>}
                                       {row.costoCOP > 0 && <div><strong>Costo COP:</strong> {formatCurrency(row.costoCOP)}</div>}
                                       {row.pvpUnitario > 0 && <div><strong>Precio Unitario:</strong> {formatCurrency(row.pvpUnitario)}</div>}
                                       {row.margen > 0 && <div><strong>Margen:</strong> {row.margen}%</div>}
                                     </div>
                                   </div>
                                   
                                   <div className="text-right">
                                     <div className="text-xl font-bold text-green-600">
                                       {formatCurrency(row.pvpTotal || 0)}
                                     </div>
                                     <div className="text-sm text-gray-500">
                                       Total
                                     </div>
                                   </div>
                                 </div>
                               </div>
                             ))}
                           </div>

                          {/* Comentarios */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Comentarios para este producto:
                            </label>
                            <textarea
                              value={itemComments[group.item.id] || ''}
                              onChange={(e) => setItemComments(prev => ({
                                ...prev,
                                [group.item.id]: e.target.value
                              }))}
                              placeholder="Agregar comentarios específicos para este producto..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows={3}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Información de Items No Disponible</h3>
                    <p className="text-yellow-700 text-sm">
                      No se encontraron datos de items en esta cotización. Esto puede deberse a:
                    </p>
                    <ul className="text-yellow-700 text-sm mt-2 list-disc list-inside">
                      <li>La cotización no tiene items configurados</li>
                      <li>Los datos no se guardaron correctamente</li>
                      <li>Problema de sincronización con la base de datos</li>
                    </ul>
                    <div className="mt-3 p-2 bg-white rounded border">
                      <p className="text-xs text-gray-600">
                        <strong>Datos disponibles:</strong> {JSON.stringify(selectedQuote.rows || [], null, 2)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Notas */}
                {selectedQuote.notes && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Notas del Vendedor</h3>
                    <p className="text-gray-700">{selectedQuote.notes}</p>
                  </div>
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
