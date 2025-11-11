// Importar Firebase desde CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Configuración de Firebase
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

// Exponer funciones globalmente para que funcionen con onclick
window.firebaseDB = {
  // Guardar documento
  async set(coleccion, id, data) {
    try {
      const docRef = doc(db, coleccion, String(id));
      await setDoc(docRef, data, { merge: true });
      return true;
    } catch (error) {
      console.error('❌ Error guardando en Firebase:', error);
      return false;
    }
  },

  // Obtener documento
  async get(coleccion, id) {
    try {
      const docRef = doc(db, coleccion, String(id));
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error('❌ Error obteniendo de Firebase:', error);
      return null;
    }
  },

  // Obtener toda una colección
  async getAll(coleccion) {
    try {
      const querySnapshot = await getDocs(collection(db, coleccion));
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo colección:', error);
      return [];
    }
  },

  // Eliminar documento
  async delete(coleccion, id) {
    try {
      await deleteDoc(doc(db, coleccion, String(id)));
      return true;
    } catch (error) {
      console.error('❌ Error eliminando de Firebase:', error);
      return false;
    }
  },

  // Escuchar cambios en tiempo real
  listen(coleccion, callback) {
    const q = collection(db, coleccion);
    return onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      callback(data);
    });
  }
};

console.log('%c✅ Firebase conectado correctamente', 'color: #28a745; font-weight: bold;');
console.log('%c📡 Base de datos en tiempo real activada', 'color: #007bff; font-weight: bold;');

// Señal de que Firebase está listo
window.firebaseReady = true;
