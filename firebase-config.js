import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  // === NUEVAS IMPORTACIONES ===
  createUserWithEmailAndPassword, // Para crear nuevos empleados
  updatePassword, // Para cambiar contraseñas
  // ===========================
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ========== CONFIGURACIÓN DE FIREBASE ==========
const firebaseConfig = {
  apiKey: "AIzaSyCMJbPKQ434-pSvCXnleNkancO1RN7kn_Y",
  authDomain: "billar-system.firebaseapp.com",
  projectId: "billar-system",
  storageBucket: "billar-system.firebasestorage.app",
  messagingSenderId: "503671587493",
  appId: "1:503671587493:web:88e1a1ddfb7bd21ba4c34c",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let isFirebaseReady = false;

setTimeout(() => {
  isFirebaseReady = true;
}, 500);

// ========== API DE FIRESTORE ==========
window.firebaseDB = {
  isReady: () => isFirebaseReady,

  get: async (collection, document) => {
    try {
      const docRef = doc(db, collection, document);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        console.log(`📭 Documento ${collection}/${document} no existe`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error obteniendo ${collection}/${document}:`, error);
      throw error;
    }
  },

  listen: (collection, documentName, callback) => {
    try {
      const docRef = doc(db, collection, documentName);
      return onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            callback(docSnap.data());
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error(
            `❌ Error escuchando ${collection}/${documentName}:`,
            error,
          );
        },
      );
    } catch (error) {
      console.error(
        `❌ Error configurando listener para ${collection}/${documentName}:`,
        error,
      );
      throw error;
    }
  },

  set: async (collection, document, data) => {
    try {
      const docRef = doc(db, collection, document);
      await setDoc(docRef, {
        ...data,
        ultimaActualizacion: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error(`❌ Error guardando ${collection}/${document}:`, error);
      throw error;
    }
  },
};

// ========== API DE AUTENTICACIÓN ==========
window.firebaseAuth = {
  auth: auth,
  signIn: (email, password) =>
    signInWithEmailAndPassword(auth, email, password),
  signOut: () => signOut(auth),
  onAuthChange: (callback) => onAuthStateChanged(auth, callback),
  getCurrentUser: () => auth.currentUser,
  createUser: (email, password) =>
    createUserWithEmailAndPassword(auth, email, password),
  updatePassword: (user, newPassword) => updatePassword(user, newPassword),
};
