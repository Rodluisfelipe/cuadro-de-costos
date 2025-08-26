// Configuración y gestión de proveedores
import { db } from './firebase.js'
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore'
import { authService } from './firebase.js'

export const PROVIDERS_CONFIG = {
  // Proveedores por defecto
  defaultProviders: [
    {
      id: 'provider-1',
      name: 'Proveedor Ejemplo',
      imageUrl: 'https://ui-avatars.com/api/?name=Proveedor&size=150&background=0ea5e9&color=fff&rounded=true',
      category: 'General',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  
  // Categorías disponibles
  categories: [
    'General',
    'Tecnología',
    'Construcción',
    'Servicios',
    'Equipos',
    'Materiales',
    'Otros'
  ]
}

// Clase para gestionar proveedores (Híbrido: localStorage + Firebase)
export class ProvidersManager {
  constructor() {
    this.providers = this.loadProviders()
    this.isOnline = navigator.onLine
    this.syncInProgress = false
    
    // Escuchar cambios de conectividad
    window.addEventListener('online', () => {
      this.isOnline = true
      this.syncWithFirebase()
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  // Cargar proveedores desde localStorage
  loadProviders() {
    try {
      const stored = localStorage.getItem('tecnophone_providers')
      if (stored) {
        return JSON.parse(stored)
      }
      // Si no hay proveedores guardados, usar los por defecto
      this.saveProviders(PROVIDERS_CONFIG.defaultProviders)
      return PROVIDERS_CONFIG.defaultProviders
    } catch (error) {
      console.error('❌ Error cargando proveedores:', error)
      return PROVIDERS_CONFIG.defaultProviders
    }
  }

  // Guardar proveedores en localStorage
  saveProviders(providers) {
    try {
      localStorage.setItem('tecnophone_providers', JSON.stringify(providers))
      console.log('✅ Proveedores guardados en localStorage:', providers.length)
    } catch (error) {
      console.error('❌ Error guardando proveedores en localStorage:', error)
    }
  }

  // Sincronizar con Firebase
  async syncWithFirebase() {
    if (this.syncInProgress || !this.isOnline) {
      return
    }

    this.syncInProgress = true
    console.log('🔄 [Proveedores] Iniciando sincronización con Firebase...')

    try {
      // Subir proveedores locales a Firebase
      await this.uploadToFirebase()
      
      // Descargar proveedores de Firebase
      await this.downloadFromFirebase()
      
      console.log('✅ [Proveedores] Sincronización completada')
    } catch (error) {
      console.error('❌ [Proveedores] Error en sincronización:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  // Subir proveedores a Firebase
  async uploadToFirebase() {
    try {
      const currentUser = authService.getCurrentUser()
      if (!currentUser) {
        console.log('⚠️ [Proveedores] Usuario no autenticado, saltando subida')
        return
      }

      const providersRef = collection(db, 'providers')
      
      for (const provider of this.providers) {
        if (!provider.firebaseId) {
          // Crear nuevo proveedor en Firebase
          const providerData = {
            ...provider,
            companyId: 'TECNOPHONE',
            createdBy: currentUser.uid,
            userEmail: currentUser.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }
          
          delete providerData.firebaseId // No incluir en Firebase
          
          const docRef = await addDoc(providersRef, providerData)
          provider.firebaseId = docRef.id
          console.log('📤 [Proveedores] Subido a Firebase:', provider.name)
        }
      }
      
      // Guardar IDs de Firebase en localStorage
      this.saveProviders(this.providers)
      
    } catch (error) {
      console.error('❌ [Proveedores] Error subiendo a Firebase:', error)
      throw error
    }
  }

  // Descargar proveedores de Firebase
  async downloadFromFirebase() {
    try {
      const currentUser = authService.getCurrentUser()
      if (!currentUser) {
        console.log('⚠️ [Proveedores] Usuario no autenticado, saltando descarga')
        return
      }

      const providersRef = collection(db, 'providers')
      const q = query(
        providersRef,
        where('companyId', '==', 'TECNOPHONE')
        // Nota: orderBy removido temporalmente para evitar error de índice
        // Se puede ordenar en el cliente después de obtener los datos
      )
      
      const querySnapshot = await getDocs(q)
      const firebaseProviders = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        firebaseProviders.push({
          ...data,
          firebaseId: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        })
      })

      // Ordenar por createdAt en el cliente (más recientes primero)
      firebaseProviders.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0)
        const dateB = new Date(b.createdAt || 0)
        return dateB - dateA
      })

      // Fusionar con proveedores locales
      const mergedProviders = this.mergeProviders(this.providers, firebaseProviders)
      this.providers = mergedProviders
      this.saveProviders(this.providers)
      
      console.log('📥 [Proveedores] Descargados de Firebase:', firebaseProviders.length)
      
    } catch (error) {
      console.error('❌ [Proveedores] Error descargando de Firebase:', error)
      throw error
    }
  }

  // Fusionar proveedores locales y de Firebase
  mergeProviders(localProviders, firebaseProviders) {
    const merged = [...localProviders]
    
    firebaseProviders.forEach(firebaseProvider => {
      const existingIndex = merged.findIndex(p => p.firebaseId === firebaseProvider.firebaseId)
      
      if (existingIndex >= 0) {
        // Actualizar existente
        merged[existingIndex] = { ...merged[existingIndex], ...firebaseProvider }
      } else {
        // Agregar nuevo
        merged.push(firebaseProvider)
      }
    })
    
    return merged
  }

  // Obtener todos los proveedores
  getAll() {
    return this.providers.filter(p => p.isActive)
  }

  // Obtener proveedores por categoría
  getByCategory(category) {
    return this.providers.filter(p => p.category === category && p.isActive)
  }

  // Buscar proveedores por nombre
  searchByName(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
      return []
    }
    
    const term = searchTerm.toLowerCase().trim()
    return this.providers.filter(p => 
      p.isActive && 
      p.name.toLowerCase().includes(term)
    )
  }

  // Agregar nuevo proveedor
  async add(providerData) {
    try {
      const newProvider = {
        id: `provider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: providerData.name.trim(),
        imageUrl: providerData.imageUrl.trim(),
        category: providerData.category || 'General',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Validar datos
      if (!newProvider.name) {
        throw new Error('El nombre del proveedor es requerido')
      }

      // Agregar a la lista local
      this.providers.push(newProvider)
      this.saveProviders(this.providers)

      // Intentar sincronizar con Firebase
      if (this.isOnline) {
        await this.syncWithFirebase()
      }

      console.log('✅ [Proveedores] Proveedor agregado:', newProvider.name)
      return newProvider

    } catch (error) {
      console.error('❌ [Proveedores] Error agregando proveedor:', error)
      throw error
    }
  }

  // Actualizar proveedor
  async update(providerId, updates) {
    try {
      const index = this.providers.findIndex(p => p.id === providerId)
      if (index === -1) {
        throw new Error('Proveedor no encontrado')
      }

      // Actualizar localmente
      this.providers[index] = {
        ...this.providers[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }

      this.saveProviders(this.providers)

      // Actualizar en Firebase si existe
      if (this.providers[index].firebaseId && this.isOnline) {
        try {
          const currentUser = authService.getCurrentUser()
          if (currentUser) {
            const providerRef = doc(db, 'providers', this.providers[index].firebaseId)
            await updateDoc(providerRef, {
              ...updates,
              updatedAt: serverTimestamp()
            })
            console.log('📤 [Proveedores] Actualizado en Firebase:', this.providers[index].name)
          }
        } catch (firebaseError) {
          console.warn('⚠️ [Proveedores] Error actualizando en Firebase:', firebaseError)
        }
      }

      console.log('✅ [Proveedores] Proveedor actualizado:', this.providers[index].name)
      return this.providers[index]

    } catch (error) {
      console.error('❌ [Proveedores] Error actualizando proveedor:', error)
      throw error
    }
  }

  // Eliminar proveedor
  async delete(providerId) {
    try {
      const index = this.providers.findIndex(p => p.id === providerId)
      if (index === -1) {
        throw new Error('Proveedor no encontrado')
      }

      const provider = this.providers[index]

      // Eliminar de Firebase si existe
      if (provider.firebaseId && this.isOnline) {
        try {
          const currentUser = authService.getCurrentUser()
          if (currentUser) {
            const providerRef = doc(db, 'providers', provider.firebaseId)
            await deleteDoc(providerRef)
            console.log('🗑️ [Proveedores] Eliminado de Firebase:', provider.name)
          }
        } catch (firebaseError) {
          console.warn('⚠️ [Proveedores] Error eliminando de Firebase:', firebaseError)
        }
      }

      // Eliminar localmente
      this.providers.splice(index, 1)
      this.saveProviders(this.providers)

      console.log('✅ [Proveedores] Proveedor eliminado:', provider.name)
      return provider

    } catch (error) {
      console.error('❌ [Proveedores] Error eliminando proveedor:', error)
      throw error
    }
  }

  // Obtener proveedor por ID
  getById(providerId) {
    return this.providers.find(p => p.id === providerId)
  }

  // Obtener estadísticas
  getStats() {
    const total = this.providers.length
    const active = this.providers.filter(p => p.isActive).length
    const categories = [...new Set(this.providers.map(p => p.category))]
    
    return {
      total,
      active,
      inactive: total - active,
      categories: categories.length,
      categoryBreakdown: categories.map(cat => ({
        name: cat,
        count: this.providers.filter(p => p.category === cat).length
      }))
    }
  }

  // Exportar proveedores
  export() {
    return {
      providers: this.providers,
      exportDate: new Date().toISOString(),
      version: '1.0'
    }
  }

  // Importar proveedores
  async import(data) {
    try {
      if (!data.providers || !Array.isArray(data.providers)) {
        throw new Error('Formato de datos inválido')
      }

      // Validar cada proveedor
      const validProviders = data.providers.filter(provider => {
        return provider.name && provider.name.trim() !== ''
      })

      // Agregar proveedores válidos
      for (const provider of validProviders) {
        await this.add({
          name: provider.name,
          imageUrl: provider.imageUrl || 'https://ui-avatars.com/api/?name=Proveedor&size=150&background=0ea5e9&color=fff&rounded=true',
          category: provider.category || 'General'
        })
      }

      console.log('✅ [Proveedores] Importados:', validProviders.length)
      return validProviders.length

    } catch (error) {
      console.error('❌ [Proveedores] Error importando:', error)
      throw error
    }
  }

  // Resetear a proveedores por defecto
  async reset() {
    try {
      this.providers = [...PROVIDERS_CONFIG.defaultProviders]
      this.saveProviders(this.providers)
      
      // Sincronizar con Firebase
      if (this.isOnline) {
        await this.syncWithFirebase()
      }

      console.log('🔄 [Proveedores] Reset completado')
      return this.providers

    } catch (error) {
      console.error('❌ [Proveedores] Error en reset:', error)
      throw error
    }
  }

  // Forzar sincronización
  async forceSync() {
    console.log('🔄 [Proveedores] Forzando sincronización...')
    await this.syncWithFirebase()
  }
}

// Instancia global del gestor de proveedores
export const providersManager = new ProvidersManager()

// Utilidades para validación de URLs de imagen
export const imageUtils = {
  // Validar URL de imagen
  validateImageUrl(url) {
    if (!url || typeof url !== 'string') {
      return false
    }

    try {
      const urlObj = new URL(url)
      const validProtocols = ['http:', 'https:']
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
      
      // Verificar protocolo
      if (!validProtocols.includes(urlObj.protocol)) {
        return false
      }

      // Verificar extensión
      const pathname = urlObj.pathname.toLowerCase()
      const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext))
      
      return hasValidExtension
    } catch {
      return false
    }
  },

  // Generar URL de placeholder
  getPlaceholderUrl(text = 'Proveedor', size = '150x150') {
    return `https://via.placeholder.com/${size}?text=${encodeURIComponent(text)}`
  },

  // Probar carga de imagen
  async testImageUrl(url) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = url
    })
  }
}

export default providersManager
