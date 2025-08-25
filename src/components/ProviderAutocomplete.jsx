import React, { useState, useEffect, useRef } from 'react'
import { providersManager, imageUtils } from '../lib/providersConfig'
import { Search, X, Check, Edit2 } from 'lucide-react'

const ProviderAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = "Buscar proveedor...",
  className = "",
  disabled = false,
  showImage = true,
  maxSuggestions = 5
}) => {
  const [suggestions, setSuggestions] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value || '')
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const wrapperRef = useRef(null)

  // Cargar proveedores al montar
  useEffect(() => {
    loadProviders()
  }, [])

  // Actualizar input cuando cambia el valor externo
  useEffect(() => {
    setInputValue(value || '')
    if (!value) {
      setSelectedProvider(null)
      setIsMinimized(false)
    } else {
      // Si hay un valor, verificar si es un proveedor válido para minimizar
      const providerInfo = getSelectedProviderInfo()
      if (providerInfo) {
        setSelectedProvider(providerInfo)
        setIsMinimized(true)
      }
    }
  }, [value])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const loadProviders = () => {
    try {
      const allProviders = providersManager.getAll()
      // No necesitamos hacer nada aquí, solo cargar para búsqueda
    } catch (error) {
      console.error('Error cargando proveedores:', error)
    }
  }

  // Buscar proveedores
  const searchProviders = (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') {
      setSuggestions([])
      return
    }

    try {
      const results = providersManager.searchByName(searchTerm)
      setSuggestions(results.slice(0, maxSuggestions))
    } catch (error) {
      console.error('Error buscando proveedores:', error)
      setSuggestions([])
    }
  }

  // Manejar cambios en el input
  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    // Si no hay proveedor seleccionado, buscar
    if (!selectedProvider) {
      searchProviders(newValue)
      setIsOpen(true)
    }

    // Notificar cambio al componente padre
    onChange(newValue)
  }

  // Seleccionar proveedor
  const handleSelectProvider = (provider) => {
    setSelectedProvider(provider)
    setInputValue(provider.name)
    setSuggestions([])
    setIsOpen(false)
    setIsMinimized(true) // Minimizar después de seleccionar
    
    // Notificar cambio al componente padre
    onChange(provider.name, provider)
  }

  // Limpiar selección
  const handleClear = () => {
    setSelectedProvider(null)
    setInputValue('')
    setSuggestions([])
    setIsOpen(false)
    setIsMinimized(false)
    
    // Notificar cambio al componente padre
    onChange('')
  }

  // Expandir el input minimizado
  const handleExpand = () => {
    setIsMinimized(false)
    setIsOpen(true)
    searchProviders(inputValue)
  }

  // Manejar focus
  const handleFocus = () => {
    if (inputValue.trim()) {
      searchProviders(inputValue)
      setIsOpen(true)
    }
  }

  // Manejar keydown
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter' && suggestions.length > 0) {
      handleSelectProvider(suggestions[0])
    }
  }

  // Buscar proveedor seleccionado para mostrar su imagen
  const getSelectedProviderInfo = () => {
    if (!inputValue) return null
    try {
      const allProviders = providersManager.getAll()
      return allProviders.find(p => p.name.toLowerCase() === inputValue.toLowerCase())
    } catch (error) {
      return null
    }
  }

  const selectedProviderInfo = getSelectedProviderInfo()

  // Si está minimizado y hay un proveedor seleccionado, mostrar versión compacta
  if (isMinimized && selectedProviderInfo && showImage) {
    return (
      <div ref={wrapperRef} className={`relative ${className}`}>
        <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200 cursor-pointer group">
          {/* Logo del proveedor */}
          <div className="flex-shrink-0">
            <img
              src={selectedProviderInfo.imageUrl}
              alt={selectedProviderInfo.name}
              className="w-6 h-6 rounded object-cover border border-gray-200 dark:border-gray-600 shadow-sm"
              onError={(e) => {
                e.target.src = imageUtils.getPlaceholderUrl('Error')
              }}
            />
          </div>
          
          {/* Nombre del proveedor */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300 truncate">
              {selectedProviderInfo.name}
            </div>
          </div>
          
          {/* Botones de acción */}
          <div className="flex items-center gap-1">
            {/* Botón editar */}
            <button
              onClick={handleExpand}
              className="p-1 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200 opacity-0 group-hover:opacity-100"
              type="button"
              title="Editar proveedor"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            
            {/* Botón limpiar */}
            <button
              onClick={handleClear}
              className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200 opacity-0 group-hover:opacity-100"
              type="button"
              title="Limpiar selección"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Dropdown de sugerencias cuando está expandido */}
        {isOpen && suggestions.length > 0 && (
          <div className="absolute z-[99999] w-full bottom-full mb-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            {suggestions.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleSelectProvider(provider)}
                className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:outline-none border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center gap-3 transition-colors duration-200 group"
                type="button"
              >
                {/* Imagen del proveedor */}
                {showImage && (
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0 shadow-sm">
                    <img
                      src={provider.imageUrl}
                      alt={provider.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = imageUtils.getPlaceholderUrl('Error')
                      }}
                    />
                  </div>
                )}
                
                {/* Información del proveedor */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {provider.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {provider.category}
                  </div>
                </div>
                
                {/* Icono de selección */}
                <Check className="w-4 h-4 text-blue-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </button>
            ))}
          </div>
        )}

        {/* Mensaje cuando no hay resultados */}
        {isOpen && inputValue.trim() && suggestions.length === 0 && (
          <div className="absolute z-[99999] w-full bottom-full mb-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-4 text-center text-gray-500 dark:text-gray-400">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <div className="font-medium">No se encontraron proveedores</div>
                <div className="text-sm">con "{inputValue}"</div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Versión normal del input
  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Input principal con logo */}
      <div className="relative">
        <div className="flex items-center">
          {/* Logo del proveedor seleccionado */}
          {selectedProviderInfo && showImage && (
            <div className="flex-shrink-0 mr-2">
              <img
                src={selectedProviderInfo.imageUrl}
                alt={selectedProviderInfo.name}
                className="w-6 h-6 rounded object-cover border border-gray-200 dark:border-gray-600 shadow-sm"
                onError={(e) => {
                  e.target.src = imageUtils.getPlaceholderUrl('Error')
                }}
              />
            </div>
          )}
          
          {/* Input con padding ajustado */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className={`w-full py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white transition-all duration-200 ${
                selectedProviderInfo && showImage ? 'pl-10 pr-10' : 'pl-10 pr-10'
              }`}
            />
            
            {/* Botón limpiar */}
            {inputValue && !disabled && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dropdown de sugerencias mejorado */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-[99999] w-full bottom-full mb-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {suggestions.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleSelectProvider(provider)}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:outline-none border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center gap-3 transition-colors duration-200 group"
              type="button"
            >
              {/* Imagen del proveedor */}
              {showImage && (
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0 shadow-sm">
                  <img
                    src={provider.imageUrl}
                    alt={provider.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = imageUtils.getPlaceholderUrl('Error')
                    }}
                  />
                </div>
              )}
              
              {/* Información del proveedor */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {provider.name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {provider.category}
                </div>
              </div>
              
              {/* Icono de selección */}
              <Check className="w-4 h-4 text-blue-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>
          ))}
        </div>
      )}

      {/* Mensaje cuando no hay resultados */}
      {isOpen && inputValue.trim() && suggestions.length === 0 && (
        <div className="absolute z-[99999] w-full bottom-full mb-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-4 text-center text-gray-500 dark:text-gray-400">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <div className="font-medium">No se encontraron proveedores</div>
              <div className="text-sm">con "{inputValue}"</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProviderAutocomplete
