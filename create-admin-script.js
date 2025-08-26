// Script para crear administrador directamente desde la consola del navegador
// Ejecutar en la consola de tu aplicación (cuadro-de-costos.vercel.app)

async function createAdminUser() {
  try {
    console.log('🔧 Iniciando creación de administrador...')
    
    // Verificar que Firebase esté disponible
    if (!window.firebase || !firebase.auth || !firebase.firestore) {
      console.error('❌ Firebase no está disponible. Asegúrate de estar en tu aplicación.')
      return
    }
    
    // Obtener usuario actual
    const currentUser = firebase.auth().currentUser
    if (!currentUser) {
      console.error('❌ No hay usuario autenticado. Inicia sesión primero.')
      return
    }
    
    console.log('✅ Usuario autenticado:', currentUser.email)
    console.log('🔑 UID:', currentUser.uid)
    
    // Verificar si ya existe
    const db = firebase.firestore()
    const usersRef = db.collection('users')
    const existingUser = await usersRef.where('email', '==', currentUser.email).get()
    
    if (!existingUser.empty) {
      const userData = existingUser.docs[0].data()
      console.log('⚠️ Usuario ya existe con rol:', userData.role)
      console.log('📋 Datos actuales:', userData)
      return
    }
    
    // Crear administrador
    const adminData = {
      email: currentUser.email.toLowerCase(),
      displayName: 'Administrador Principal',
      role: 'admin',
      companyId: 'TECNOPHONE',
      firebaseUid: currentUser.uid,
      isActive: true,
      permissions: [
        'manage_users',
        'manage_providers',
        'view_all_quotes',
        'manage_settings',
        'view_reports',
        'manage_roles'
      ],
      metadata: {
        department: 'Administración',
        phone: null,
        notes: 'Usuario administrador principal'
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
      lastLogin: null
    }
    
    console.log('📝 Creando documento en Firestore...')
    const docRef = await usersRef.add(adminData)
    
    console.log('✅ ¡Administrador creado exitosamente!')
    console.log('📋 ID del documento:', docRef.id)
    console.log('🎉 Recarga la página para ver el panel de administrador')
    
    return { success: true, docId: docRef.id }
    
  } catch (error) {
    console.error('❌ Error creando administrador:', error)
    console.error('🔍 Código de error:', error.code)
    console.error('📝 Mensaje:', error.message)
    
    if (error.code === 'permission-denied') {
      console.error('🚨 PROBLEMA: Reglas de Firestore no están aplicadas')
      console.error('💡 SOLUCIÓN: Ve a Firebase Console → Firestore → Reglas')
      console.error('📋 Aplica las reglas de firestore-rules-updated.txt')
    }
    
    return { success: false, error: error.message }
  }
}

// Ejecutar la función
createAdminUser().then(result => {
  if (result.success) {
    console.log('🎯 SIGUIENTE PASO: Recarga la página (Ctrl+F5)')
  } else {
    console.log('❌ FALLÓ: Revisa los errores arriba')
  }
})
