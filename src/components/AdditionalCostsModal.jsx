import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, DollarSign } from 'lucide-react'
import { Button } from './ui/button'

const AdditionalCostsModal = ({ isOpen, onClose, rowData, onSave, formatCurrency }) => {
  const [additionalCosts, setAdditionalCosts] = useState([])

  // Inicializar con costos existentes cuando se abre el modal
  useEffect(() => {
    if (isOpen && rowData) {
      setAdditionalCosts(rowData.additionalCosts || [])
    }
  }, [isOpen, rowData])

  const addNewCost = () => {
    const newCost = {
      id: Date.now() + Math.random(),
      description: '',
      valueUSD: 0,
      valueCOP: 0,
      currency: 'USD', // 'USD' o 'COP'
      includeIVA: true
    }
    setAdditionalCosts(prev => [...prev, newCost])
  }

  const updateCost = (id, field, value) => {
    setAdditionalCosts(prev => 
      prev.map(cost => 
        cost.id === id 
          ? { ...cost, [field]: value }
          : cost
      )
    )
  }

  const removeCost = (id) => {
    setAdditionalCosts(prev => prev.filter(cost => cost.id !== id))
  }

  const handleSave = () => {
    // Filtrar costos vacíos
    const validCosts = additionalCosts.filter(cost => 
      cost.description.trim() && 
      ((cost.currency === 'USD' && cost.valueUSD > 0) || (cost.currency === 'COP' && cost.valueCOP > 0))
    )
    onSave(validCosts)
    onClose()
  }

  const calculateTotal = () => {
    return additionalCosts.reduce((sum, cost) => {
      if (cost.description.trim()) {
        if (cost.currency === 'USD' && cost.valueUSD > 0) {
          return sum + cost.valueUSD
        } else if (cost.currency === 'COP' && cost.valueCOP > 0) {
          // Convertir COP a USD usando TRM del rowData
          const trm = rowData?.trm || 4200
          return sum + (cost.valueCOP / trm)
        }
      }
      return sum
    }, 0)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Costos Adicionales</h2>
                  <p className="text-blue-100 text-sm">
                    {rowData?.itemName || `Producto ${rowData?.item}`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  Lista de Costos Adicionales
                </h3>
                <Button
                  onClick={addNewCost}
                  className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1.5"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar Costo
                </Button>
              </div>

              {additionalCosts.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay costos adicionales</p>
                  <p className="text-sm">Haz clic en "Agregar Costo" para empezar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {additionalCosts.map((cost, index) => (
                    <motion.div
                      key={cost.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Descripción */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Descripción del Costo Adicional
                            </label>
                            <input
                              type="text"
                              value={cost.description}
                              onChange={(e) => updateCost(cost.id, 'description', e.target.value)}
                              placeholder="Ej: Upgrade RAM 8GB → 16GB"
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            />
                          </div>

                          {/* Selector de moneda y valor */}
                          <div className="grid grid-cols-3 gap-3">
                            {/* Selector de moneda */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Moneda
                              </label>
                              <select
                                value={cost.currency}
                                onChange={(e) => updateCost(cost.id, 'currency', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              >
                                <option value="USD">USD</option>
                                <option value="COP">COP</option>
                              </select>
                            </div>

                            {/* Valor según moneda */}
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Valor {cost.currency}
                              </label>
                              <input
                                type="number"
                                value={cost.currency === 'USD' ? cost.valueUSD : cost.valueCOP}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0
                                  if (cost.currency === 'USD') {
                                    updateCost(cost.id, 'valueUSD', value)
                                    updateCost(cost.id, 'valueCOP', 0) // Limpiar el otro valor
                                  } else {
                                    updateCost(cost.id, 'valueCOP', value)
                                    updateCost(cost.id, 'valueUSD', 0) // Limpiar el otro valor
                                  }
                                }}
                                placeholder="0"
                                min="0"
                                step={cost.currency === 'USD' ? '0.01' : '1'}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Checkbox IVA y botón eliminar */}
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`iva-${cost.id}`}
                              checked={cost.includeIVA}
                              onChange={(e) => updateCost(cost.id, 'includeIVA', e.target.checked)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <label htmlFor={`iva-${cost.id}`} className="text-xs text-gray-600 dark:text-gray-400">
                              Incluye IVA
                            </label>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCost(cost.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumen */}
            {additionalCosts.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-800 dark:text-blue-300">
                    Total Costos Adicionales:
                  </span>
                  <span className="font-bold text-lg text-blue-900 dark:text-blue-200">
                    ${calculateTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-600">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Los costos se sumarán al precio base del producto
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="px-4 py-2"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2"
              >
                Guardar Costos
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default AdditionalCostsModal
