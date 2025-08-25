import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Clock, MessageSquare, X } from 'lucide-react'

const NotificationToast = ({ notification, onClose }) => {
  if (!notification) return null

  const getIcon = () => {
    switch (notification.type) {
      case 'approved':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'revision_requested':
        return <Clock className="w-6 h-6 text-orange-500" />
      case 'denied':
        return <XCircle className="w-6 h-6 text-red-500" />
      default:
        return <MessageSquare className="w-6 h-6 text-blue-500" />
    }
  }

  const getTitle = () => {
    switch (notification.type) {
      case 'approved':
        return '✅ Cotización Aprobada'
      case 'revision_requested':
        return '🔄 Re-cotización Solicitada'
      case 'denied':
        return '❌ Cotización Denegada'
      default:
        return '📋 Actualización de Cotización'
    }
  }

  const getBgColor = () => {
    switch (notification.type) {
      case 'approved':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'revision_requested':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
      case 'denied':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        transition={{ duration: 0.3, type: "spring" }}
        className={`fixed top-4 right-4 z-50 max-w-md w-full mx-4 p-4 rounded-lg shadow-xl border-2 ${getBgColor()}`}
      >
        <div className="flex items-start gap-3">
          {/* Icono */}
          <div className="flex-shrink-0 mt-1">
            {getIcon()}
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                {getTitle()}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">ID:</span> {notification.quoteId}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">Cliente:</span> {notification.clientName}
              </div>
              
              {notification.selectedOptions && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Opciones seleccionadas:</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(notification.selectedOptions).map(([itemName, option]) => (
                      <div key={itemName} className="text-xs bg-white dark:bg-gray-700 p-2 rounded border">
                        <span className="font-medium">{itemName}:</span> {option.provider} - {option.price}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {notification.comments && Object.keys(notification.comments).length > 0 && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Comentarios:</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(notification.comments).map(([itemName, comment]) => (
                      <div key={itemName} className="text-xs bg-white dark:bg-gray-700 p-2 rounded border">
                        <span className="font-medium">{itemName}:</span> {comment}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {new Date(notification.timestamp).toLocaleString('es-CO')}
              </div>
            </div>
          </div>
        </div>

        {/* Barra de progreso para auto-close */}
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: 10, ease: "linear" }}
          className={`absolute bottom-0 left-0 h-1 ${
            notification.type === 'approved' ? 'bg-green-500' :
            notification.type === 'revision_requested' ? 'bg-orange-500' :
            notification.type === 'denied' ? 'bg-red-500' : 'bg-blue-500'
          } rounded-b-lg`}
        />
      </motion.div>
    </AnimatePresence>
  )
}

export default NotificationToast
