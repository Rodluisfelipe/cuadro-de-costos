import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, RefreshCw, Eye, Clock, AlertCircle, FileText, User, Calendar } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useAuth } from '../contexts/AuthContext'
import { useCotizaciones } from '../hooks/useCotizaciones'
import { formatCurrency } from '../lib/utils'

const RevisorPanel = () => {
  const { userProfile, userRole, checkPermission } = useAuth()
  const { cotizaciones, refetchCotizaciones } = useCotizaciones()
  const [pendingQuotes, setPendingQuotes] = useState([])
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [showQuoteDetail, setShowQuoteDetail] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // 'pending', 'all', 'approved', 'rejected'

  // Filtrar cotizaciones según el filtro
  useEffect(() => {
    if (cotizaciones) {
      let filtered = []
      
      switch (filter) {
        case 'pending':
          filtered = cotizaciones.filter(quote => 
            quote.status === 'pending' || quote.status === 'sent_for_approval'
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

  // Función para ver detalles de la cotización
  const viewQuoteDetail = (quote) => {
    setSelectedQuote(quote)
    setShowQuoteDetail(true)
  }

  // Función para formatear ID de cotización
  const formatQuoteId = (id) => {
    if (!id) return 'N/A'
    if (typeof id === 'string') {
      return id.length > 8 ? id.slice(-8) : id
    }
    return id.toString()
  }

  // Función para generar enlace de aprobación
  const generateApprovalLink = (quote) => {
    const baseUrl = window.location.origin
    const approvalUrl = `${baseUrl}/?approval_id=${quote.id}`
    return approvalUrl
  }

  // Función para copiar enlace al portapapeles
  const copyApprovalLink = async (quote) => {
    const link = generateApprovalLink(quote)
    try {
      await navigator.clipboard.writeText(link)
      alert('Enlace copiado al portapapeles')
    } catch (error) {
      console.error('Error copiando enlace:', error)
      // Fallback: mostrar el enlace
      prompt('Copia este enlace:', link)
    }
  }

  // Estadísticas
  const stats = {
    pending: cotizaciones?.filter(q => q.status === 'pending' || q.status === 'sent_for_approval').length || 0,
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
              const isPending = quote.status === 'pending' || quote.status === 'sent_for_approval'
              
              return (
                <Card key={quote.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                                                     <CardTitle className="text-lg">
                             Cotización #{formatQuoteId(quote.id)}
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
                            <span>Cliente: {quote.customerName || 'No especificado'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Creada: {quote.createdAt ? 
                              new Date(quote.createdAt).toLocaleDateString() : 'Fecha no disponible'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span>Total: {formatCurrency(quote.totalGeneral || 0)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewQuoteDetail(quote)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalles
                        </Button>
                        
                        {isPending && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyApprovalLink(quote)}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Enlace Aprobación
                          </Button>
                        )}
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

      {/* Modal de detalles de cotización */}
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
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                                         <h2 className="text-2xl font-bold text-gray-900">
                       Detalles de Cotización #{formatQuoteId(selectedQuote.id)}
                     </h2>
                    <p className="text-gray-600 mt-1">
                      Cliente: {selectedQuote.customerName || 'No especificado'}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Información General</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Estado:</strong> {getQuoteStatus(selectedQuote).text}</div>
                      <div><strong>Fecha de creación:</strong> {selectedQuote.createdAt ? 
                        new Date(selectedQuote.createdAt).toLocaleString() : 'No disponible'}</div>
                      <div><strong>Total:</strong> {formatCurrency(selectedQuote.totalGeneral || 0)}</div>
                      <div><strong>Items:</strong> {selectedQuote.rows?.length || 0}</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Acciones</h3>
                    <div className="space-y-2">
                      <Button
                        className="w-full"
                        onClick={() => {
                          copyApprovalLink(selectedQuote)
                          setShowQuoteDetail(false)
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Generar Enlace de Aprobación
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          window.open(generateApprovalLink(selectedQuote), '_blank')
                          setShowQuoteDetail(false)
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Abrir en Nueva Pestaña
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Items de la cotización */}
                {selectedQuote.rows && selectedQuote.rows.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Items de la Cotización</h3>
                    <div className="space-y-3">
                      {selectedQuote.rows.map((row, index) => (
                        <div key={index} className="bg-white rounded-lg p-3 border">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{row.itemName || 'Item sin nombre'}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {row.configuracion && `Configuración: ${row.configuracion}`}
                              </div>
                              <div className="text-sm text-gray-600">
                                {row.ref && `Referencia: ${row.ref}`}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-gray-900">
                                {formatCurrency(row.pvpTotal || 0)}
                              </div>
                              <div className="text-sm text-gray-600">
                                Cantidad: {row.cantidad || 1}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notas */}
                {selectedQuote.notes && (
                  <div className="bg-gray-50 rounded-lg p-4 mt-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Notas</h3>
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
