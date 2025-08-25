import React, { useState, useMemo } from 'react'
import Modal from './ui/modal'
import { formatCurrency } from '../lib/utils'

const SavedQuotesModal = ({ 
  isOpen, 
  onClose, 
  savedQuotes, 
  onLoadQuote, 
  onDeleteQuote, 
  onDuplicateQuote, 
  onExportQuote,
  loading = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')

  // Filtrar y ordenar cotizaciones
  const filteredAndSortedQuotes = useMemo(() => {
    let filtered = savedQuotes || []

    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(quote => 
        quote.clienteName.toLowerCase().includes(term) ||
        quote.cotizacion_id.toLowerCase().includes(term)
      )
    }

    // Filtrar por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(quote => quote.status === statusFilter)
    }

    // Ordenar
    filtered.sort((a, b) => {
      let valueA, valueB

      switch (sortBy) {
        case 'client':
          valueA = a.clienteName.toLowerCase()
          valueB = b.clienteName.toLowerCase()
          break
        case 'total':
          valueA = a.totalGeneral || 0
          valueB = b.totalGeneral || 0
          break
        case 'date':
        default:
          valueA = new Date(a.updatedAt || a.date)
          valueB = new Date(b.updatedAt || b.date)
          break
      }

      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1
      } else {
        return valueA < valueB ? 1 : -1
      }
    })

    return filtered
  }, [savedQuotes, searchTerm, statusFilter, sortBy, sortOrder])

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const total = savedQuotes.length
    const draft = savedQuotes.filter(q => q.status === 'draft').length
    const pending = savedQuotes.filter(q => q.status === 'pending_approval').length
    const approved = savedQuotes.filter(q => q.status === 'approved').length
    const denied = savedQuotes.filter(q => q.status === 'denied').length

    return { total, draft, pending, approved, denied }
  }, [savedQuotes])

  const getStatusBadge = (quote) => {
    const status = quote.status || 'draft'
    
    const statusConfig = {
      draft: { 
        label: '📝 Borrador', 
        class: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        description: 'En elaboración'
      },
      pending_approval: { 
        label: '⏳ Pendiente', 
        class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        description: 'Esperando aprobación'
      },
      approved: { 
        label: '✅ Aprobada', 
        class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        description: quote.approvalDateFormatted ? `Aprobada el ${quote.approvalDateFormatted}` : 'Aprobada'
      },
      denied: { 
        label: '❌ Rechazada', 
        class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        description: quote.approvalReason ? `Motivo: ${quote.approvalReason}` : 'Rechazada'
      }
    }

    const config = statusConfig[status] || statusConfig.draft
    
    return (
      <div className="flex flex-col items-end">
        <span className={`px-3 py-1 text-xs font-bold rounded-full ${config.class} mb-1`}>
          {config.label}
        </span>
        {(status === 'approved' || status === 'denied') && (
          <span className="text-xs text-gray-500 dark:text-gray-400 text-right max-w-32 truncate" title={config.description}>
            {config.description}
          </span>
        )}
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="💼 Cotizaciones Guardadas"
      size="large"
    >
      <div className="p-6">
        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Total</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{stats.draft}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Borradores</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
            <div className="text-sm text-yellow-600 dark:text-yellow-400">Pendientes</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approved}</div>
            <div className="text-sm text-green-600 dark:text-green-400">Aprobadas</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.denied}</div>
            <div className="text-sm text-red-600 dark:text-red-400">Rechazadas</div>
          </div>
        </div>

        {/* Controles de filtrado y búsqueda */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Búsqueda */}
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="🔍 Buscar por cliente o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtro por estado */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">📋 Todos los estados</option>
              <option value="draft">📝 Borradores</option>
              <option value="pending_approval">⏳ Pendientes</option>
              <option value="approved">✅ Aprobadas</option>
              <option value="denied">❌ Rechazadas</option>
            </select>
          </div>

          {/* Ordenamiento */}
          <div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-')
                setSortBy(by)
                setSortOrder(order)
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date-desc">📅 Más recientes</option>
              <option value="date-asc">📅 Más antiguos</option>
              <option value="client-asc">👤 Cliente A-Z</option>
              <option value="client-desc">👤 Cliente Z-A</option>
              <option value="total-desc">💰 Mayor valor</option>
              <option value="total-asc">💰 Menor valor</option>
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Cargando cotizaciones...</p>
          </div>
        )}

        {/* Lista de cotizaciones */}
        {!loading && (
          <>
            {filteredAndSortedQuotes.length === 0 ? (
              <div className="text-center py-12">
                {searchTerm || statusFilter !== 'all' ? (
                  <div>
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No se encontraron resultados
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Intenta cambiar los filtros de búsqueda
                    </p>
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setStatusFilter('all')
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Limpiar filtros
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-6xl mb-4">📝</div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No hay cotizaciones guardadas
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Crea tu primera cotización para verla aquí
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-600">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 truncate">
                          👤 {quote.clienteName}
                        </h3>
                        {getStatusBadge(quote)}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-1">
                        🆔 {quote.cotizacion_id}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        📅 {quote.dateFormatted}
                      </p>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="mb-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Valor Total</div>
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(quote.totalGeneral)}
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">TRM</div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          ${quote.trmGlobal?.toLocaleString('es-CO')}
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Items</div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {quote.rows?.length || 0} productos
                        </div>
                      </div>

                      {/* Información de respuesta */}
                      {(quote.status === 'approved' || quote.status === 'denied' || quote.status === 'revision_requested') && (
                        <div className={`mb-4 p-3 rounded-lg border-l-4 ${
                          quote.status === 'approved' 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                            : quote.status === 'revision_requested'
                            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-500'
                        }`}>
                          <div className="text-sm font-medium mb-2">
                            {quote.status === 'approved' && '✅ COTIZACIÓN APROBADA'}
                            {quote.status === 'revision_requested' && '🔄 RE-COTIZACIÓN SOLICITADA'}
                            {quote.status === 'denied' && '❌ COTIZACIÓN DENEGADA'}
                          </div>
                          
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                            📅 {quote.approvalDateFormatted || quote.revisionDateFormatted || 'No disponible'}
                          </div>

                          {/* Opciones seleccionadas para aprobadas */}
                          {quote.status === 'approved' && quote.selectedOptions && (
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-green-700 dark:text-green-300">
                                📦 Opciones Seleccionadas:
                              </div>
                              {Object.entries(quote.selectedOptions).map(([itemId, rowId]) => {
                                const selectedRow = quote.rows?.find(row => row.id === rowId)
                                if (!selectedRow) return null
                                return (
                                  <div key={itemId} className="text-xs bg-white dark:bg-gray-700 p-2 rounded border">
                                    <span className="font-medium">{selectedRow.itemName || `Producto ${selectedRow.item}`}:</span>
                                    <br />
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {selectedRow.mayorista} - {formatCurrency(selectedRow.pvpTotal)}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Comentarios para re-cotización */}
                          {(quote.status === 'revision_requested' || quote.status === 'denied') && quote.itemComments && (
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-orange-700 dark:text-orange-300">
                                💬 Comentarios por Producto:
                              </div>
                              {Object.entries(quote.itemComments).map(([itemId, comment]) => {
                                if (!comment || !comment.trim()) return null
                                const itemRow = quote.rows?.find(row => row.itemId === itemId)
                                const itemName = itemRow?.itemName || `Producto ${itemId}`
                                return (
                                  <div key={itemId} className="text-xs bg-white dark:bg-gray-700 p-2 rounded border">
                                    <span className="font-medium">{itemName}:</span>
                                    <br />
                                    <span className="text-gray-600 dark:text-gray-400 italic">
                                      "{comment}"
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Razón de rechazo antigua (compatibilidad) */}
                          {quote.status === 'denied' && quote.approvalReason && (
                            <div className="mt-2">
                              <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                                Motivo del Rechazo:
                              </div>
                              <div className="text-xs text-gray-700 dark:text-gray-300 italic bg-white dark:bg-gray-700 p-2 rounded border">
                                "{quote.approvalReason}"
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-600">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            onLoadQuote(quote)
                            onClose()
                          }}
                          className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => onExportQuote(quote)}
                          className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                        >
                          📄 PDF
                        </button>
                        <button
                          onClick={() => onDuplicateQuote(quote)}
                          className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
                        >
                          📋 Duplicar
                        </button>
                        <button
                          onClick={() => onDeleteQuote(quote.id)}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Resultados encontrados */}
            {filteredAndSortedQuotes.length > 0 && (
              <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Mostrando {filteredAndSortedQuotes.length} de {savedQuotes.length} cotizaciones
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

export default SavedQuotesModal
