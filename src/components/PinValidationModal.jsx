import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Shield, AlertTriangle, CheckCircle, X } from 'lucide-react'
import { validatePinFormat, formatPinForDisplay, maskPin } from '../lib/pinUtils'

const PinValidationModal = ({ 
  isOpen, 
  onValidate, 
  onClose, 
  clienteName,
  cotizacionId,
  attempts = 0,
  maxAttempts = 3 
}) => {
  const [pin, setPin] = useState(['', '', '', ''])
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const inputRefs = [useRef(), useRef(), useRef(), useRef()]

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', ''])
      setError('')
      setSuccess(false)
      setIsValidating(false)
      // Focus first input
      setTimeout(() => {
        if (inputRefs[0].current) {
          inputRefs[0].current.focus()
        }
      }, 100)
    }
  }, [isOpen])

  // Handle pin input
  const handlePinChange = (index, value) => {
    // Solo permitir dígitos
    if (value && !/^\d$/.test(value)) return

    const newPin = [...pin]
    newPin[index] = value

    setPin(newPin)
    setError('')

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus()
    }

    // Auto-validate when all 4 digits are entered
    if (newPin.every(digit => digit !== '') && !isValidating) {
      setTimeout(() => validatePin(newPin.join('')), 100)
    }
  }

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus()
    } else if (e.key === 'Enter') {
      const fullPin = pin.join('')
      if (fullPin.length === 4) {
        validatePin(fullPin)
      }
    }
  }

  // Validate PIN
  const validatePin = async (pinValue) => {
    if (isValidating) return

    setIsValidating(true)
    setError('')

    try {
      console.log('🔐 Validando PIN:', maskPin(pinValue))
      
      const isValid = await onValidate(pinValue)
      
      if (isValid) {
        setSuccess(true)
        console.log('✅ PIN válido - acceso concedido')
        
        // Close modal after success animation
        setTimeout(() => {
          onClose()
        }, 1000)
      } else {
        setError('PIN incorrecto. Verifica el código e intenta de nuevo.')
        setPin(['', '', '', ''])
        console.log('❌ PIN inválido')
        
        // Focus first input for retry
        setTimeout(() => {
          inputRefs[0].current?.focus()
        }, 100)
      }
    } catch (error) {
      console.error('❌ Error validando PIN:', error)
      setError('Error al validar el PIN. Intenta de nuevo.')
      setPin(['', '', '', ''])
    } finally {
      setIsValidating(false)
    }
  }

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    
    if (pastedData.length === 4) {
      const newPin = pastedData.split('')
      setPin(newPin)
      setError('')
      
      setTimeout(() => validatePin(pastedData), 100)
    }
  }

  if (!isOpen) return null

  const remainingAttempts = maxAttempts - attempts

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100000] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Código de Seguridad
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Cotización para {clienteName}
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {success ? (
              // Success State
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                  ✅ Acceso Concedido
                </h3>
                <p className="text-green-600 dark:text-green-400">
                  Cargando cotización...
                </p>
              </motion.div>
            ) : (
              <>
                {/* Instructions */}
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Lock className="w-5 h-5 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Ingresa el PIN de 4 dígitos
                    </p>
                  </div>
                  
                  {cotizacionId && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ID: {cotizacionId}
                    </p>
                  )}
                </div>

                {/* PIN Input */}
                <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
                  {pin.map((digit, index) => (
                    <motion.input
                      key={index}
                      ref={inputRefs[index]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={isValidating || success}
                      className={`
                        w-14 h-14 text-2xl font-bold text-center rounded-xl border-2 transition-all duration-200
                        ${error 
                          ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/20 dark:text-red-400' 
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        }
                        ${digit 
                          ? 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20' 
                          : ''
                        }
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                      placeholder="•"
                    />
                  ))}
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </motion.div>
                )}

                {/* Attempts Warning */}
                {attempts > 0 && remainingAttempts > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {remainingAttempts} intento{remainingAttempts !== 1 ? 's' : ''} restante{remainingAttempts !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                {/* Loading State */}
                {isValidating && (
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Validando...</span>
                    </div>
                  </div>
                )}

                {/* Help Text */}
                {!isValidating && !error && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Puedes pegar el PIN completo desde el portapapeles
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default PinValidationModal
