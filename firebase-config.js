import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyDK-RMY_j2PF8iXe_e6gYkvvKHM3kdGo9w",
    authDomain: "billar-49f2f.firebaseapp.com",
    projectId: "billar-49f2f",
    storageBucket: "billar-49f2f.firebasestorage.app",
    messagingSenderId: "1049576636913",
    appId: "1:1049576636913:web:33e0f32f9930b4c9569d95"
};

console.log('🔥 Inicializando Firebase...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let isFirebaseReady = false;

setTimeout(() => {
    isFirebaseReady = true;
    console.log('🔥 Firebase inicializado correctamente');
}, 500);

// API DE FIRESTORE
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
    
    set: async (collection, document, data) => {
        try {
            const docRef = doc(db, collection, document);
            await setDoc(docRef, {
                ...data,
                ultimaActualizacion: serverTimestamp()
            }, { merge: true });
            
            console.log(`✅ ${collection}/${document} guardado correctamente`);
            return true;
        } catch (error) {
            console.error(`❌ Error guardando ${collection}/${document}:`, error);
            throw error;
        }
    }
};

// API DE AUTENTICACIÓN
window.firebaseAuth = {
    auth: auth,
    signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
    signOut: () => signOut(auth),
    onAuthChange: (callback) => onAuthStateChanged(auth, callback),
    getCurrentUser: () => auth.currentUser
};

console.log('✅ API de Firebase lista para usar');
console.log('🔐 Firebase Authentication configurado');
