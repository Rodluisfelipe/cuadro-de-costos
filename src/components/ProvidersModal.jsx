import React, { useState, useEffect, useMemo } from 'react'
import Modal from './ui/modal'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { 
  providersManager, 
  PROVIDERS_CONFIG, 
  imageUtils 
} from '../lib/providersConfig'
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Image as ImageIcon,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Check,
  X
} from 'lucide-react'

const ProvidersModal = ({ isOpen, onClose }) => {
  const [providers, setProviders] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProvider, setEditingProvider] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Formulario para agregar/editar proveedor
  const [formData, setFormData] = useState({
    name: '',
    imageUrl: '',
    category: 'General'
  })

  // Cargar proveedores
  useEffect(() => {
    if (isOpen) {
      loadProviders()
    }
  }, [isOpen])

  const loadProviders = () => {
    try {
      const allProviders = providersManager.getAll()
      setProviders(allProviders)
      setError(null)
    } catch (error) {
      console.error('Error cargando proveedores:', error)
      setError('Error cargando proveedores')
    }
  }

  // Filtrar y buscar proveedores
  const filteredProviders = useMemo(() => {
    let filtered = providers

    // Filtrar por categoría
    if (filterCategory !== 'all') {
      filtered = filtered.filter(p => p.category === filterCategory)
    }

    // Buscar por nombre
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [providers, searchTerm, filterCategory])

  // Manejar cambios en el formulario
  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Validar formulario
  const validateForm = () => {
    if (!formData.name.trim()) {
      throw new Error('El nombre del proveedor es requerido')
    }
    if (!formData.imageUrl.trim()) {
      throw new Error('La URL de la imagen es requerida')
    }
    if (!imageUtils.validateImageUrl(formData.imageUrl)) {
      throw new Error('La URL de la imagen no es válida')
    }
  }

  // Agregar proveedor
  const handleAddProvider = async () => {
    try {
      setLoading(true)
      setError(null)
      
      validateForm()
      
      const newProvider = await providersManager.add(formData)
      setProviders(prev => [...prev, newProvider])
      
      // Limpiar formulario
      setFormData({
        name: '',
        imageUrl: '',
        category: 'General'
      })
      setShowAddForm(false)
      
      console.log('✅ Proveedor agregado:', newProvider.name)
    } catch (error) {
      console.error('Error agregando proveedor:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Editar proveedor
  const handleEditProvider = async () => {
    try {
      setLoading(true)
      setError(null)
      
      validateForm()
      
      const updatedProvider = await providersManager.update(editingProvider.id, formData)
      setProviders(prev => 
        prev.map(p => p.id === editingProvider.id ? updatedProvider : p)
      )
      
      // Limpiar formulario
      setFormData({
        name: '',
        imageUrl: '',
        category: 'General'
      })
      setEditingProvider(null)
      
      console.log('✅ Proveedor actualizado:', updatedProvider.name)
    } catch (error) {
      console.error('Error actualizando proveedor:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Eliminar proveedor
  const handleDeleteProvider = async (provider) => {
    if (!window.confirm(`¿Estás seguro de eliminar el proveedor "${provider.name}"?`)) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      await providersManager.delete(provider.id)
      setProviders(prev => prev.filter(p => p.id !== provider.id))
      
      console.log('✅ Proveedor eliminado:', provider.name)
    } catch (error) {
      console.error('Error eliminando proveedor:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Iniciar edición
  const startEdit = (provider) => {
    setEditingProvider(provider)
    setFormData({
      name: provider.name,
      imageUrl: provider.imageUrl,
      category: provider.category
    })
  }

  // Cancelar edición
  const cancelEdit = () => {
    setEditingProvider(null)
    setFormData({
      name: '',
      imageUrl: '',
      category: 'General'
    })
  }

  // Exportar proveedores
  const handleExport = () => {
    try {
      const data = providersManager.export()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proveedores-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exportando proveedores:', error)
      setError('Error exportando proveedores')
    }
  }

  // Importar proveedores
  const handleImport = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        setLoading(true)
        const data = JSON.parse(e.target.result)
        const count = await providersManager.import(data)
        loadProviders()
        alert(`✅ ${count} proveedores importados correctamente`)
      } catch (error) {
        console.error('Error importando proveedores:', error)
        setError('Error importando proveedores: ' + error.message)
      } finally {
        setLoading(false)
      }
    }
    reader.readAsText(file)
  }

  // Resetear proveedores
  const handleReset = async () => {
    if (!window.confirm('¿Estás seguro de resetear todos los proveedores? Esto eliminará todos los proveedores personalizados.')) {
      return
    }

    try {
      setLoading(true)
      await providersManager.reset()
      loadProviders()
      alert('✅ Proveedores reseteados a valores por defecto')
    } catch (error) {
      console.error('Error reseteando proveedores:', error)
      setError('Error reseteando proveedores')
    } finally {
      setLoading(false)
    }
  }

  // Obtener estadísticas
  const stats = providersManager.getStats()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🏢 Gestión de Proveedores"
      size="large"
    >
      <div className="p-6">
        {/* Mensajes de Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Estadísticas */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Proveedores</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.categories}</div>
              <div className="text-sm text-gray-600">Categorías</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{filteredProviders.length}</div>
              <div className="text-sm text-gray-600">Mostrados</div>
            </CardContent>
          </Card>
        </div>

        {/* Controles */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar proveedores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtro por categoría */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todas las categorías</option>
            {PROVIDERS_CONFIG.categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Botón agregar */}
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar
          </Button>

          {/* Botón sincronizar */}
          <Button
            onClick={async () => {
              try {
                setLoading(true)
                await providersManager.forceSync()
                loadProviders()
                alert('✅ Sincronización completada')
              } catch (error) {
                console.error('Error sincronizando:', error)
                setError('Error en sincronización: ' + error.message)
              } finally {
                setLoading(false)
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>

        {/* Formulario de agregar/editar */}
        {(showAddForm || editingProvider) && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">
              {editingProvider ? '✏️ Editar Proveedor' : '➕ Agregar Proveedor'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Proveedor *
                </label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="Ej: Proveedor ABC"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {PROVIDERS_CONFIG.categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL de la Imagen *
                </label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleFormChange}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    required
                  />
                  <Button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, imageUrl: imageUtils.getPlaceholderUrl(formData.name || 'Proveedor') }))}
                    className="bg-gray-500 hover:bg-gray-600 text-white"
                    title="Generar placeholder"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Debe ser una URL válida de imagen (jpg, png, gif, webp, svg)
                </p>
              </div>
            </div>

            {/* Vista previa de imagen */}
            {formData.imageUrl && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vista Previa
                </label>
                <div className="w-32 h-32 border border-gray-300 rounded-lg overflow-hidden">
                  <img
                    src={formData.imageUrl}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = imageUtils.getPlaceholderUrl('Error')
                    }}
                  />
                </div>
              </div>
            )}

            {/* Botones del formulario */}
            <div className="mt-4 flex gap-2">
              <Button
                onClick={editingProvider ? handleEditProvider : handleAddProvider}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                {editingProvider ? 'Actualizar' : 'Agregar'}
              </Button>
              
              <Button
                onClick={editingProvider ? cancelEdit : () => setShowAddForm(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Lista de proveedores */}
        <div className="space-y-4">
          {filteredProviders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || filterCategory !== 'all' 
                ? 'No se encontraron proveedores con los filtros aplicados'
                : 'No hay proveedores registrados'
              }
            </div>
          ) : (
            filteredProviders.map(provider => (
              <Card key={provider.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Imagen */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={provider.imageUrl}
                        alt={provider.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = imageUtils.getPlaceholderUrl('Error')
                        }}
                      />
                    </div>

                    {/* Información */}
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                      <p className="text-sm text-gray-600">{provider.category}</p>
                      <p className="text-xs text-gray-500">
                        Creado: {new Date(provider.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => startEdit(provider)}
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        onClick={() => handleDeleteProvider(provider)}
                        size="sm"
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Acciones adicionales */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
          <Button
            onClick={handleExport}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </Button>
          </label>
          
          <Button
            onClick={handleReset}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Resetear
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default ProvidersModal
