// ========== CONFIGURACIÓN DE FIREBASE ==========
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    setDoc, 
    deleteDoc, 
    getDocs,
    query,
    where
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCMJbPKQ434-pSvCXnleNkancO1RN7kn_Y",
  authDomain: "billar-system.firebaseapp.com",
  projectId: "billar-system",
  storageBucket: "billar-system.firebasestorage.app",
  messagingSenderId: "503671587493",
  appId: "1:503671587493:web:88e1a1ddfb7bd21ba4c34c"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('%c🔥 Firebase inicializado correctamente', 
    'background: #ffc107; color: black; padding: 5px 10px; border-radius: 3px; font-weight: bold;');

// ========== API SIMPLIFICADA ==========
window.firebaseDB = {
    /**
     * Obtener un documento
     * @param {string} tabla - Nombre de la colección
     * @param {string} id - ID del documento
     * @returns {Promise<object|null>}
     */
    async get(tabla, id) {
        try {
            const docRef = doc(db, tabla, id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                console.log(`📖 Documento obtenido: ${tabla}/${id}`);
                return docSnap.data();
            } else {
                console.log(`⚠️ Documento no existe: ${tabla}/${id}`);
                return null;
            }
        } catch (error) {
            console.error(`❌ Error al obtener ${tabla}/${id}:`, error);
            throw error;
        }
    },

    /**
     * Guardar un documento
     * @param {string} tabla - Nombre de la colección
     * @param {string} id - ID del documento
     * @param {object} datos - Datos a guardar
     * @returns {Promise<void>}
     */
    async set(tabla, id, datos) {
        try {
            const docRef = doc(db, tabla, id);
            await setDoc(docRef, datos, { merge: true });
            console.log(`💾 Documento guardado: ${tabla}/${id}`);
        } catch (error) {
            console.error(`❌ Error al guardar ${tabla}/${id}:`, error);
            throw error;
        }
    },

    /**
     * Eliminar un documento
     * @param {string} tabla - Nombre de la colección
     * @param {string} id - ID del documento
     * @returns {Promise<void>}
     */
    async delete(tabla, id) {
        try {
            const docRef = doc(db, tabla, id);
            await deleteDoc(docRef);
            console.log(`🗑️ Documento eliminado: ${tabla}/${id}`);
        } catch (error) {
            console.error(`❌ Error al eliminar ${tabla}/${id}:`, error);
            throw error;
        }
    },

    /**
     * Obtener todos los documentos de una colección
     * @param {string} tabla - Nombre de la colección
     * @returns {Promise<Array>}
     */
    async getAll(tabla) {
        try {
            const querySnapshot = await getDocs(collection(db, tabla));
            const documentos = [];
            
            querySnapshot.forEach((doc) => {
                documentos.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`📚 Documentos obtenidos de ${tabla}: ${documentos.length}`);
            return documentos;
        } catch (error) {
            console.error(`❌ Error al obtener todos de ${tabla}:`, error);
            throw error;
        }
    },

    /**
     * Verificar si Firebase está listo
     * @returns {boolean}
     */
    isReady() {
        return db !== null;
    }
};

console.log('%c✅ API de Firebase lista para usar', 
    'color: #28a745; font-weight: bold;');
