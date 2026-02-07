// ========== CONFIGURACIÓN DE DEBUGGING ==========
const DEBUG_MODE = true;
const USE_LOCAL_STORAGE = false; // 🧪 Cambia a true para probar sin tocar Firebase (usa localStorage)

function debugLog(categoria, mensaje, datos = null) {
    if (!DEBUG_MODE) return;

    const estilos = {
        sistema: 'background: #2d7a4d; color: white; padding: 2px 5px; border-radius: 3px;',
        timer: 'background: #007bff; color: white; padding: 2px 5px; border-radius: 3px;',
        venta: 'background: #28a745; color: white; padding: 2px 5px; border-radius: 3px;',
        error: 'background: #dc3545; color: white; padding: 2px 5px; border-radius: 3px;',
        stock: 'background: #fd7e14; color: white; padding: 2px 5px; border-radius: 3px;',
        firebase: 'background: #ffc107; color: black; padding: 2px 5px; border-radius: 3px;',
        seguridad: 'background: #6f42c1; color: white; padding: 2px 5px; border-radius: 3px;'
    };

    console.log(`%c${categoria.toUpperCase()}`, estilos[categoria] || '', mensaje, datos || '');
}

// ========== CONSTANTES DE FIREBASE ==========
const COLLECTIONS = {
    USUARIOS: 'usuarios',
    VENTAS: 'ventas',
    PRODUCTOS: 'productos',
    MESAS: 'mesas',
    ERRORES: 'errores',
    CIERRES: 'cierres',
    CONSUMOS: 'consumos',
    CONFIGURACION: 'configuracion',
    CAJA: 'caja',
    LOTES: 'lotes_agotados'
};

const DOC_IDS = {
    TODOS: 'todos',
    TODAS: 'todas',
    BILLAR: 'billar',
    CONSUMO: 'consumo',
    HISTORIAL: 'historial',
    DUENO: 'dueno',
    GENERAL: 'general'
};

// ========== VARIABLES GLOBALES ==========
let usuarioActual = null;
let usuarios = [];
let mesas = [];
let ventas = [];
let productos = [];
let erroresReportados = [];
let mesasConsumo = [];
let timers = {};
let productoEditando = null;
let usuarioEditando = null;
let mesaConsumoActual = null;
let tipoMesaActual = null;
let tabActual = 'mesas';
let cierres = [];
let ultimoCierre = null;
let consumosDueno = [];
let movimientos = []; // Nuevos movimientos de caja (egresos/ingresos extra)
let lotesAgotados = []; // Historial de lotes de productos agotados
let ordenInventarioActual = 'default'; // 📦 Variable para el orden del inventario

// ========== CONFIGURACIÓN DE SEGURIDAD ==========
const TIEMPO_EXPIRACION = 30 * 60 * 1000;
let timerInactividad = null;

function iniciarMonitoreoInactividad() {
    debugLog('seguridad', '🔐 Iniciando monitoreo de inactividad');
    actualizarTimestampActividad();

    const eventos = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    eventos.forEach(evento => {
        document.addEventListener(evento, actualizarTimestampActividad, true);
    });

    timerInactividad = setInterval(verificarInactividad, 60000);
}

function detenerMonitoreoInactividad() {
    debugLog('seguridad', '🔓 Deteniendo monitoreo de inactividad');

    if (timerInactividad) {
        clearInterval(timerInactividad);
        timerInactividad = null;
    }

    const eventos = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    eventos.forEach(evento => {
        document.removeEventListener(evento, actualizarTimestampActividad, true);
    });
}

function actualizarTimestampActividad() {
    if (usuarioActual) {
        localStorage.setItem('ultimaActividad', Date.now().toString());
    }
}

function verificarInactividad() {
    if (!usuarioActual) return;

    const ultimaActividad = parseInt(localStorage.getItem('ultimaActividad') || '0');
    const tiempoInactivo = Date.now() - ultimaActividad;

    debugLog('seguridad', `⏱️ Tiempo inactivo: ${Math.floor(tiempoInactivo / 60000)} minutos`);

    if (tiempoInactivo >= TIEMPO_EXPIRACION) {
        debugLog('seguridad', '⏰ Sesión cerrada por inactividad');
        cerrarSesionPorInactividad();
    }
}

function cerrarSesionPorInactividad() {
    usuarioActual = null;
    localStorage.removeItem('ultimaActividad');
    detenerMonitoreoInactividad();

    window.firebaseAuth.signOut();

    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainScreen').classList.add('hidden');

    alert('🔒 Tu sesión se cerró automáticamente por 30 minutos de inactividad.');
}

// ===================================
// ========== UTILIDADES ==========
// ===================================

function mostrarError(mensaje) {
    alert('⚠️ ' + mensaje);
    debugLog('error', '🚨 Error mostrado al usuario', mensaje);
}

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
}

function mostrarPantallaPrincipal() {
    debugLog('sistema', '🔄 Mostrando pantalla principal...', { mesas: mesas.length });

    const loginScreen = document.getElementById('loginScreen');
    const mainScreen = document.getElementById('mainScreen');

    if (!loginScreen || !mainScreen) {
        debugLog('error', '❌ Elementos de pantalla no encontrados');
        alert('Error: Elementos de la interfaz no encontrados. Recarga la página.');
        return;
    }

    loginScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');

    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');

    if (userName) userName.textContent = usuarioActual.nombre;
    if (userRole) userRole.textContent = usuarioActual.rol.toUpperCase();

    iniciarMonitoreoInactividad();

    const toggleElement = (id, show) => {
        const el = document.getElementById(id);
        if (el) {
            if (show) el.classList.remove('hidden');
            else el.classList.add('hidden');
        }
    };

    if ((usuarioActual.rol || '').toLowerCase() === 'admin') {
        toggleElement('btnUsuarios', true);
        toggleElement('btnAgregarMesa', true);
        toggleElement('btnAgregarMesaConsumo', true);
        toggleElement('btnUsuarios', true);
        toggleElement('btnAgregarMesa', true);
        toggleElement('btnAgregarMesaConsumo', true);
        toggleElement('btnTabErrores', true);
        toggleElement('btnReportarError', false);
        toggleElement('btnAgregarProducto', true);
        toggleElement('btnTabConsumoDueno', true);
        toggleElement('btnTabDashboard', true);
        toggleElement('btnTabCaja', true);
        toggleElement('sectionLotesAgotados', true);
        toggleElement('btnEliminarVentas', true);
    } else {
        toggleElement('btnUsuarios', false);
        toggleElement('btnAgregarMesa', false);
        toggleElement('btnAgregarMesaConsumo', false);
        toggleElement('btnUsuarios', false);
        toggleElement('btnAgregarMesa', false);
        toggleElement('btnAgregarMesaConsumo', false);
        toggleElement('btnTabErrores', false);
        toggleElement('btnReportarError', true);
        toggleElement('btnAgregarProducto', false);
        toggleElement('btnTabConsumoDueno', false);
        toggleElement('btnTabDashboard', false);
        toggleElement('btnTabCaja', false);
        toggleElement('sectionLotesAgotados', false);
        toggleElement('btnEliminarVentas', false);
    }

    try {
        actualizarMesas();
        actualizarMesasConsumo();
        actualizarTablaVentas();
        actualizarInventario();
        calcularTotal();
        actualizarConsumoDueno();
    } catch (e) {
        debugLog('error', '❌ Error al cargar datos de pantalla', e);
    }
    debugLog('sistema', '✅ Pantalla principal mostrada completamente');
}

// ========== TABS ==========
window.changeTab = function (tab, event) {
    tabActual = tab;
    debugLog('sistema', '📑 Cambiando tab', { tab });

    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

    // Manejar el ID especial para consumoDueno
    let tabContentId;
    if (tab === 'consumoDueno') {
        tabContentId = 'consumoDuenoTab';
    } else {
        tabContentId = 'tab' + tab.charAt(0).toUpperCase() + tab.slice(1);
    }

    const tabContent = document.getElementById(tabContentId);
    if (tabContent) {
        tabContent.classList.add('active');
        debugLog('sistema', `✅ Tab activado: ${tabContentId}`);
    } else {
        debugLog('error', `❌ Tab no encontrado: ${tabContentId}`);
    }

    if (event && event.currentTarget) event.currentTarget.classList.add('active');

    if (tab === 'reportes') {
        generarReporte();
    } else if (tab === 'errores') {
        actualizarErrores();
    } else if (tab === 'inventario') {
        actualizarInventario();
        actualizarTablaLotes();
    } else if (tab === 'consumoDueno') {
        actualizarConsumoDueno();
    } else if (tab === 'dashboard') {
        actualizarDashboardFinanciero();
    } else if (tab === 'caja') {
        actualizarTablaMovimientos();
    }
};

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function () {
    debugLog('sistema', '🚀 Iniciando aplicación...');
    showLoading();

    await esperarFirebase();

    window.firebaseAuth.onAuthChange(async (user) => {
        if (USE_LOCAL_STORAGE) {
            // En modo local, si ya hay una sesión de prueba en sessionStorage, la usamos
            const sessionLocal = sessionStorage.getItem('billar_active_session');
            if (sessionLocal) {
                const testUser = JSON.parse(sessionLocal);
                await cargarDatos();
                usuarioActual = testUser;
                mostrarPantallaPrincipal();
                hideLoading();
                return;
            }
        }

        if (user) {
            debugLog('sistema', '✅ Usuario autenticado detectado', { uid: user.uid });

            const ultimaActividad = parseInt(localStorage.getItem('ultimaActividad') || '0');
            const tiempoInactivo = Date.now() - ultimaActividad;

            if (ultimaActividad > 0 && tiempoInactivo >= TIEMPO_EXPIRACION) {
                debugLog('seguridad', '❌ Sesión expirada por inactividad, cerrando...');
                await window.firebaseAuth.signOut();
                localStorage.removeItem('ultimaActividad');
                alert('🔒 Tu sesión expiró por inactividad. Por favor, inicia sesión nuevamente.');
                hideLoading();
                return;
            }

            try {
                await new Promise(resolve => setTimeout(resolve, 800));
                await cargarDatos();

                const username = user.email.split('@')[0];
                const usuario = usuarios.find(u => u.username === username);

                if (usuario) {
                    usuarioActual = usuario;
                    usuarioActual.uid = user.uid;
                    localStorage.setItem('ultimaActividad', Date.now().toString());
                    mostrarPantallaPrincipal();
                } else {
                    debugLog('error', '❌ Usuario autenticado pero no encontrado en Firestore');
                    await window.firebaseAuth.signOut();
                    alert('Error: Tu usuario no está registrado en el sistema. Contacta al administrador.');
                }
            } catch (error) {
                debugLog('error', '❌ Error al cargar datos', error);

                if (error.code === 'permission-denied' || error.message.includes('permissions')) {
                    await window.firebaseAuth.signOut();
                    alert('Error de permisos. Por favor, inicia sesión nuevamente.');
                } else {
                    alert('Error al cargar datos: ' + error.message);
                }
            }
        } else {
            debugLog('sistema', '⏳ Sin sesión activa');
        }

        hideLoading();
    });

    // ========== KEYBOARD SHORTCUTS ==========
    document.addEventListener('keydown', function (e) {
        // Enter key for Login
        if (e.key === 'Enter') {
            const loginScreen = document.getElementById('loginScreen');
            if (loginScreen && !loginScreen.classList.contains('hidden')) {
                e.preventDefault();
                handleLogin();
                return;
            }

            // Enter key for Modal primary actions
            const activeModal = document.querySelector('.modal.show');
            if (activeModal) {
                // Find the primary button (usually green/save button)
                const primaryBtn = activeModal.querySelector('.btn-green, .btn-primary, .btn-blue');
                if (primaryBtn && !primaryBtn.disabled) {
                    e.preventDefault();
                    primaryBtn.click();
                }
            }
        }

        // Esc key for closing modals
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.show');
            if (activeModal) {
                e.preventDefault();
                // Find the close button or cancel button
                const closeBtn = activeModal.querySelector('.close-btn, .btn-gray');
                if (closeBtn) {
                    closeBtn.click();
                }
            }
        }
    });
});

function esperarFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = setInterval(() => {
            if (window.firebaseDB && window.firebaseDB.isReady() && window.firebaseAuth) {
                clearInterval(checkFirebase);
                debugLog('firebase', '✅ Firebase disponible');
                resolve();
            }
        }, 100);

        setTimeout(() => {
            clearInterval(checkFirebase);
            if (!window.firebaseDB || !window.firebaseAuth) {
                console.error('❌ Firebase no se cargó correctamente');
                alert('Error: Firebase no está disponible. Recarga la página.');
            }
            resolve();
        }, 10000);
    });
}

async function cargarDatos() {
    debugLog('firebase', USE_LOCAL_STORAGE ? '📂 Cargando datos desde LOCAL STORAGE...' : '📂 Cargando datos desde Firebase...');

    // Helper para cargar dependiendo del modo
    const getData = async (col, doc) => {
        if (USE_LOCAL_STORAGE) {
            const data = localStorage.getItem(`billar_${col}_${doc}`);
            return data ? JSON.parse(data) : null;
        }
        return await window.firebaseDB.get(col, doc);
    };

    try {
        const usuariosData = await getData(COLLECTIONS.USUARIOS, DOC_IDS.TODOS);
        if (usuariosData && usuariosData.lista) {
            usuarios = usuariosData.lista;
        } else {
            usuarios = [];
            await guardarDatosGenerico(COLLECTIONS.USUARIOS, DOC_IDS.TODOS, { lista: usuarios });
        }

        const config = await getData(COLLECTIONS.CONFIGURACION, DOC_IDS.GENERAL);
        if (config) {
            document.getElementById('tarifaHora').value = config.tarifaHora || 5.00;
            document.getElementById('tarifaExtra5Min').value = config.tarifaExtra5Min || 0.50;
        }

        const ventasData = await getData(COLLECTIONS.VENTAS, DOC_IDS.TODAS);
        ventas = ventasData?.lista || [];

        const productosData = await getData(COLLECTIONS.PRODUCTOS, DOC_IDS.TODOS);
        productos = productosData?.lista || [];

        const erroresData = await getData(COLLECTIONS.ERRORES, DOC_IDS.TODOS);
        erroresReportados = erroresData?.lista || [];

        const cierresData = await getData(COLLECTIONS.CIERRES, DOC_IDS.HISTORIAL);
        cierres = cierresData?.lista || [];

        if (cierres.length > 0) {
            ultimoCierre = cierres[cierres.length - 1].timestamp;
        }

        const consumosDuenoData = await getData(COLLECTIONS.CONSUMOS, DOC_IDS.DUENO);
        consumosDueno = consumosDuenoData?.lista || [];

        const lotesData = await getData(COLLECTIONS.LOTES, DOC_IDS.TODOS);
        lotesAgotados = lotesData?.lista || [];

        const cajaData = await getData(COLLECTIONS.CAJA, DOC_IDS.TODOS);
        movimientos = cajaData?.lista || [];

        const mesasData = await getData(COLLECTIONS.MESAS, DOC_IDS.BILLAR);
        if (mesasData && mesasData.lista) {
            mesas = mesasData.lista;
        } else {
            mesas = [
                { id: 1, ocupada: false, inicio: null, tiempoTranscurrido: 0, consumos: [] },
                { id: 2, ocupada: false, inicio: null, tiempoTranscurrido: 0, consumos: [] },
                { id: 3, ocupada: false, inicio: null, tiempoTranscurrido: 0, consumos: [] },
                { id: 4, ocupada: false, inicio: null, tiempoTranscurrido: 0, consumos: [] }
            ];
            await guardarDatosGenerico(COLLECTIONS.MESAS, DOC_IDS.BILLAR, { lista: mesas });
        }

        const mesasConsumoData = await getData(COLLECTIONS.MESAS, DOC_IDS.CONSUMO);
        mesasConsumo = mesasConsumoData?.lista || [
            { id: 1, ocupada: false, consumos: [], total: 0 },
            { id: 2, ocupada: false, consumos: [], total: 0 }
        ];

        const movimientosData = await getData(COLLECTIONS.CAJA, DOC_IDS.HISTORIAL);
        movimientos = movimientosData?.lista || [];

        debugLog('firebase', '✅ Todos los datos cargados correctamente');

    } catch (error) {
        console.error('Error cargando datos:', error);
        throw error;
    }
}

// ========== FUNCIONES DE GUARDADO GENÉRICO ==========
async function guardarDatosGenerico(coleccion, docId, data) {
    try {
        if (USE_LOCAL_STORAGE) {
            localStorage.setItem(`billar_${coleccion}_${docId}`, JSON.stringify(data));
            debugLog('firebase', `💾 Datos guardados LOCALMENTE en ${coleccion}/${docId}`);
            return;
        }
        await window.firebaseDB.set(coleccion, docId, data);
        debugLog('firebase', `💾 Datos guardados en ${coleccion}/${docId}`);
    } catch (error) {
        console.error(`❌ Error guardando en ${coleccion}/${docId}:`, error);
        mostrarError(`Error al guardar datos en ${coleccion}`);
    }
}

async function guardarUsuarios() {
    await guardarDatosGenerico(COLLECTIONS.USUARIOS, DOC_IDS.TODOS, { lista: usuarios });
}

async function guardarVentas() {
    await guardarDatosGenerico(COLLECTIONS.VENTAS, DOC_IDS.TODAS, { lista: ventas });
}

async function guardarProductos() {
    await guardarDatosGenerico(COLLECTIONS.PRODUCTOS, DOC_IDS.TODOS, { lista: productos });
}

async function guardarMesas() {
    await guardarDatosGenerico(COLLECTIONS.MESAS, DOC_IDS.BILLAR, { lista: mesas });
}

async function guardarMesasConsumo() {
    await guardarDatosGenerico(COLLECTIONS.MESAS, DOC_IDS.CONSUMO, { lista: mesasConsumo });
}

async function guardarMovimientos() {
    await guardarDatosGenerico(COLLECTIONS.CAJA, DOC_IDS.HISTORIAL, { lista: movimientos });
}

async function guardarErrores() {
    await guardarDatosGenerico(COLLECTIONS.ERRORES, DOC_IDS.TODOS, { lista: erroresReportados });
}

async function guardarCierres() {
    await guardarDatosGenerico(COLLECTIONS.CIERRES, DOC_IDS.HISTORIAL, { lista: cierres });
}

async function guardarConsumosDueno() {
    await guardarDatosGenerico(COLLECTIONS.CONSUMOS, DOC_IDS.DUENO, { lista: consumosDueno });
}

async function guardarConfiguracion() {
    const config = {
        tarifaHora: parseFloat(document.getElementById('tarifaHora').value) || 5.00,
        tarifaExtra5Min: parseFloat(document.getElementById('tarifaExtra5Min').value) || 0.50
    };
    await guardarDatosGenerico(COLLECTIONS.CONFIGURACION, DOC_IDS.GENERAL, config);

    mesas.forEach(mesa => {
        if (mesa.ocupada) actualizarTimer(mesa.id);
    });

    alert('✅ Configuración guardada correctamente');
}

window.guardarConfiguracion = guardarConfiguracion;

// ========== LOGIN / LOGOUT ==========
window.handleLogin = async function () {
    const btnLogin = document.getElementById('btnLogin');
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    if (!username || !password) {
        errorDiv.textContent = 'Por favor completa todos los campos';
        errorDiv.classList.remove('hidden');
        return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = 'Iniciando...';

    if (USE_LOCAL_STORAGE) {
        // MODO PRUEBA LOCAL: admin / admin123
        if ((username === 'admin' && password === 'admin123') || (username === 'test' && password === 'test')) {
            await cargarDatos();
            usuarioActual = {
                id: Date.now(),
                nombre: username === 'admin' ? 'Administrador Pruebas' : 'Usuario Pruebas',
                username: username,
                rol: username === 'admin' ? 'admin' : 'empleado'
            };
            sessionStorage.setItem('billar_active_session', JSON.stringify(usuarioActual));
            mostrarPantallaPrincipal();
            hideLoading();
            btnLogin.disabled = false;
            btnLogin.textContent = 'Iniciar Sesión';
            return;
        } else {
            errorDiv.textContent = 'Modo Local: Usa admin/admin123 o test/test';
            errorDiv.classList.remove('hidden');
            btnLogin.disabled = false;
            btnLogin.textContent = 'Iniciar Sesión';
            return;
        }
    }

    try {
        let email = username;
        if (!username.includes('@')) {
            email = `${username}@billar.app`;
        }

        debugLog('sistema', '🔐 Intentando login con Firebase Auth', { email });

        await window.firebaseAuth.signIn(email, password);

        debugLog('sistema', '✅ Autenticación iniciada');

        errorDiv.classList.add('hidden');
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';

    } catch (error) {
        console.error('❌ Error en login:', error);

        if (error.code === 'auth/user-not-found') {
            errorDiv.textContent = 'Usuario no existe';
        } else if (error.code === 'auth/wrong-password') {
            errorDiv.textContent = 'Contraseña incorrecta';
        } else if (error.code === 'auth/invalid-email') {
            errorDiv.textContent = 'Email inválido';
        } else if (error.code === 'auth/invalid-credential') {
            errorDiv.textContent = 'Credenciales incorrectas';
        } else if (error.code === 'auth/too-many-requests') {
            errorDiv.textContent = 'Demasiados intentos. Espera un momento.';
        } else {
            errorDiv.textContent = 'Error al iniciar sesión. Intenta nuevamente.';
        }

        errorDiv.classList.remove('hidden');
        debugLog('error', '❌ Login fallido', { error: error.code || error.message });

    } finally {
        btnLogin.disabled = false;
        btnLogin.textContent = 'Iniciar Sesión';
    }
};

window.handleLogout = async function () {
    debugLog('sistema', '👋 Cerrando sesión...', { usuario: usuarioActual ? usuarioActual.nombre : null });

    try {
        if (!USE_LOCAL_STORAGE) {
            await window.firebaseAuth.signOut();
            debugLog('sistema', '✅ Sesión cerrada en Firebase Auth');
        }
    } catch (error) {
        console.error('❌ Error al cerrar sesión:', error);
    }

    usuarioActual = null;
    sessionStorage.removeItem('billar_active_session');
    localStorage.removeItem('ultimaActividad');
    detenerMonitoreoInactividad();

    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainScreen').classList.add('hidden');
    const btnLogin = document.getElementById('btnLogin');
    if (btnLogin) {
        btnLogin.disabled = false;
        btnLogin.textContent = 'Iniciar Sesión';
    }
};

// ========== GESTIÓN DE MESAS ==========
window.agregarMesa = async function () {
    if (usuarioActual.rol !== 'admin') {
        mostrarError('Solo los administradores pueden agregar mesas');
        return;
    }

    const nuevoId = mesas.length > 0 ? Math.max(...mesas.map(m => m.id)) + 1 : 1;
    mesas.push({
        id: nuevoId,
        ocupada: false,
        inicio: null,
        tiempoTranscurrido: 0,
        consumos: []
    });
    await guardarMesas();
    actualizarMesas();
    debugLog('timer', '➕ Mesa agregada', { id: nuevoId });
};

window.eliminarMesa = async function (id) {
    if (usuarioActual.rol !== 'admin') {
        mostrarError('Solo los administradores pueden eliminar mesas');
        return;
    }

    const mesa = mesas.find(m => m.id === id);
    if (mesa && mesa.ocupada) {
        mostrarError('No puedes eliminar una mesa ocupada. Finalízala primero.');
        return;
    }

    if (!confirm('¿Estás seguro de eliminar esta mesa?')) return;

    mesas = mesas.filter(m => m.id !== id);
    if (timers[id]) {
        clearInterval(timers[id]);
        delete timers[id];
    }
    await guardarMesas();
    actualizarMesas();
    debugLog('timer', '🗑️ Mesa eliminada', { id });
};

function actualizarMesas() {
    const container = document.getElementById('mesasContainer');
    if (!container) {
        debugLog('error', '⚠️ Contenedor mesasContainer NO ENCONTRADO');
        return;
    }

    if (!usuarioActual) {
        debugLog('error', '⚠️ No hay usuario activo');
        return;
    }

    debugLog('sistema', '🔄 Actualizando mesas...', { total: mesas.length });

    // Limpiar timers de mesas eliminadas
    Object.keys(timers).forEach(id => {
        if (!mesas.find(m => m.id === parseInt(id))) {
            clearInterval(timers[id]);
            delete timers[id];
        }
    });

    // Identificar mesas actuales en el DOM
    const mesasExistentes = Array.from(container.children).map(el => parseInt(el.id.replace('mesa-', '')));
    const mesasIds = mesas.map(m => m.id);

    // Eliminar mesas que ya no existen
    mesasExistentes.forEach(id => {
        if (!mesasIds.includes(id)) {
            const el = document.getElementById(`mesa-${id}`);
            if (el) el.remove();
        }
    });

    mesas.forEach(mesa => {
        let mesaDiv = document.getElementById(`mesa-${mesa.id}`);
        const isNew = !mesaDiv;

        if (isNew) {
            mesaDiv = document.createElement('div');
            mesaDiv.id = `mesa-${mesa.id}`;
            container.appendChild(mesaDiv);
        }

        // Actualizar clases solo si cambiaron
        const nuevaClase = `mesa-card ${mesa.ocupada ? 'mesa-ocupada' : 'mesa-disponible'}`;
        if (mesaDiv.className !== nuevaClase) {
            mesaDiv.className = nuevaClase;
        }

        // Construir HTML interno
        const htmlContent = `
            ${usuarioActual.rol === 'admin' ? `<button class="delete-mesa-btn" onclick="eliminarMesa(${mesa.id})">×</button>` : ''}
            <h3>Mesa ${mesa.id}</h3>
            <span class="mesa-status ${mesa.ocupada ? 'status-ocupada' : 'status-disponible'}">
                ${mesa.ocupada ? 'OCUPADA' : 'DISPONIBLE'}
            </span>
            <div id="timer-${mesa.id}" class="mesa-timer ${mesa.ocupada ? '' : 'hidden'}">
                <div class="timer-display">00:00:00</div>
                <div class="costo-display">S/ 0.00</div>
            </div>
            <button class="btn ${mesa.ocupada ? 'btn-red' : 'btn-primary'}" onclick="toggleMesa(${mesa.id})" style="width: 100%; margin-bottom: 8px;">
                ${mesa.ocupada ? '⏹️ Finalizar' : '▶️ Iniciar'}
            </button>
            ${mesa.ocupada ? `<button class="btn btn-blue" onclick="abrirModalConsumo(${mesa.id}, 'billar')" style="width: 100%;">🛒 Consumo</button>` : ''}
        `;

        // Actualizar HTML solo si es nuevo o si hay cambios significativos (simplificado: siempre actualizamos el contenido interno para asegurar estado, 
        // pero el contenedor principal se mantiene, evitando parpadeo de layout)
        // Para optimizar más, podríamos actualizar solo partes específicas, pero mantener el contenedor div evita el parpadeo más grave.
        // Sin embargo, si reescribimos innerHTML, los timers se pueden reiniciar visualmente si no se manejan con cuidado.
        // El timer se actualiza via 'actualizarTimer' que busca por ID, así que mientras los IDs existan, funcionará.

        if (mesaDiv.innerHTML !== htmlContent) {
            mesaDiv.innerHTML = htmlContent;
        }

        // Gestión de timers
        if (mesa.ocupada && mesa.inicio) {
            if (!timers[mesa.id]) {
                mesa.tiempoTranscurrido = Math.floor((Date.now() - mesa.inicio) / 1000);
                actualizarTimer(mesa.id);
                timers[mesa.id] = setInterval(() => actualizarTimer(mesa.id), 1000);
            } else {
                // Si ya existe el timer, nos aseguramos de actualizar la vista inmediatamente
                actualizarTimer(mesa.id);
            }
        } else if (timers[mesa.id]) {
            clearInterval(timers[mesa.id]);
            delete timers[mesa.id];
        }
    });
}

window.toggleMesa = function (id) {
    const mesa = mesas.find(m => m.id === id);
    if (!mesa) return;

    if (mesa.ocupada) {
        const tiempoTranscurrido = Math.floor((Date.now() - mesa.inicio) / 1000);
        const resultado = calcularCostoTiempo(tiempoTranscurrido);

        let mensaje = `¿Finalizar Mesa ${id}?\n\n`;
        mensaje += `⏱️ Tiempo: ${resultado.minutos} minutos (${resultado.horas}h ${resultado.minutosExtra}min)\n`;
        mensaje += `💵 Costo tiempo: S/ ${resultado.costo.toFixed(2)}\n`;

        const totalConsumos = mesa.consumos ? mesa.consumos.reduce((sum, c) => sum + (c.precio * c.cantidad), 0) : 0;
        const totalFinal = resultado.costo + totalConsumos;

        if (totalConsumos > 0) {
            mensaje += `🛒 Consumos: S/ ${totalConsumos.toFixed(2)}\n`;
        }

        mensaje += `💰 TOTAL: S/ ${totalFinal.toFixed(2)}\n\n`;

        if (totalFinal <= 0) {
            mensaje += `⚠️ No hay consumos ni tiempo significativo acumulado.\n`;
            mensaje += `La mesa se cerrará sin generar venta.`;
        }

        if (!confirm(mensaje)) return;

        finalizarMesa(id);
    } else {
        iniciarMesa(id);
    }
};

async function iniciarMesa(id) {
    const mesa = mesas.find(m => m.id === id);
    mesa.ocupada = true;
    mesa.inicio = Date.now();
    mesa.tiempoTranscurrido = 0;
    mesa.consumos = [];
    await guardarMesas();

    debugLog('timer', '▶️ Mesa iniciada', { id });
    actualizarMesas();
}

// ========== FUNCIÓN AUXILIAR: ORDENAR PRODUCTOS CON LICORES PRIMERO ==========
function ordenarProductosPorCategoria(productos) {
    const ordenCategorias = {
        'Licores': 1,
        'Gaseosas': 2,
        'Golosinas': 3,
        'Otros': 4
    };

    return [...productos].sort((a, b) => {
        const categoriaA = a.categoria || 'Otros';
        const categoriaB = b.categoria || 'Otros';

        const ordenA = ordenCategorias[categoriaA] || 99;
        const ordenB = ordenCategorias[categoriaB] || 99;

        // Ordenar primero por categoría
        if (ordenA !== ordenB) {
            return ordenA - ordenB;
        }

        // Si son de la misma categoría, ordenar alfabéticamente por nombre
        return a.nombre.localeCompare(b.nombre);
    });
}

function calcularCostoTiempo(segundos) {
    const tarifaHora = parseFloat(document.getElementById('tarifaHora').value) || 5.00;
    const tarifaExtra = parseFloat(document.getElementById('tarifaExtra5Min').value) || 1.00;

    const minutosTotales = Math.floor(segundos / 60);
    const horasCompletas = Math.floor(minutosTotales / 60);
    const minutosRestantes = minutosTotales % 60;

    const costoHoras = horasCompletas * tarifaHora;
    let costoExtra = 0;
    if (minutosRestantes > 5) {
        const minutosDesde6 = minutosRestantes - 5;
        const bloques = Math.ceil(minutosDesde6 / 10);
        costoExtra = bloques * tarifaExtra;
    }

    return {
        costo: costoHoras + costoExtra,
        minutos: minutosTotales,
        horas: horasCompletas,
        minutosExtra: minutosRestantes,
        bloques: minutosRestantes > 5 ? Math.ceil((minutosRestantes - 5) / 10) : 0
    };
}

async function finalizarMesa(id) {
    const mesa = mesas.find(m => m.id === id);
    if (!mesa || !mesa.ocupada) return;

    const horaInicio = new Date(mesa.inicio).toLocaleString('es-PE', {
        hour: '2-digit',
        minute: '2-digit'
    });
    const horaFin = new Date().toLocaleString('es-PE', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const resultado = calcularCostoTiempo(mesa.tiempoTranscurrido);
    const costoTiempo = resultado.costo;

    let totalConsumos = 0;
    let detalleConsumos = [];
    let totalCostoProductos = 0;
    if (mesa.consumos && mesa.consumos.length > 0) {
        mesa.consumos.forEach(c => {
            const subtotal = c.precio * c.cantidad;
            totalConsumos += subtotal;
            detalleConsumos.push({
                producto: c.nombre,
                cantidad: c.cantidad,
                precioUnitario: c.precio,
                subtotal: subtotal
            });
            const prod = productos.find(p => p.id === c.id);
            totalCostoProductos += (prod ? (prod.precioCosto || 0) : 0) * c.cantidad;
        });
    }

    const totalFinal = costoTiempo + totalConsumos;

    if (totalFinal <= 0) {
        // Si no hay cobro (tiempo insignificante y sin consumos), cerramos la mesa sin generar venta
        clearInterval(timers[id]);
        delete timers[id];

        mesa.ocupada = false;
        mesa.inicio = null;
        mesa.tiempoTranscurrido = 0;
        mesa.consumos = [];
        await guardarMesas();

        debugLog('timer', '⏹️ Mesa de billar cerrada (sin cobro)', { id });
        actualizarMesas();
        return;
    }

    // ⭐ NUEVO: Confirmación con Modal de Pago
    const metodoPago = await showModalConfirmacionPago(totalFinal, `Cierre de Mesa Billar ${id}`);
    if (!metodoPago) return;

    // Calcular ganancia neta de la mesa
    let gananciaMesa = costoTiempo; // El tiempo es 100% ganancia
    mesa.consumos.forEach(c => {
        const prod = productos.find(p => p.id === c.id);
        const costo = prod ? (prod.precioCosto || 0) : 0;
        gananciaMesa += (c.precio - costo) * c.cantidad;
    });

    const venta = {
        id: Date.now(),
        tipo: 'Mesa Billar',
        tipoDetalle: `Mesa ${mesa.id}`,
        monto: totalFinal,
        ganancia: gananciaMesa, // ⭐ REGISTRAR GANANCIA
        metodoPago: metodoPago, // ⭐ REGISTRAR MÉTODO
        fecha: new Date().toLocaleString(),
        usuario: usuarioActual.nombre,
        detalle: {
            mesaId: mesa.id,
            horaInicio: horaInicio,
            horaFin: horaFin,
            tiempoMinutos: resultado.minutos,
            tiempoHoras: resultado.horas,
            tiempoMinutosExtra: resultado.minutosExtra,
            costoTiempo: costoTiempo,
            consumos: detalleConsumos,
            totalConsumos: totalConsumos
        }
    };

    ventas.push(venta);
    await guardarVentas();

    clearInterval(timers[id]);
    delete timers[id];

    mesa.ocupada = false;
    mesa.inicio = null;
    mesa.tiempoTranscurrido = 0;
    mesa.consumos = [];
    await guardarMesas();

    alert(`✅ Mesa ${id} finalizada (${metodoPago}).\nTiempo: ${resultado.minutos} minutos (${horaInicio} - ${horaFin})\nTotal: S/ ${totalFinal.toFixed(2)}`);

    actualizarMesas();
    actualizarTablaVentas();
    calcularTotal();
    actualizarDashboardFinanciero(); // 🚀 Reflejar ganancia de tiempo y productos en el dashboard
    actualizarTablaMovimientos(); // 💰 Actualizar balance de Caja Local
}

function actualizarTimer(id) {
    const mesa = mesas.find(m => m.id === id);
    if (!mesa || !mesa.ocupada) return;

    mesa.tiempoTranscurrido = Math.floor((Date.now() - mesa.inicio) / 1000);

    const horas = Math.floor(mesa.tiempoTranscurrido / 3600);
    const minutos = Math.floor((mesa.tiempoTranscurrido % 3600) / 60);
    const segundos = mesa.tiempoTranscurrido % 60;

    const tiempoStr = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    const resultado = calcularCostoTiempo(mesa.tiempoTranscurrido);

    const timerEl = document.querySelector(`#mesa-${id} .timer-display`);
    const costoEl = document.querySelector(`#mesa-${id} .costo-display`);

    if (timerEl) timerEl.textContent = tiempoStr;
    if (costoEl) costoEl.textContent = `S/ ${resultado.costo.toFixed(2)}`;
}

// ========== GESTIÓN DE VENTAS ==========
window.showModalVentaManual = function () {
    document.getElementById('modalVentaManual').classList.add('show');
    document.getElementById('ventaDescripcionManual').value = '';
    document.getElementById('ventaMontoManual').value = '';
};

window.closeModalVentaManual = function () {
    document.getElementById('modalVentaManual').classList.remove('show');
};

window.agregarVentaManual = async function () {
    const btn = document.getElementById('btnGuardarVentaManual');
    const descripcion = document.getElementById('ventaDescripcionManual').value.trim();
    const monto = parseFloat(document.getElementById('ventaMontoManual').value);
    const metodoPago = document.getElementById('metodoPagoManual').value;

    if (!descripcion || isNaN(monto) || monto <= 0) {
        mostrarError('Por favor completa todos los campos correctamente');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const venta = {
        id: Date.now(),
        tipo: 'Venta Manual',
        tipoDetalle: descripcion,
        monto: monto,
        ganancia: monto, // ⭐ Las ventas manuales se consideran 100% utilidad (servicios/varios)
        metodoPago: metodoPago, // ⭐ REGISTRAR MÉTODO
        fecha: new Date().toLocaleString(),
        usuario: usuarioActual.nombre
    };

    ventas.push(venta);
    await guardarVentas();
    actualizarTablaVentas();
    calcularTotal();
    actualizarDashboardFinanciero(); // Actualizar dashboard
    actualizarTablaMovimientos(); // 💰 Actualizar balance de Caja Local
    window.closeModalVentaManual();

    btn.disabled = false;
    btn.textContent = 'Guardar';
};

window.showModalVentaProductos = function () {
    document.getElementById('modalVentaProductos').classList.add('show');
    renderProductosVenta();
};

window.closeModalVentaProductos = function () {
    document.getElementById('modalVentaProductos').classList.remove('show');
};

function renderProductosVenta() {
    const container = document.getElementById('productosVentaContainer');

    if (productos.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 30px; color: #999;">No hay productos disponibles.</p>';
        return;
    }

    // 🍺 Ordenar productos con Licores primero
    const productosOrdenados = ordenarProductosPorCategoria(productos);

    container.innerHTML = productosOrdenados.map(p => {
        const disponible = p.stock > 0;

        return `
            <div class="producto-venta-card ${!disponible ? 'no-stock' : ''}">
                <h4>${p.nombre}</h4>
                <div class="producto-precio-venta">S/ ${p.precio.toFixed(2)}</div>
                <div style="font-size: 14px; color: ${p.stock <= 5 ? '#dc3545' : '#6c757d'};">Stock: ${p.stock}</div>
                
                ${disponible ? `
                    <div style="display: flex; gap: 5px; margin-top: 10px;">
                        <input type="number" id="qty-${p.id}" value="1" min="1" max="${p.stock}" style="width: 60px; text-align: center; border: 1px solid #ccc; border-radius: 5px; padding: 5px;">
                        <button class="btn btn-green" style="flex: 1;" onclick="agregarVentaProducto(${p.id})" id="btn-vender-${p.id}">
                            Vender
                        </button>
                    </div>
                ` : `
                    <button class="btn btn-red" disabled style="width: 100%; margin-top: 10px;">
                        Agotado
                    </button>
                `}
            </div>
        `;
    }).join('');
}

window.agregarVentaProducto = async function (productoId) {
    const btn = document.getElementById(`btn-vender-${productoId}`);
    if (btn.disabled) return;

    btn.disabled = true;
    btn.textContent = 'Procesando...';

    const qtyInput = document.getElementById(`qty-${productoId}`);
    const cantidad = parseInt(qtyInput.value);
    const producto = productos.find(p => p.id === productoId);

    if (!producto || isNaN(cantidad) || cantidad <= 0 || cantidad > producto.stock) {
        mostrarError('Cantidad inválida o stock insuficiente');
        btn.disabled = false;
        btn.textContent = 'Vender';
        return;
    }

    const montoTotal = producto.precio * cantidad;
    const metodoPago = document.getElementById('metodoPagoDirecto').value;

    const venta = {
        id: Date.now(),
        tipo: 'Venta Directa',
        tipoDetalle: `${producto.nombre} x${cantidad}`,
        monto: montoTotal,
        metodoPago: metodoPago, // ⭐ REGISTRAR MÉTODO
        fecha: new Date().toLocaleString(),
        usuario: usuarioActual.nombre,
        detalle: {
            consumos: [{
                producto: producto.nombre,
                cantidad: cantidad,
                precioUnitario: producto.precio,
                subtotal: montoTotal
            }],
            totalConsumos: montoTotal
        }
    };

    ventas.push(venta);
    producto.stock -= cantidad;

    // ⭐ NUEVO: Actualizar ganancia acumulada y registrar en la venta
    const gananciaVenta = await actualizarGananciaProducto(productoId, cantidad);
    venta.ganancia = gananciaVenta;

    await guardarVentas();

    actualizarTablaVentas();
    calcularTotal();
    renderProductosVenta();
    actualizarInventario();
    actualizarDashboardFinanciero();
    actualizarTablaMovimientos(); // 💰 Actualizar balance de Caja Local

    alert(`Venta de ${cantidad}x ${producto.nombre} por S/ ${montoTotal.toFixed(2)} registrada (${metodoPago}).`);

    btn.disabled = false;
    btn.textContent = 'Vender';
};

window.eliminarVenta = async function (id) {
    if (usuarioActual.rol !== 'admin') {
        mostrarError('Solo los administradores pueden eliminar ventas');
        return;
    }

    if (!confirm('¿Estás seguro de eliminar esta venta?')) return;

    ventas = ventas.filter(v => v.id !== id);
    await guardarVentas();
    actualizarTablaVentas();
    calcularTotal();
};

function actualizarTablaVentas() {
    const tbody = document.getElementById('ventasTable');
    if (!tbody) return;

    if (ventas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #999;">No hay ventas registradas</td></tr>';
        return;
    }

    const ventasOrdenadas = [...ventas].reverse();

    tbody.innerHTML = ventasOrdenadas.map(v => {
        const metodo = v.metodoPago || 'Efectivo';
        const metodoColor = metodo === 'Yape' ? '#742284' : '#10b981';

        return `
            <tr>
                <td style="font-size: 13px;">${v.fecha}</td>
                <td>${v.tipoDetalle || v.tipo}</td>
                <td style="font-size: 13px; color: #666;">${v.usuario}</td>
                <td style="text-align: right; font-weight: 600; color: #2d7a4d;">S/ ${v.monto.toFixed(2)}</td>
                <td style="text-align: center;">
                    <span style="background: ${metodoColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${metodo}</span>
                </td>
                <td style="text-align: center;">
                    ${(usuarioActual.rol || '').toLowerCase() === 'admin' ? `<button class="delete-btn" onclick="eliminarVenta(${v.id})">🗑️</button>` : '-'}
                </td>
            </tr>
        `;
    }).join('');
}

function calcularTotal() {
    const ventasActuales = ultimoCierre
        ? ventas.filter(v => v.id > ultimoCierre)
        : ventas;

    const total = ventasActuales.reduce((sum, v) => sum + v.monto, 0);
    const totalEl = document.getElementById('totalDia');
    if (totalEl) totalEl.textContent = `S/ ${total.toFixed(2)}`;
}

// ========== GESTIÓN DE PRODUCTOS ==========
window.showModalProducto = function (producto = null) {
    if (usuarioActual.rol !== 'admin') {
        mostrarError('Solo los administradores pueden gestionar productos');
        return;
    }

    productoEditando = producto;
    const modal = document.getElementById('modalProducto');
    const title = document.getElementById('productoModalTitle');

    if (producto) {
        title.textContent = 'Editar Producto';
        document.getElementById('productoNombre').value = producto.nombre;
        document.getElementById('productoPrecio').value = producto.precio;
        document.getElementById('productoPrecioCosto').value = producto.precioCosto || '';
        document.getElementById('productoCategoria').value = producto.categoria || 'Otros';
        document.getElementById('productoStock').value = producto.stock;
        document.getElementById('productoStockMin').value = producto.stockMin;
        document.getElementById('productoTamanoLote').value = producto.tamanoLote || ''; // Cargar valor existente

        // Calcular y mostrar margen si existe precio de costo
        setTimeout(() => calcularMargenProducto(), 100);
    } else {
        title.textContent = 'Agregar Producto';
        document.getElementById('productoNombre').value = '';
        document.getElementById('productoPrecio').value = '';
        document.getElementById('productoPrecioCosto').value = '';
        document.getElementById('productoCategoria').value = 'Otros';
        document.getElementById('productoStock').value = '';
        document.getElementById('productoStockMin').value = '5';

        // Ocultar indicadores
        document.getElementById('margenIndicador').classList.add('hidden');
        document.getElementById('gananciaTotalIndicador').classList.add('hidden');

        document.getElementById('productoTamanoLote').value = '';
    }

    document.getElementById('productoError').classList.add('hidden');
    modal.classList.add('show');
};

window.editarProducto = function (productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) {
        mostrarError('Producto no encontrado');
        return;
    }
    window.showModalProducto(producto);
};

window.closeModalProducto = function () {
    document.getElementById('modalProducto').classList.remove('show');
    productoEditando = null;
};

window.guardarProducto = async function () {
    if (usuarioActual.rol !== 'admin') return;

    const nombre = document.getElementById('productoNombre').value.trim();
    const precio = parseFloat(document.getElementById('productoPrecio').value);
    const precioCosto = parseFloat(document.getElementById('productoPrecioCosto').value);
    const categoria = document.getElementById('productoCategoria').value;
    const stock = parseInt(document.getElementById('productoStock').value);
    const stockMin = parseInt(document.getElementById('productoStockMin').value);
    const tamanoLote = parseInt(document.getElementById('productoTamanoLote').value) || 0;
    const errorDiv = document.getElementById('productoError');

    // Validaciones
    if (!nombre || isNaN(precio) || precio < 0 || isNaN(stock) || stock < 0 || isNaN(stockMin) || stockMin < 0) {
        errorDiv.textContent = 'Por favor completa todos los campos correctamente';
        errorDiv.classList.remove('hidden');
        return;
    }

    // Validación: precio de costo debe ser menor que precio de venta
    if (!isNaN(precioCosto) && precioCosto > 0 && precioCosto >= precio) {
        errorDiv.textContent = '⚠️ El precio de costo debe ser menor que el precio de venta';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (productoEditando) {
        // Al editar, mantener ganancia acumulada existente
        productoEditando.nombre = nombre;
        productoEditando.precio = precio;
        productoEditando.precioCosto = precioCosto || 0;
        productoEditando.categoria = categoria;
        productoEditando.stock = stock;
        productoEditando.stockMin = stockMin;
        productoEditando.tamanoLote = tamanoLote; // Guardar tamaño de lote

        // Si no existía stockInicial, establecerlo ahora
        if (!productoEditando.stockInicial) {
            productoEditando.stockInicial = stock;
            productoEditando.unidadesVendidas = 0;
            productoEditando.gananciaAcumulada = 0;
            productoEditando.fechaUltimaReposicion = Date.now();
        }
    } else {
        // Crear nuevo producto
        productos.push({
            id: Date.now(),
            nombre,
            precio,
            precioCosto: precioCosto || 0,
            categoria,
            stock,
            stockInicial: stock,
            stockMin,
            tamanoLote, // Guardar nuevo campo
            unidadesVendidas: 0,
            gananciaAcumulada: 0,
            conteoAcumuladoLote: 0, // Iniciar contador de lote
            fechaUltimaReposicion: Date.now()
        });
    }

    await guardarProductos();
    actualizarInventario();
    window.closeModalProducto();

    debugLog('stock', '✅ Producto guardado', { nombre, precio, precioCosto, categoria, tamanoLote });
};

// ========== FUNCIÓN PARA CALCULAR MARGEN EN TIEMPO REAL ==========
window.calcularMargenProducto = function () {
    const precioVenta = parseFloat(document.getElementById('productoPrecio').value) || 0;
    const precioCosto = parseFloat(document.getElementById('productoPrecioCosto').value) || 0;
    const stock = parseInt(document.getElementById('productoStock').value) || 0;

    const margenIndicador = document.getElementById('margenIndicador');
    const gananciaTotalIndicador = document.getElementById('gananciaTotalIndicador');

    if (precioVenta > 0 && precioCosto > 0 && precioCosto < precioVenta) {
        // Calcular margen
        const margenPorUnidad = precioVenta - precioCosto;
        const margenPorcentaje = (margenPorUnidad / precioVenta) * 100;

        // Mostrar margen
        document.getElementById('margenPorcentaje').textContent = margenPorcentaje.toFixed(1) + '%';
        document.getElementById('margenMonto').textContent = margenPorUnidad.toFixed(2);
        margenIndicador.classList.remove('hidden');

        // Calcular ganancia total esperada
        if (stock > 0) {
            const gananciaTotalEsperada = margenPorUnidad * stock;
            document.getElementById('gananciaTotalEsperada').textContent = gananciaTotalEsperada.toFixed(2);
            gananciaTotalIndicador.classList.remove('hidden');
        } else {
            gananciaTotalIndicador.classList.add('hidden');
        }
    } else {
        margenIndicador.classList.add('hidden');
        gananciaTotalIndicador.classList.add('hidden');
    }
};

// ========== FUNCIÓN PARA ACTUALIZAR GANANCIA AL VENDER ==========
async function actualizarGananciaProducto(productoId, cantidadVendida, esGratis = false) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) {
        debugLog('error', '❌ Producto no encontrado para actualizar ganancia', { productoId });
        return;
    }

    // ⭐ Inicialización Robusta (Evita crashes con .toFixed)
    if (producto.stockInicial === undefined) producto.stockInicial = producto.stock + (esGratis ? 0 : cantidadVendida);
    if (producto.unidadesVendidas === undefined) producto.unidadesVendidas = 0;
    if (producto.unidadesConsumidasDueno === undefined) producto.unidadesConsumidasDueno = 0;
    if (producto.gananciaAcumulada === undefined) producto.gananciaAcumulada = 0;
    if (producto.fechaUltimaReposicion === undefined) producto.fechaUltimaReposicion = Date.now();

    // Calcular ganancia de esta venta
    const precioCosto = producto.precioCosto || 0;
    const precioVenta = producto.precio || 0;
    const margenPorUnidad = precioVenta - precioCosto;
    const gananciaDeEstaVenta = margenPorUnidad * cantidadVendida;

    // Actualizar contadores
    if (!esGratis) {
        producto.unidadesVendidas += cantidadVendida;
        producto.gananciaAcumulada += gananciaDeEstaVenta;
    } else {
        producto.unidadesConsumidasDueno += cantidadVendida;
    }

    debugLog('stock', '💰 Ganancia actualizada', {
        producto: producto.nombre,
        cantidadVendida,
        gananciaAcumulada: (producto.gananciaAcumulada || 0).toFixed(2),
        stockRestante: producto.stock
    });

    // Detectar si el producto se agotó (Stock 0) O si se completó un lote acumulado
    let loteCompletado = false;

    // Nueva lógica: Lote Acumulado
    if (producto.tamanoLote && producto.tamanoLote > 0) {
        if (!producto.conteoAcumuladoLote) producto.conteoAcumuladoLote = 0;
        producto.conteoAcumuladoLote += cantidadVendida;

        if (producto.conteoAcumuladoLote >= producto.tamanoLote) {
            loteCompletado = true;
            // Guardamos cuántos lotes se completaron (por si vendió 24 de golpe y lote es 12)
            const lotesHechos = Math.floor(producto.conteoAcumuladoLote / producto.tamanoLote);
            const remanente = producto.conteoAcumuladoLote % producto.tamanoLote;

            // Generar reporte por cada lote completado
            for (let i = 0; i < lotesHechos; i++) {
                await generarReporteAgotamiento(producto, true); // true = reporte parcial por lote
            }

            producto.conteoAcumuladoLote = remanente;

            // Notificar visualmente (discreto)
            debugLog('stock', '📦 Lote acumulado completado', { lotes: lotesHechos, producto: producto.nombre });
        }
    }

    // Lógica original: Stock agotado
    if (producto.stock === 0) {
        mostrarNotificacionAgotamiento(producto);
        await generarReporteAgotamiento(producto, false); // false = reporte final por stock 0
    }

    await guardarProductos();
    return gananciaDeEstaVenta;
}

// ========== FUNCIÓN PARA ARCHIVAR LOTE AGOTADO ==========
async function generarReporteAgotamiento(producto, esParcial = false) {
    // Si es parcial (por lote acumulado), usamos el tamaño de lote como unidades vendidas para el reporte
    // Si es final (stock 0), usamos todo lo acumulado

    let unidadesReporte = 0;
    let gananciaReporte = 0;

    if (esParcial) {
        unidadesReporte = producto.tamanoLote;
        const margen = (producto.precio || 0) - (producto.precioCosto || 0);
        gananciaReporte = margen * unidadesReporte;
    } else {
        // Reporte por agotamiento total (lo que quede)
        // Ojo: Si usas lotes acumulados, el 'total acumulado' ya se fue reportando por partes.
        // Aquí solo reportaríamos el remanente si quisiéramos ser exactos, o todo lo que tenga.
        // Para mantener compatibilidad:
        unidadesReporte = producto.unidadesVendidas;
        gananciaReporte = producto.gananciaAcumulada;
    }

    // Si no hay nada que reportar, salir
    if (unidadesReporte === 0 && !esParcial) return;

    const reporte = {
        id: Date.now(),
        productoId: producto.id,
        nombre: producto.nombre,
        categoria: producto.categoria || 'Otros',
        stockInicial: esParcial ? producto.tamanoLote : (producto.stockInicial || 0),
        unidadesVendidas: unidadesReporte,
        unidadesConsumidasDueno: esParcial ? 0 : (producto.unidadesConsumidasDueno || 0), // En parcial no contamos consumo dueño por ahora
        precioCosto: producto.precioCosto || 0,
        precioVendido: producto.precio || 0,
        gananciaGenerada: gananciaReporte,
        fechaInicio: producto.fechaUltimaReposicion || Date.now(),
        fechaFin: Date.now(),
        tipo: esParcial ? 'Lote Acumulado' : 'Stock Agotado' // Para distinguir
    };

    lotesAgotados.unshift(reporte);

    // Si es reporte final (Stock 0), reiniciamos contadores. 
    // Si es parcial, NO reiniciamos (seguimos acumulando métricas globales del producto, 
    // aunque 'gananciaReporte' se haya calculado para este lote específico).
    // PERO: Si reportamos ganancia aquí, y luego al final reportamos TODA la ganancia acumulada, se duplicaría en el historial.
    // SOLUCIÓN: Si usamos lotes parciales, vamos restando de los acumuladores globales para que el reporte final solo tenga el remanente.

    if (esParcial) {
        producto.unidadesVendidas -= unidadesReporte;
        producto.gananciaAcumulada -= gananciaReporte;
        // No tocamos stockInicial ni fechaUltimaReposicion para que siga contando como el mismo "gran lote" físico hasta que se acabe real.
    } else {
        // Stock 0: Se reinicia todo para el próximo reabastecimiento
        producto.unidadesVendidas = 0;
        producto.unidadesConsumidasDueno = 0;
        producto.gananciaAcumulada = 0;
        producto.fechaUltimaReposicion = Date.now();
        producto.conteoAcumuladoLote = 0;
    }

    await guardarLotesAgotados();
    actualizarTablaLotes();

    debugLog('stock', esParcial ? '📦 Reporte parcial generado' : '📊 Reporte agotado generado', reporte);
}

window.guardarLotesAgotados = async function () {
    await guardarDatosGenerico(COLLECTIONS.LOTES, DOC_IDS.TODOS, { lista: lotesAgotados });
};

// ========== NOTIFICACIÓN CUANDO UN PRODUCTO SE AGOTA ==========
function mostrarNotificacionAgotamiento(producto) {
    const stockInicial = producto.stockInicial || 0;
    const gananciaTotal = producto.gananciaAcumulada || 0;
    const fechaReposicion = producto.fechaUltimaReposicion || Date.now();
    const diasVenta = Math.ceil((Date.now() - fechaReposicion) / (1000 * 60 * 60 * 24));

    let mensaje = `🎉 ¡PRODUCTO AGOTADO!\n\n`;
    mensaje += `${producto.categoria ? getCategoriaEmoji(producto.categoria) : '📦'} ${producto.nombre}\n`;
    mensaje += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensaje += `📦 Unidades vendidas: ${producto.unidadesVendidas || stockInicial}\n`;

    if (gananciaTotal > 0) {
        mensaje += `💰 Ganancia Total del Lote: S/ ${gananciaTotal.toFixed(2)}\n`;
    }

    if (diasVenta > 0) {
        mensaje += `📅 Tiempo de venta: ${diasVenta} día${diasVenta !== 1 ? 's' : ''}\n`;
    }

    mensaje += `━━━━━━━━━━━━━━━━━━━━\n`;
    mensaje += `\n¿Deseas reponer el stock ahora?`;

    if (confirm(mensaje)) {
        // Abrir modal de reposición (usamos el modal de stock existente)
        window.showModalStock(producto.id);
    }

    debugLog('stock', '🎉 Producto agotado', {
        producto: producto.nombre,
        gananciaTotal,
        diasVenta
    });
}

// ========== HELPER: EMOJI DE CATEGORÍA ==========
function getCategoriaEmoji(categoria) {
    const emojis = {
        'Golosinas': '🍬',
        'Gaseosas': '🥤',
        'Licores': '🍺',
        'Otros': '📦'
    };
    return emojis[categoria] || '📦';
}

window.eliminarProducto = async function (id) {
    if (usuarioActual.rol !== 'admin') return;
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    productos = productos.filter(p => p.id !== id);
    await guardarProductos();
    actualizarInventario();
};

window.showModalStock = function (productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;

    productoEditando = producto;
    document.getElementById('stockProductoNombre').textContent = producto.nombre;
    document.getElementById('stockActual').textContent = producto.stock;
    document.getElementById('stockAjuste').value = '';

    const inputAjuste = document.getElementById('stockAjuste');
    if ((usuarioActual.rol || '').toLowerCase() === 'admin') {
        inputAjuste.placeholder = 'Ej: +10 o -5';
        inputAjuste.setAttribute('min', '');
    } else {
        inputAjuste.placeholder = 'Ej: +10 (solo positivos)';
        inputAjuste.setAttribute('min', '1');
    }

    document.getElementById('modalStock').classList.add('show');
};

// --- MODAL DE PAGO UNIVERSAL ---
let resolvePagoActual = null;

window.showModalConfirmacionPago = function (monto, detalle) {
    return new Promise((resolve) => {
        resolvePagoActual = resolve;
        document.getElementById('pagoMonto').textContent = `S/ ${parseFloat(monto).toFixed(2)}`;
        document.getElementById('pagoDetalle').textContent = detalle;
        document.getElementById('modalConfirmacionPago').classList.add('show');

        // Reset default option
        const radios = document.getElementsByName('metodoPagoConf');
        radios[0].checked = true;

        document.getElementById('btnConfirmarPagoFinal').onclick = () => {
            const metodo = document.querySelector('input[name="metodoPagoConf"]:checked').value;
            window.closeModalConfirmacionPago();
            resolve(metodo);
        };
    });
};

window.closeModalConfirmacionPago = function () {
    document.getElementById('modalConfirmacionPago').classList.remove('show');
    resolvePagoActual = null;
};

window.closeModalStock = function () {
    document.getElementById('modalStock').classList.remove('show');
    productoEditando = null;
};

window.ajustarStock = async function () {
    const ajuste = parseInt(document.getElementById('stockAjuste').value);

    if (isNaN(ajuste) || ajuste === 0) {
        mostrarError('Por favor ingresa un valor válido');
        return;
    }

    if (usuarioActual.rol !== 'admin' && ajuste < 0) {
        mostrarError('Los empleados solo pueden agregar stock (números positivos)');
        return;
    }

    const nuevoStock = productoEditando.stock + ajuste;

    if (nuevoStock < 0) {
        mostrarError('El stock no puede ser negativo');
        return;
    }

    // ⭐ Lógica de Reposición (Admin)
    // Si el stock estaba bajo o en 0, y agregamos stock, tratamos como nuevo lote
    if (usuarioActual.rol === 'admin' && ajuste > 0) {
        const confirmarReposicion = confirm(`¿Deseas tratar este ingreso como una REPOSICIÓN DE STOCK?\n\nEsto archivará las estadísticas actuales (unidades vendidas: ${productoEditando.unidadesVendidas || 0}) y reiniciará el contador de ganancia para este nuevo lote.`);

        if (confirmarReposicion) {
            await generarReporteAgotamiento(productoEditando);
            // Reset de lote
            productoEditando.stockInicial = nuevoStock;
            productoEditando.unidadesVendidas = 0;
            productoEditando.unidadesConsumidasDueno = 0;
            productoEditando.gananciaAcumulada = 0;
            productoEditando.fechaUltimaReposicion = Date.now();
        }
    }

    productoEditando.stock = nuevoStock;
    await guardarProductos();
    actualizarInventario();
    window.closeModalStock();
};

window.actualizarTablaLotes = function () {
    const container = document.getElementById('lotesAgotadosContainer');
    if (!container) return;

    if (lotesAgotados.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #991b1b; padding: 20px;">No hay reportes de lotes agotados aún</p>';
        return;
    }

    let totalCostoHistorico = 0;
    let totalVentaHistorica = 0;
    let totalGananciaHistorica = 0;

    container.innerHTML = `
        <table class="ventas-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
                <tr style="background: #e5e7eb; color: #374151; border-bottom: 2px solid #d1d5db;">
                    <th style="padding: 10px; text-align: left;">Producto</th>
                    <th style="padding: 10px; text-align: center;">Vendido</th>
                    <th style="padding: 10px; text-align: center;">Consumo</th>
                    <th style="padding: 10px; text-align: right;">Costo Total</th>
                    <th style="padding: 10px; text-align: right;">VENTA TOTAL</th>
                    <th style="padding: 10px; text-align: right;">GANANCIA</th>
                    <th style="padding: 10px; text-align: center;">Fecha</th>
                </tr>
            </thead>
            <tbody>
                ${lotesAgotados.map(l => {
        const costoLote = (l.unidadesVendidas || 0) * (l.precioCosto || 0);
        const gananciaLote = l.gananciaGenerada || 0;
        const ventaLote = costoLote + gananciaLote;

        totalGananciaHistorica += gananciaLote;

        const esParcial = l.tipo === 'Lote Acumulado';
        const iconoTipo = esParcial ? '📦' : '📉';
        const colorFondo = esParcial ? '#f0f9ff' : '#fff5f5'; // Azulito vs Rojito
        const colorBorde = esParcial ? '#bae6fd' : '#fecaca';

        return `
                    <tr style="border-bottom: 1px solid ${colorBorde}; background: ${colorFondo};">
                        <td style="padding: 10px;">
                            <strong>${l.nombre}</strong><br>
                            <small style="color: #666;">${l.categoria} • ${iconoTipo} ${l.tipo || 'Stock Agotado'}</small>
                        </td>
                        <td style="padding: 10px; text-align: center;">${l.unidadesVendidas} / ${l.stockInicial}</td>
                        <td style="padding: 10px; text-align: center; color: #856404;">${l.unidadesConsumidasDueno || 0}</td>
                        <td style="padding: 10px; text-align: right;">S/ ${costoLote.toFixed(2)}</td>
                        <td style="padding: 10px; text-align: right; font-weight: 600; color: #1e40af;">S/ ${ventaLote.toFixed(2)}</td>
                        <td style="padding: 10px; text-align: right; color: #10b981; font-weight: bold;">+ S/ ${gananciaLote.toFixed(2)}</td>
                        <td style="padding: 10px; text-align: center; font-size: 11px; color: #666;">
                            ${new Date(l.fechaInicio).toLocaleDateString()}<br>--<br>${new Date(l.fechaFin).toLocaleDateString()}
                        </td>
                    </tr>
                `;
    }).join('')}
            </tbody>
            <tfoot style="background: #fef2f2; font-weight: bold; color: #991b1b; border-top: 2px solid #fecaca;">
                <tr>
                    <td colspan="3" style="padding: 15px; text-align: right; font-size: 14px;">TOTAL HISTÓRICO LOTES:</td>
                    <td style="padding: 15px; text-align: right; font-size: 14px;">S/ ${totalCostoHistorico.toFixed(2)}</td>
                    <td style="padding: 15px; text-align: right; font-size: 14px; color: #1e40af;">S/ ${totalVentaHistorica.toFixed(2)}</td>
                    <td style="padding: 15px; text-align: right; font-size: 14px; color: #10b981;">S/ ${totalGananciaHistorica.toFixed(2)}</td>
                    <td></td>
                </tr>
            </tfoot>
        </table>
    `;
};

window.cambiarOrdenInventario = function (valor) {
    debugLog('sistema', '🔄 Cambiando orden de inventario', { orden: valor });
    ordenInventarioActual = valor;
    actualizarInventario();
};

function actualizarInventario() {
    const grid = document.getElementById('inventarioGrid');
    if (!grid) return;

    if (productos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">No hay productos en el inventario</p>';
        return;
    }

    // 📦 LÓGICA DE ORDENAMIENTO
    let productosMostrados = [...productos];

    if (ordenInventarioActual === 'masVendidos') {
        productosMostrados.sort((a, b) => (b.unidadesVendidas || 0) - (a.unidadesVendidas || 0));
    } else if (ordenInventarioActual === 'menosStock') {
        productosMostrados.sort((a, b) => a.stock - b.stock);
    } else if (ordenInventarioActual === 'categoria') {
        productosMostrados.sort((a, b) => (a.categoria || '').localeCompare(b.categoria || ''));
    }

    grid.innerHTML = productosMostrados.map((p, index) => {
        let htmlExtra = '';

        // Si es por categoría, añadir separadores
        if (ordenInventarioActual === 'categoria') {
            const prev = productosMostrados[index - 1];
            if (!prev || prev.categoria !== p.categoria) {
                const catInfo = p.categoria || 'Sin Categoría';
                htmlExtra = `<div style="grid-column: 1/-1; margin-top: 15px; margin-bottom: 5px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; font-weight: bold; color: #4b5563; display: flex; align-items: center; gap: 5px;">
                    ${getCategoriaEmoji(catInfo)} ${catInfo}
                </div>`;
            }
        }
        const stockBajo = p.stock <= p.stockMin;
        const productoJSON = JSON.stringify(p).replace(/"/g, '&quot;');

        // Cálculos financieros
        const precioCosto = p.precioCosto || 0;
        const precioVenta = p.precio || 0;
        const margenPorUnidad = precioVenta - precioCosto;
        const margenPorcentaje = precioCosto > 0 ? (margenPorUnidad / precioVenta) * 100 : 0;

        // Tracking de ventas
        const stockInicial = p.stockInicial || p.stock;
        const unidadesVendidas = p.unidadesVendidas || 0;
        const gananciaAcumulada = p.gananciaAcumulada || 0;
        const gananciaPotencial = margenPorUnidad * p.stock;
        const gananciaTotal = gananciaAcumulada + gananciaPotencial;

        // Barra de progreso
        const porcentajeVendido = stockInicial > 0 ? (unidadesVendidas / stockInicial) * 100 : 0;

        // Emoji de categoría
        const categoriaEmoji = {
            'Golosinas': '🍬',
            'Gaseosas': '🥤',
            'Licores': '🍺',
            'Otros': '📦'
        };
        const emoji = categoriaEmoji[p.categoria] || '📦';

        return `
            ${htmlExtra}
            <div class="producto-card" style="border-left: 4px solid ${stockBajo ? '#dc3545' : '#10b981'};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <div>
                        <h4 style="margin: 0;">${emoji} ${p.nombre}</h4>
                        <small style="color: #666;">${p.categoria || 'Sin categoría'}</small>
                    </div>
                    ${(usuarioActual.rol || '').toLowerCase() === 'admin' ? `
                        <div style="display: flex; gap: 5px;">
                            <button class="btn-small btn-blue" onclick="showModalStock(${p.id})" style="padding: 5px 10px; font-size: 12px;" title="Ajustar Stock">
                                📊
                            </button>
                            <button class="btn-small btn-green" onclick="editarProducto(${p.id})" style="padding: 5px 10px; font-size: 12px;" title="Editar Producto">
                                ✏️
                            </button>
                            <button class="btn-small btn-red" onclick="eliminarProducto(${p.id})" style="padding: 5px 10px; font-size: 12px;" title="Eliminar Producto">
                                🗑️
                            </button>
                        </div>
                    ` : `
                        <button class="btn-small btn-green" onclick="showModalStock(${p.id})" style="padding: 5px 10px; font-size: 12px;" title="Agregar Stock">
                            ➕ Stock
                        </button>
                    `}
                </div>
                
                <!-- Precios -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                    ${(usuarioActual.rol || '').toLowerCase() === 'admin' && precioCosto > 0 ? `
                        <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;">
                            <small style="color: #666; display: block;">💰 Costo</small>
                            <strong>S/ ${precioCosto.toFixed(2)}</strong>
                        </div>
                        <div style="background: #f3f4f6; padding: 8px; border-radius: 6px;">
                            <small style="color: #666; display: block;">💵 Venta</small>
                            <strong>S/ ${precioVenta.toFixed(2)}</strong>
                        </div>
                    ` : `
                        <div style="background: #f3f4f6; padding: 8px; border-radius: 6px; grid-column: 1/-1;">
                            <small style="color: #666; display: block;">💵 Precio de Venta</small>
                            <strong>S/ ${precioVenta.toFixed(2)}</strong>
                        </div>
                    `}
                </div>
                
                ${(usuarioActual.rol || '').toLowerCase() === 'admin' && precioCosto > 0 && margenPorcentaje > 0 ? `
                    <!-- Margen -->
                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 8px; border-radius: 6px; margin-bottom: 12px; text-align: center;">
                        <small style="opacity: 0.9; display: block;">📊 Margen</small>
                        <strong style="font-size: 16px;">${margenPorcentaje.toFixed(1)}%</strong>
                        <span style="font-size: 12px;">(S/ ${margenPorUnidad.toFixed(2)}/u)</span>
                    </div>
                ` : ''}
                
                <!-- Stock -->
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="color: #666; font-size: 13px;">📦 Stock: <strong class="${stockBajo ? 'stock-bajo' : ''}">${p.stock}</strong> / ${stockInicial}</span>
                        ${unidadesVendidas > 0 ? `<span style="color: #10b981; font-size: 13px;">✅ ${unidadesVendidas} vendidas</span>` : ''}
                    </div>
                    ${stockInicial > 0 ? `
                        <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="background: linear-gradient(90deg, #10b981 0%, #059669 100%); height: 100%; width: ${porcentajeVendido}%; transition: width 0.3s;"></div>
                        </div>
                        <small style="color: #666; font-size: 11px;">${porcentajeVendido.toFixed(0)}% vendido</small>
                    ` : ''}
                </div>
                
                ${(usuarioActual.rol || '').toLowerCase() === 'admin' && precioCosto > 0 && (gananciaAcumulada > 0 || gananciaPotencial > 0) ? `
                    <!-- Ganancias -->
                    <div style="background: #f0f9ff; border: 2px solid #3b82f6; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
                        ${gananciaAcumulada > 0 ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="color: #1e40af; font-size: 13px;">💚 Ganancia Acumulada:</span>
                                <strong style="color: #10b981; font-size: 15px;">S/ ${gananciaAcumulada.toFixed(2)}</strong>
                            </div>
                        ` : ''}
                        ${gananciaPotencial > 0 ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="color: #1e40af; font-size: 13px;">💛 Ganancia Potencial:</span>
                                <strong style="color: #f59e0b; font-size: 15px;">S/ ${gananciaPotencial.toFixed(2)}</strong>
                            </div>
                        ` : ''}
                        <div style="border-top: 1px dashed #3b82f6; margin: 8px 0 5px 0; padding-top: 5px;">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #1e40af; font-weight: 600;">🎯 Total Lote:</span>
                                <strong style="color: #1e40af; font-size: 16px;">S/ ${gananciaTotal.toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${stockBajo ? '<div style="padding: 8px; background: #fff3cd; border-radius: 5px; font-size: 12px; color: #856404;">⚠️ Stock bajo</div>' : ''}
            </div>
        `;
    }).join('');

    // Si estamos en el dashboard, actualizarlo también
    if (typeof actualizarDashboardFinanciero === 'function' && usuarioActual.rol === 'admin') {
        const dashContainer = document.getElementById('dashGananciaBruta');
        if (dashContainer) actualizarDashboardFinanciero();
    }
}

// ========== MESAS DE CONSUMO ==========
window.agregarMesaConsumo = async function () {
    if (usuarioActual.rol !== 'admin') {
        mostrarError('Solo los administradores pueden agregar mesas');
        return;
    }

    const nuevoId = mesasConsumo.length > 0 ? Math.max(...mesasConsumo.map(m => m.id)) + 1 : 1;
    mesasConsumo.push({
        id: nuevoId,
        ocupada: false,
        consumos: [],
        total: 0
    });
    await guardarMesasConsumo();
    actualizarMesasConsumo();
    debugLog('sistema', '➕ Mesa de consumo agregada', { id: nuevoId });
};

window.eliminarMesaConsumo = async function (id) {
    if (usuarioActual.rol !== 'admin') {
        mostrarError('Solo los administradores pueden eliminar mesas');
        return;
    }

    const mesa = mesasConsumo.find(m => m.id === id);
    if (mesa && mesa.ocupada) {
        mostrarError('No puedes eliminar una mesa ocupada. Finalízala primero.');
        return;
    }

    if (!confirm('¿Estás seguro de eliminar esta mesa?')) return;

    mesasConsumo = mesasConsumo.filter(m => m.id !== id);
    await guardarMesasConsumo();
    actualizarMesasConsumo();
    debugLog('sistema', '🗑️ Mesa de consumo eliminada', { id });
};

function actualizarMesasConsumo() {
    const container = document.getElementById('mesasConsumoContainer');
    if (!container) return;

    container.innerHTML = '';

    mesasConsumo.forEach(mesa => {
        const mesaDiv = document.createElement('div');
        mesaDiv.className = `mesa-card ${mesa.ocupada ? 'mesa-ocupada' : 'mesa-disponible'}`;

        mesaDiv.innerHTML = `
            ${usuarioActual && usuarioActual.rol === 'admin' ? `<button class="delete-mesa-btn" onclick="eliminarMesaConsumo(${mesa.id})">×</button>` : ''}
            <h3>Mesa ${mesa.id}</h3>
            <span class="mesa-status ${mesa.ocupada ? 'status-ocupada' : 'status-disponible'}">
                ${mesa.ocupada ? 'OCUPADA' : 'DISPONIBLE'}
            </span>
            <div class="costo-display" style="margin: 15px 0;">S/ ${mesa.total.toFixed(2)}</div>
            <button class="btn ${mesa.ocupada ? 'btn-red' : 'btn-primary'}" onclick="toggleMesaConsumo(${mesa.id})" style="width: 100%; margin-bottom: 8px;">
                ${mesa.ocupada ? '⏹️ Finalizar' : '▶️ Iniciar'}
            </button>
            ${mesa.ocupada ? `<button class="btn btn-blue" onclick="abrirModalConsumo(${mesa.id}, 'consumo')" style="width: 100%;">🛒 Consumo</button>` : ''}
        `;
        container.appendChild(mesaDiv);
    });
}

window.toggleMesaConsumo = function (id) {
    const mesa = mesasConsumo.find(m => m.id === id);
    if (!mesa) return;

    if (mesa.ocupada) {
        let mensaje = `¿Finalizar Mesa de Consumo ${id}?\n\n`;

        if (mesa.total > 0) {
            mensaje += `💰 Total a cobrar: S/ ${mesa.total.toFixed(2)}\n\n`;

            if (mesa.consumos && mesa.consumos.length > 0) {
                mensaje += `🛒 Productos:\n`;
                mesa.consumos.forEach(c => {
                    mensaje += `   • ${c.nombre} x${c.cantidad} = S/ ${(c.precio * c.cantidad).toFixed(2)}\n`;
                });
            }
        } else {
            mensaje += `⚠️ No hay consumos registrados.\n`;
            mensaje += `La mesa se cerrará sin generar venta.`;
        }

        if (!confirm(mensaje)) return;

        finalizarMesaConsumo(id);
    } else {
        iniciarMesaConsumo(id);
    }
};

async function iniciarMesaConsumo(id) {
    const mesa = mesasConsumo.find(m => m.id === id);
    mesa.ocupada = true;
    mesa.consumos = [];
    mesa.total = 0;
    await guardarMesasConsumo();

    debugLog('sistema', '▶️ Mesa de consumo iniciada', { id });
    actualizarMesasConsumo();
}

async function finalizarMesaConsumo(id) {
    const mesa = mesasConsumo.find(m => m.id === id);
    if (!mesa || !mesa.ocupada) return;

    if (mesa.total <= 0) {
        // Si no hay consumo, simplemente cerramos la mesa sin generar venta ni pedir pago
        mesa.ocupada = false;
        mesa.consumos = [];
        mesa.total = 0;
        await guardarMesasConsumo();
        actualizarMesasConsumo();
        debugLog('sistema', '⏹️ Mesa de consumo cerrada (sin consumos)', { id });
        return;
    }

    // ⭐ NUEVO: Confirmación con Modal de Pago
    const metodoPago = await showModalConfirmacionPago(mesa.total, `Cierre de Mesa Consumo ${id}`);
    if (!metodoPago) return;

    let detalleConsumos = [];
    let totalCostoProductos = 0;
    if (mesa.consumos && mesa.consumos.length > 0) {
        mesa.consumos.forEach(c => {
            const subtotal = c.precio * c.cantidad;
            detalleConsumos.push({
                producto: c.nombre,
                cantidad: c.cantidad,
                precioUnitario: c.precio,
                subtotal: subtotal
            });
            const prod = productos.find(p => p.id === c.id);
            totalCostoProductos += (prod ? (prod.precioCosto || 0) : 0) * c.cantidad;
        });
    }

    // Calcular ganancia neta de la mesa de consumo
    let gananciaMesaConsumo = 0;
    mesa.consumos.forEach(c => {
        const prod = productos.find(p => p.id === c.id);
        const costo = prod ? (prod.precioCosto || 0) : 0;
        gananciaMesaConsumo += (c.precio - costo) * c.cantidad;
    });

    const venta = {
        id: Date.now(),
        tipo: 'Mesa Consumo',
        tipoDetalle: `Mesa Consumo ${mesa.id}`,
        monto: mesa.total,
        ganancia: gananciaMesaConsumo, // ⭐ REGISTRAR GANANCIA
        metodoPago: metodoPago, // ⭐ REGISTRAR MÉTODO
        fecha: new Date().toLocaleString(),
        usuario: usuarioActual.nombre,
        detalle: {
            mesaId: mesa.id,
            consumos: detalleConsumos,
            totalConsumos: mesa.total
        }
    };

    ventas.push(venta);
    await guardarVentas();

    // Guardar el total antes de resetear
    const totalCobrado = mesa.total;

    mesa.ocupada = false;
    mesa.consumos = [];
    mesa.total = 0;
    await guardarMesasConsumo();

    alert(`✅ Mesa ${id} finalizada (${metodoPago}).\\nTotal cobrado: S/ ${totalCobrado.toFixed(2)}`);

    actualizarMesasConsumo();
    actualizarTablaVentas();
    calcularTotal();
    actualizarDashboardFinanciero(); // 🚀 Reflejar ganancia en el dashboard
    actualizarTablaMovimientos(); // 💰 Actualizar balance de Caja Local
}

// ========== CONSUMOS ==========
window.abrirModalConsumo = function (mesaId, tipo) {
    mesaConsumoActual = mesaId;
    tipoMesaActual = tipo;

    document.getElementById('modalConsumo').classList.add('show');
    document.getElementById('consumoModalTitle').textContent = `Consumo - ${tipo === 'billar' ? 'Mesa de Billar' : 'Mesa de Consumo'} ${mesaId}`;
    renderProductosConsumo();
    actualizarListaConsumos();
};

window.closeModalConsumo = function () {
    document.getElementById('modalConsumo').classList.remove('show');
    mesaConsumoActual = null;
    tipoMesaActual = null;
};

function renderProductosConsumo() {
    const container = document.getElementById('productosConsumoGrid');

    if (!container) {
        debugLog('error', '⚠️ Contenedor de productos de consumo no encontrado');
        return;
    }

    if (productos.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999; grid-column: 1/-1;">No hay productos disponibles.</p>';
        return;
    }

    // 🍺 Ordenar productos con Licores primero
    const productosOrdenados = ordenarProductosPorCategoria(productos);

    container.innerHTML = productosOrdenados.map(p => {
        const disponible = p.stock > 0;

        return `
            <div class="producto-consumo-card ${!disponible ? 'no-stock' : ''}">
                <div class="producto-consumo-info">
                    <div style="font-weight: 600; font-size: 16px; margin-bottom: 5px;">${p.nombre}</div>
                    <div style="font-size: 14px; color: #666; margin-bottom: 5px;">S/ ${p.precio.toFixed(2)}</div>
                    <div style="font-size: 13px; color: ${p.stock <= 5 ? '#dc3545' : '#28a745'};">
                        Stock: ${p.stock}
                    </div>
                </div>
                ${disponible ? `
                    <button class="btn btn-green btn-small" onclick="agregarConsumo(${p.id})" style="width: 100%;">
                        ➕ Agregar
                    </button>
                ` : `
                    <button class="btn btn-red btn-small" disabled style="width: 100%;">
                        Agotado
                    </button>
                `}
            </div>
        `;
    }).join('');
}

window.agregarConsumo = async function (productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto || producto.stock <= 0) {
        mostrarError('Producto no disponible');
        return;
    }

    let mesa;
    if (tipoMesaActual === 'billar') {
        mesa = mesas.find(m => m.id === mesaConsumoActual);
    } else {
        mesa = mesasConsumo.find(m => m.id === mesaConsumoActual);
    }

    if (!mesa || !mesa.ocupada) {
        mostrarError('La mesa no está ocupada');
        return;
    }

    if (!mesa.consumos) mesa.consumos = [];

    const existente = mesa.consumos.find(c => c.id === productoId);
    if (existente) {
        existente.cantidad++;
    } else {
        mesa.consumos.push({
            id: productoId,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: 1
        });
    }

    producto.stock--;

    // ⭐ NUEVO: Actualizar ganancia acumulada
    await actualizarGananciaProducto(productoId, 1);

    if (tipoMesaActual === 'consumo') {
        mesa.total = mesa.consumos.reduce((sum, c) => sum + (c.precio * c.cantidad), 0);
    }

    // await guardarProductos(); // Ya se guarda en actualizarGananciaProducto
    if (tipoMesaActual === 'billar') {
        await guardarMesas();
    } else {
        await guardarMesasConsumo();
        actualizarMesasConsumo();
    }

    renderProductosConsumo();
    actualizarListaConsumos();
    actualizarInventario();
};

window.eliminarConsumo = async function (productoId) {
    let mesa;
    if (tipoMesaActual === 'billar') {
        mesa = mesas.find(m => m.id === mesaConsumoActual);
    } else {
        mesa = mesasConsumo.find(m => m.id === mesaConsumoActual);
    }

    if (!mesa) return;

    const consumo = mesa.consumos.find(c => c.id === productoId);
    if (!consumo) return;

    const producto = productos.find(p => p.id === productoId);
    if (producto) {
        producto.stock += consumo.cantidad;
    }

    mesa.consumos = mesa.consumos.filter(c => c.id !== productoId);

    if (tipoMesaActual === 'consumo') {
        mesa.total = mesa.consumos.reduce((sum, c) => sum + (c.precio * c.cantidad), 0);
    }

    await guardarProductos();
    if (tipoMesaActual === 'billar') {
        await guardarMesas();
    } else {
        await guardarMesasConsumo();
        actualizarMesasConsumo();
    }

    renderProductosConsumo();
    actualizarListaConsumos();
    actualizarInventario();
};

// Editar cantidad de consumo
window.editarConsumo = async function (productoId) {
    let mesa;
    if (tipoMesaActual === 'billar') {
        mesa = mesas.find(m => m.id === mesaConsumoActual);
    } else {
        mesa = mesasConsumo.find(m => m.id === mesaConsumoActual);
    }

    if (!mesa) return;

    const consumo = mesa.consumos.find(c => c.id === productoId);
    if (!consumo) return;

    const producto = productos.find(p => p.id === productoId);

    const nuevaCantidad = prompt(`Editar cantidad de ${consumo.nombre}\n\nCantidad actual: ${consumo.cantidad}\nIngresa la nueva cantidad:`, consumo.cantidad);

    if (nuevaCantidad === null) return; // Usuario canceló

    const qty = parseInt(nuevaCantidad);

    if (isNaN(qty) || qty < 0) {
        mostrarError('Por favor ingresa un número válido mayor o igual a 0');
        return;
    }

    if (qty === 0) {
        // Si la cantidad es 0, eliminar el consumo
        if (confirm(`¿Eliminar ${consumo.nombre} de la mesa?`)) {
            await eliminarConsumo(productoId);
        }
        return;
    }

    // Calcular diferencia de stock
    const diferencia = qty - consumo.cantidad;

    // Verificar que hay suficiente stock disponible
    if (diferencia > 0 && producto && producto.stock < diferencia) {
        mostrarError(`No hay suficiente stock. Disponible: ${producto.stock}`);
        return;
    }

    // Actualizar stock del producto
    if (producto) {
        producto.stock -= diferencia; // Si diferencia es negativa, aumentará el stock
    }

    // Actualizar cantidad del consumo
    consumo.cantidad = qty;

    // Actualizar total si es mesa de consumo
    if (tipoMesaActual === 'consumo') {
        mesa.total = mesa.consumos.reduce((sum, c) => sum + (c.precio * c.cantidad), 0);
    }

    // Guardar cambios
    await guardarProductos();
    if (tipoMesaActual === 'billar') {
        await guardarMesas();
    } else {
        await guardarMesasConsumo();
        actualizarMesasConsumo();
    }

    renderProductosConsumo();
    actualizarListaConsumos();
    actualizarInventario();
};

function actualizarListaConsumos() {
    let mesa;
    if (tipoMesaActual === 'billar') {
        mesa = mesas.find(m => m.id === mesaConsumoActual);
    } else {
        mesa = mesasConsumo.find(m => m.id === mesaConsumoActual);
    }

    const container = document.getElementById('listaConsumos');
    const totalEl = document.getElementById('totalConsumo');

    if (!container || !totalEl) {
        debugLog('error', '⚠️ Elementos de consumo no encontrados en el HTML', {
            container: !!container,
            totalEl: !!totalEl
        });
        return;
    }

    if (!mesa || !mesa.consumos || mesa.consumos.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">No hay consumos agregados</p>';
        totalEl.textContent = 'S/ 0.00';
        return;
    }

    const totalConsumos = mesa.consumos.reduce((sum, c) => sum + (c.precio * c.cantidad), 0);
    let totalMesa = totalConsumos;

    // Si es una mesa de billar, sumamos lo que va de tiempo
    if (tipoMesaActual === 'billar') {
        const costoTiempoMesa = calcularCostoTiempo(mesa.tiempoTranscurrido).costo;
        totalMesa += costoTiempoMesa;
    }

    container.innerHTML = mesa.consumos.map(c => `
        <div class="consumo-item">
            <div>
                <div style="font-weight: 600;">${c.nombre}</div>
                <div style="font-size: 14px; color: #666;">S/ ${c.precio.toFixed(2)} x ${c.cantidad}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-weight: 600; color: #2d7a4d;">S/ ${(c.precio * c.cantidad).toFixed(2)}</div>
                <button class="btn btn-blue btn-small" onclick="editarConsumo(${c.id})" title="Editar cantidad">✏️</button>
                <button class="btn btn-red btn-small" onclick="eliminarConsumo(${c.id})">🗑️</button>
            </div>
        </div>
    `).join('');

    totalEl.textContent = `S/ ${totalConsumos.toFixed(2)}`;

    // ✅ Actualizar el botón de "Cerrar y Cobrar Todo" con el total real
    const btnCerrar = document.getElementById('btnCerrarMesa');
    if (btnCerrar) {
        btnCerrar.innerHTML = `💰 Cerrar Mesa y Cobrar Todo (Total: S/ ${totalMesa.toFixed(2)})`;
    }
}

// ========== COBRO PARCIAL ==========
window.showModalCobroParcial = function () {
    debugLog('sistema', '💵 Abriendo modal de cobro parcial');
    document.getElementById('modalCobroParcial').classList.add('show');
    renderItemsCobroParcial();
    actualizarTotalCobroParcial();
};

window.closeModalCobroParcial = function () {
    document.getElementById('modalCobroParcial').classList.remove('show');
};

function renderItemsCobroParcial() {
    let mesa;
    if (tipoMesaActual === 'billar') {
        mesa = mesas.find(m => m.id === mesaConsumoActual);
    } else {
        mesa = mesasConsumo.find(m => m.id === mesaConsumoActual);
    }

    const container = document.getElementById('itemsCobroParcialContainer');
    if (!container || !mesa || !mesa.consumos) return;

    if (mesa.consumos.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">No hay consumos para cobrar.</p>';
        document.getElementById('btnConfirmarCobroParcial').disabled = true;
        return;
    }

    document.getElementById('btnConfirmarCobroParcial').disabled = false;

    container.innerHTML = mesa.consumos.map(c => `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
                <div style="font-weight: 600;">${c.nombre}</div>
                <div style="font-size: 14px; color: #666;">Precio: S/ ${c.precio.toFixed(2)}</div>
                <div style="font-size: 13px; color: #2d7a4d;">En mesa: ${c.cantidad}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <label style="font-size: 14px;">Cobrar:</label>
                <input type="number" 
                    id="parcial-qty-${c.id}" 
                    class="input-parcial"
                    value="0" 
                    min="0" 
                    max="${c.cantidad}"
                    data-id="${c.id}"
                    data-precio="${c.precio}"
                    onchange="actualizarTotalCobroParcial()"
                    onkeyup="actualizarTotalCobroParcial()"
                    style="width: 70px; padding: 5px; border: 1px solid #ccc; border-radius: 5px; text-align: center;">
            </div>
        </div>
    `).join('');
}

window.actualizarTotalCobroParcial = function () {
    const inputs = document.querySelectorAll('.input-parcial');
    let total = 0;

    inputs.forEach(input => {
        let qty = parseInt(input.value) || 0;
        const max = parseInt(input.max);
        const precio = parseFloat(input.dataset.precio);

        if (qty < 0) qty = 0;
        if (qty > max) {
            qty = max;
            input.value = max;
        }

        total += qty * precio;
    });

    document.getElementById('totalCobroParcial').textContent = `S/ ${total.toFixed(2)}`;
};

window.procesarCobroParcial = async function () {
    const inputs = document.querySelectorAll('.input-parcial');
    let itemsACobrar = [];
    let totalCobrar = 0;

    // Recopilar items seleccionados
    inputs.forEach(input => {
        const qty = parseInt(input.value) || 0;
        if (qty > 0) {
            itemsACobrar.push({
                id: parseInt(input.dataset.id),
                cantidad: qty,
                precio: parseFloat(input.dataset.precio)
            });
            totalCobrar += qty * parseFloat(input.dataset.precio);
        }
    });

    if (itemsACobrar.length === 0) {
        mostrarError('Selecciona al menos un producto para cobrar.');
        return;
    }

    if (!confirm(`¿Confirmas el cobro parcial de S/ ${totalCobrar.toFixed(2)}?`)) return;

    // Procesar cobro: Generar venta y descontar de la mesa
    let mesa;
    if (tipoMesaActual === 'billar') {
        mesa = mesas.find(m => m.id === mesaConsumoActual);
    } else {
        mesa = mesasConsumo.find(m => m.id === mesaConsumoActual);
    }

    if (!mesa) return;

    const metodoPago = document.getElementById('metodoPagoParcial').value;

    // Generar descripción de items
    const descripcionItems = itemsACobrar.map(item => {
        const producto = mesa.consumos.find(c => c.id === item.id);
        const nombre = producto ? producto.nombre : 'Producto';
        return `${item.cantidad} ${nombre}`;
    }).join(', ');

    // Calcular ganancia del cobro parcial
    let gananciaParcial = 0;
    itemsACobrar.forEach(item => {
        const prod = productos.find(p => p.id === item.id);
        const costo = prod ? (prod.precioCosto || 0) : 0;
        gananciaParcial += (item.precio - costo) * item.cantidad;
    });

    // 1. Generar Venta
    const venta = {
        id: Date.now(),
        tipo: 'Cobro Parcial',
        tipoDetalle: `Parcial (${descripcionItems}) - ${tipoMesaActual === 'billar' ? 'Mesa Billar' : 'Mesa Consumo'} ${mesa.id}`,
        monto: totalCobrar,
        ganancia: gananciaParcial,
        metodoPago: metodoPago, // ⭐ REGISTRAR MÉTODO
        fecha: new Date().toLocaleString(),
        usuario: usuarioActual.nombre,
        detalle: {
            mesaId: mesa.id,
            tipoMesa: tipoMesaActual,
            consumos: itemsACobrar.map(item => {
                const producto = mesa.consumos.find(c => c.id === item.id);
                return {
                    producto: producto ? producto.nombre : 'Producto',
                    cantidad: item.cantidad,
                    precioUnitario: item.precio,
                    subtotal: item.cantidad * item.precio
                };
            })
        }
    };

    ventas.push(venta);
    await guardarVentas();

    // 2. Actualizar Mesa (Restar cantidades)
    itemsACobrar.forEach(item => {
        const consumoEnMesa = mesa.consumos.find(c => c.id === item.id);
        if (consumoEnMesa) {
            consumoEnMesa.cantidad -= item.cantidad;
        }
    });

    // Limpiar items con cantidad 0
    mesa.consumos = mesa.consumos.filter(c => c.cantidad > 0);

    // Actualizar total mesa si es de consumo
    if (tipoMesaActual === 'consumo') {
        mesa.total = mesa.consumos.reduce((sum, c) => sum + (c.precio * c.cantidad), 0);
    }

    // Guardar cambios en mesa
    if (tipoMesaActual === 'billar') {
        await guardarMesas();
    } else {
        await guardarMesasConsumo();
        actualizarMesasConsumo();
    }

    // 3. Actualizar UI
    alert(`✅ Cobro parcial realizado (${metodoPago}): S/ ${totalCobrar.toFixed(2)}\n\nItems cobrados: ${descripcionItems}`);
    closeModalCobroParcial();
    renderProductosConsumo();
    actualizarListaConsumos();
    actualizarTablaVentas();
    calcularTotal();
    actualizarDashboardFinanciero();
    actualizarTablaMovimientos(); // 💰 Actualizar balance de Caja Local
};

// ========== CONSUMO DEL DUEÑO ==========
window.showModalConsumoDueno = function () {
    document.getElementById('modalConsumoDueno').classList.add('show');
    renderProductosConsumoDueno();
    actualizarCarritoConsumoDueno();
};

window.closeModalConsumoDueno = function () {
    document.getElementById('modalConsumoDueno').classList.remove('show');
};

let carritoConsumoDueno = [];

function renderProductosConsumoDueno() {
    const container = document.getElementById('productosConsumoDuenoGrid');

    if (!container) return;

    if (productos.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999; grid-column: 1/-1;">No hay productos disponibles.</p>';
        return;
    }

    container.innerHTML = productos.map(p => {
        const disponible = p.stock > 0;

        return `
            <div class="producto-consumo-card ${!disponible ? 'no-stock' : ''}">
                <div class="producto-consumo-info">
                    <div style="font-weight: 600; font-size: 16px; margin-bottom: 5px;">${p.nombre}</div>
                    <div style="font-size: 14px; color: #666; margin-bottom: 5px;">S/ ${p.precio.toFixed(2)}</div>
                    <div style="font-size: 13px; color: ${p.stock <= 5 ? '#dc3545' : '#28a745'};">
                        Stock: ${p.stock}
                    </div>
                </div>
                ${disponible ? `
                    <button class="btn btn-primary btn-small" onclick="agregarProductoConsumoDueno(${p.id})" style="width: 100%;">
                        ➕ Agregar
                    </button>
                ` : `
                    <button class="btn btn-red btn-small" disabled style="width: 100%;">
                        Agotado
                    </button>
                `}
            </div>
        `;
    }).join('');
}

window.agregarProductoConsumoDueno = function (productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto || producto.stock <= 0) {
        mostrarError('Producto no disponible');
        return;
    }

    const existente = carritoConsumoDueno.find(c => c.id === productoId);
    if (existente) {
        if (existente.cantidad < producto.stock) {
            existente.cantidad++;
        } else {
            mostrarError('No hay suficiente stock');
            return;
        }
    } else {
        carritoConsumoDueno.push({
            id: productoId,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: 1
        });
    }

    actualizarCarritoConsumoDueno();
};

window.quitarProductoConsumoDueno = function (productoId) {
    carritoConsumoDueno = carritoConsumoDueno.filter(c => c.id !== productoId);
    actualizarCarritoConsumoDueno();
};

function actualizarCarritoConsumoDueno() {
    const container = document.getElementById('carritoConsumoDuenoContainer');
    const totalEl = document.getElementById('totalConsumoDueno');
    const btnGuardar = document.getElementById('btnGuardarConsumoDueno');

    if (!container || !totalEl) return;

    if (carritoConsumoDueno.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">No hay productos en el carrito</p>';
        totalEl.textContent = 'S/ 0.00';
        if (btnGuardar) btnGuardar.disabled = true;
        return;
    }

    const total = carritoConsumoDueno.reduce((sum, c) => sum + (c.precio * c.cantidad), 0);

    container.innerHTML = carritoConsumoDueno.map(c => `
        <div class="consumo-item">
            <div>
                <div style="font-weight: 600;">${c.nombre}</div>
                <div style="font-size: 14px; color: #666;">S/ ${c.precio.toFixed(2)} x ${c.cantidad}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-weight: 600; color: #ff9800;">S/ ${(c.precio * c.cantidad).toFixed(2)}</div>
                <button class="btn btn-red btn-small" onclick="quitarProductoConsumoDueno(${c.id})">🗑️</button>
            </div>
        </div>
    `).join('');

    totalEl.textContent = `S/ ${total.toFixed(2)}`;
    if (btnGuardar) btnGuardar.disabled = false;
}

window.guardarConsumoDueno = async function () {
    if (carritoConsumoDueno.length === 0) {
        mostrarError('El carrito está vacío');
        return;
    }

    const btnGuardar = document.getElementById('btnGuardarConsumoDueno');
    try {
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.textContent = 'Guardando...';
        }

        const totalVenta = carritoConsumoDueno.reduce((sum, c) => sum + (c.precio * c.cantidad), 0);
        let totalCosto = 0;

        const consumo = {
            id: Date.now(),
            fecha: new Date().toLocaleString('es-PE'),
            tipo: 'Consumo Dueño',
            productos: carritoConsumoDueno.map(c => {
                const p = productos.find(prod => prod.id === c.id);
                const costo = p ? (p.precioCosto || 0) : 0;
                totalCosto += costo * c.cantidad;
                return {
                    nombre: c.nombre,
                    precio: c.precio,
                    precioCosto: costo,
                    cantidad: c.cantidad
                };
            }),
            totalVenta: totalVenta,
            totalCosto: totalCosto
        };

        // Actualizar stock y ganancia de cada producto
        for (const c of carritoConsumoDueno) {
            const producto = productos.find(p => p.id === c.id);
            if (producto) {
                producto.stock -= c.cantidad;
                await actualizarGananciaProducto(c.id, c.cantidad, true);
            }
        }

        consumosDueno.push(consumo);
        await guardarConsumosDueno();

        alert(`✅ Consumo registrado.\n\nValor Venta: S/ ${totalVenta.toFixed(2)}\nValor Costo: S/ ${totalCosto.toFixed(2)}\n\nNota: El costo se restará de la utilidad final.`);

        carritoConsumoDueno = [];
        window.closeModalConsumoDueno();
        actualizarInventario();
        actualizarConsumoDueno();
        actualizarDashboardFinanciero(); // 🚀 Asegurar actualización del dashboard

    } catch (error) {
        debugLog('error', '❌ Error al guardar consumo dueño', error);
        mostrarError('No se pudo guardar el consumo. Intenta de nuevo.');
    } finally {
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Guardar Consumo';
        }
    }
};

function actualizarConsumoDueno() {
    debugLog('sistema', '🍽️ Actualizando consumo dueño...');

    const container = document.getElementById('consumoDuenoContainer');

    if (!container) {
        debugLog('error', '❌ consumoDuenoContainer no encontrado en el DOM');
        return;
    }

    container.style.display = 'block';
    container.style.minHeight = '300px';
    container.style.visibility = 'visible';
    container.style.opacity = '1';

    const consumosActuales = ultimoCierre
        ? consumosDueno.filter(c => c.id > ultimoCierre)
        : consumosDueno;

    debugLog('sistema', `📊 Total consumos: ${consumosDueno.length}, Actuales: ${consumosActuales.length}`);

    if (consumosActuales.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #666; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); min-height: 300px;">
                <p style="font-size: 64px; margin: 0;">🍽️</p>
                <p style="margin-top: 20px; font-size: 18px; font-weight: 600; color: #333;">
                    No hay consumos registrados
                </p>
                <p style="margin-top: 10px; font-size: 14px; color: #666;">
                    ${ultimoCierre ? 'desde el último cierre' : 'en el sistema'}
                </p>
                <button class="btn btn-primary" onclick="showModalConsumoDueno()" style="margin-top: 30px; padding: 15px 40px; font-size: 16px;">
                    ➕ Registrar Primer Consumo
                </button>
            </div>
        `;
        debugLog('sistema', '✅ Mostrado estado vacío');
        return;
    }

    const totalGeneral = consumosActuales.reduce((sum, c) => sum + c.total, 0);

    const htmlConsumos = consumosActuales.slice().reverse().map(c => `
        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <div>
                    <div style="font-weight: 600; font-size: 15px; color: #333;">🍽️ ${c.fecha}</div>
                </div>
                <div style="font-size: 20px; font-weight: bold; color: #ff9800;">S/ ${c.total.toFixed(2)}</div>
            </div>
            <div style="background: #fff3cd; padding: 10px; border-radius: 4px; margin-top: 10px;">
                ${c.productos.map(p => `
                    <div style="display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; color: #856404;">
                        <span>• ${p.nombre} x${p.cantidad} (S/ ${p.precio.toFixed(2)} c/u)</span>
                        <strong>S/ ${(p.precio * p.cantidad).toFixed(2)}</strong>
                    </div>
                `).join('')}
            </div>
            ${usuarioActual.rol === 'admin' ? `
                <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
                    <button class="btn btn-red btn-small" onclick="eliminarConsumoDueno(${c.id})">
                        🗑️ Eliminar
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');

    container.innerHTML = `
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ff9800;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="font-size: 16px; color: #856404;">💰 Total Consumido</strong>
                    <div style="font-size: 13px; color: #856404; margin-top: 5px;">
                        ${consumosActuales.length} ${consumosActuales.length === 1 ? 'registro' : 'registros'}
                        ${ultimoCierre ? 'desde el último cierre' : ''}
                    </div>
                </div>
                <div style="font-size: 28px; font-weight: bold; color: #ff9800;">
                    S/ ${totalGeneral.toFixed(2)}
                </div>
            </div>
            ${usuarioActual.rol === 'admin' ? `
                <button class="btn btn-blue" onclick="descargarConsumoDuenoPDF()" style="width: 100%; margin-top: 15px;">
                    📄 Descargar Reporte PDF
                </button>
            ` : ''}
        </div>
        
        ${htmlConsumos}
    `;

    debugLog('sistema', '✅ Consumos del dueño actualizados correctamente');
}

window.descargarConsumoDuenoPDF = function () {
    const consumosActuales = ultimoCierre
        ? consumosDueno.filter(c => c.id > ultimoCierre)
        : consumosDueno;

    if (consumosActuales.length === 0) {
        alert('⚠️ No hay consumos para descargar');
        return;
    }

    const totalGeneral = consumosActuales.reduce((sum, c) => sum + c.total, 0);

    const ventanaImpresion = window.open('', '_blank', 'width=800,height=600');

    ventanaImpresion.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Consumo del Dueño</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    padding: 30px;
                    background: white;
                    color: #333;
                }
                .header {
                    text-align: center;
                    border-bottom: 3px solid #ff9800;
                    padding-bottom: 20px;
                    margin-bottom: 25px;
                }
                h1 {
                    color: #ff9800;
                    font-size: 28px;
                    margin-bottom: 10px;
                }
                .total-box {
                    background: #fff3cd;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                    border-left: 4px solid #ff9800;
                }
                .consumo-item {
                    background: #f9f9f9;
                    padding: 15px;
                    border-radius: 6px;
                    margin-bottom: 12px;
                    border-left: 4px solid #ff9800;
                    page-break-inside: avoid;
                }
                .consumo-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #e0e0e0;
                }
                .footer {
                    margin-top: 30px;
                    text-align: center;
                    color: #999;
                    font-size: 11px;
                    border-top: 1px solid #e0e0e0;
                    padding-top: 15px;
                }
                @media print {
                    body { padding: 15px; }
                    .no-print { display: none; }
                    @page { margin: 1cm; }
                }
                .btn-imprimir {
                    background: #ff9800;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    margin: 15px 0;
                }
                .btn-imprimir:hover {
                    background: #e68900;
                }
            </style>
        </head>
        <body>
            <div class="no-print">
                <button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
            </div>
            
            <div class="header">
                <h1>🍽️ CONSUMO DEL DUEÑO</h1>
                <p style="color: #666; margin-top: 5px;">Generado: ${new Date().toLocaleString('es-PE')}</p>
                <p style="color: #856404; margin-top: 10px; font-size: 14px;">⚠️ Estos consumos NO fueron cobrados pero se descontaron del stock</p>
            </div>
            
            <div class="total-box">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 16px; color: #856404;">Total Consumido</strong>
                        <div style="font-size: 13px; color: #856404; margin-top: 5px;">
                            ${consumosActuales.length} ${consumosActuales.length === 1 ? 'registro' : 'registros'}
                        </div>
                    </div>
                    <div style="font-size: 32px; font-weight: bold; color: #ff9800;">
                        S/ ${totalGeneral.toFixed(2)}
                    </div>
                </div>
            </div>
            
            ${consumosActuales.reverse().map(c => `
                <div class="consumo-item">
                    <div class="consumo-header">
                        <div style="font-weight: bold; color: #333;">${c.fecha}</div>
                        <div style="font-size: 20px; font-weight: bold; color: #ff9800;">S/ ${c.total.toFixed(2)}</div>
                    </div>
                    <div style="background: #fff3cd; padding: 10px; border-radius: 4px;">
                        ${c.productos.map(p => `
                            <div style="display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; color: #856404;">
                                <span>• ${p.nombre} x${p.cantidad} (S/ ${p.precio.toFixed(2)} c/u)</span>
                                <strong>S/ ${(p.precio * p.cantidad).toFixed(2)}</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
            
            <div class="footer">
                <p>Sistema de Gestión de Billar • Reporte generado automáticamente</p>
                <p style="margin-top: 5px;">Documento válido sin firma</p>
            </div>
        </body>
        </html>
    `);

    ventanaImpresion.document.close();

    setTimeout(() => {
        ventanaImpresion.focus();
    }, 250);

    debugLog('sistema', '📄 PDF de consumo dueño generado');
};

window.eliminarConsumoDueno = async function (consumoId) {
    if (!confirm('¿Estás seguro de eliminar este registro de consumo?')) return;

    const consumo = consumosDueno.find(c => c.id === consumoId);
    if (!consumo) return;

    consumo.productos.forEach(p => {
        const producto = productos.find(prod => prod.nombre === p.nombre);
        if (producto) {
            producto.stock += p.cantidad;
        }
    });

    consumosDueno = consumosDueno.filter(c => c.id !== consumoId);

    await guardarConsumosDueno();
    await guardarProductos();

    actualizarConsumoDueno();
    actualizarInventario();

    alert('✅ Registro eliminado y stock devuelto');
};

// ========== ERRORES ==========
window.showModalError = function () {
    document.getElementById('modalError').classList.add('show');
    document.getElementById('errorMensaje').value = '';
};

window.closeModalError = function () {
    document.getElementById('modalError').classList.remove('show');
};

window.reportarError = async function () {
    const descripcion = document.getElementById('errorMensaje').value.trim();

    if (!descripcion) {
        mostrarError('Por favor describe el error');
        return;
    }

    const error = {
        id: Date.now(),
        descripcion,
        fecha: new Date().toLocaleString(),
        usuario: usuarioActual.nombre,
        estado: 'pendiente'
    };

    erroresReportados.push(error);
    await guardarErrores();

    alert('Error reportado correctamente. Gracias por tu reporte.');
    window.closeModalError();

    debugLog('sistema', '⚠️ Error reportado', { descripcion });
};

window.toggleEstadoError = async function (id) {
    const error = erroresReportados.find(e => e.id === id);
    if (!error) return;

    error.estado = error.estado === 'pendiente' ? 'resuelto' : 'pendiente';
    await guardarErrores();
    actualizarErrores();
};

window.eliminarError = async function (id) {
    if (!confirm('¿Estás seguro de eliminar este reporte?')) return;

    erroresReportados = erroresReportados.filter(e => e.id !== id);
    await guardarErrores();
    actualizarErrores();
};

function actualizarErrores() {
    const tabErrores = document.getElementById('tabErrores');

    if (!tabErrores) {
        debugLog('error', '❌ tabErrores no existe en el DOM');
        return;
    }

    // Buscar o crear el contenedor DENTRO del tab correcto
    let container = tabErrores.querySelector('#erroresContainer');

    if (!container) {
        container = document.createElement('div');
        container.id = 'erroresContainer';
        container.style.padding = '20px';
        container.style.minHeight = '300px';
        tabErrores.appendChild(container);
        debugLog('sistema', '✅ erroresContainer creado');
    }

    // Asegurar que el contenedor es visible
    container.style.display = 'block';
    container.style.visibility = 'visible';
    container.style.opacity = '1';

    debugLog('sistema', `⚠️ Actualizando errores... Total: ${erroresReportados.length}`);

    if (erroresReportados.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #333; background: #f0f0f0; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); min-height: 300px; border: 3px solid #28a745;">
                <p style="font-size: 64px; margin: 0;">✅</p>
                <p style="margin-top: 20px; font-size: 18px; font-weight: 600; color: #333;">
                    No hay errores reportados
                </p>
                <p style="margin-top: 10px; font-size: 14px; color: #666;">
                    El sistema está funcionando correctamente
                </p>
            </div>
        `;
        debugLog('sistema', '✅ Mostrado estado sin errores');
        return;
    }

    const erroresOrdenados = [...erroresReportados].reverse();

    container.innerHTML = erroresOrdenados.map(e => `
        <div class="error-card ${e.estado === 'resuelto' ? 'error-resuelto' : ''}" style="background: white; border: 3px solid #dc3545; border-radius: 8px; margin-bottom: 12px; padding: 15px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); min-height: 80px;">
            <div class="error-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span class="badge ${e.estado === 'pendiente' ? 'badge-warning' : 'badge-success'}" style="padding: 5px 12px; border-radius: 15px; font-size: 12px; font-weight: 600; ${e.estado === 'pendiente' ? 'background: #ffc107; color: #000;' : 'background: #28a745; color: white;'}">
                    ${e.estado === 'pendiente' ? '⏳ Pendiente' : '✅ Resuelto'}
                </span>
                <span style="font-size: 13px; color: #666; font-weight: bold;">${e.fecha}</span>
            </div>
            <div class="error-body" style="margin: 12px 0; background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <p style="margin: 8px 0;"><strong style="color: #dc3545;">📝 Descripción:</strong> <span style="color: #333;">${e.descripcion}</span></p>
                <p style="margin: 8px 0; color: #666;"><strong>👤 Reportado por:</strong> ${e.usuario}</p>
            </div>
            <div class="error-actions" style="display: flex; gap: 8px; margin-top: 12px;">
                <button class="btn-small btn-blue" onclick="toggleEstadoError(${e.id})" style="flex: 1; padding: 8px 12px; font-size: 13px; font-weight: bold;">
                    ${e.estado === 'pendiente' ? '✓ Marcar Resuelto' : '↻ Reabrir'}
                </button>
                <button class="btn-small btn-red" onclick="eliminarError(${e.id})" style="padding: 8px 12px; font-size: 13px; font-weight: bold;">
                    🗑️ Eliminar
                </button>
            </div>
        </div>
    `).join('');

    debugLog('sistema', '✅ Errores actualizados correctamente', { total: erroresReportados.length });
}
// ========== USUARIOS ==========
window.toggleUsuarios = function () {
    const panel = document.getElementById('usuariosPanel');

    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        actualizarUsuarios();
    } else {
        panel.classList.add('hidden');
    }
};

window.showModalUsuario = function (usuarioIdOrNull = null) {
    if (usuarioActual.rol !== 'admin') return;

    if (usuarioIdOrNull !== null) {
        usuarioEditando = usuarios.find(u => u.id === usuarioIdOrNull);
        if (!usuarioEditando) {
            mostrarError('Usuario no encontrado');
            return;
        }
    } else {
        usuarioEditando = null;
    }

    const modal = document.getElementById('modalUsuario');
    const title = document.getElementById('usuarioModalTitle');

    if (usuarioEditando) {
        title.textContent = 'Editar Usuario';
        document.getElementById('nuevoNombre').value = usuarioEditando.nombre;
        document.getElementById('nuevoUsername').value = usuarioEditando.username;
        document.getElementById('nuevoPassword').value = '';
        document.getElementById('nuevoRol').value = usuarioEditando.rol;
    } else {
        title.textContent = 'Agregar Usuario';
        document.getElementById('nuevoNombre').value = '';
        document.getElementById('nuevoUsername').value = '';
        document.getElementById('nuevoPassword').value = '';
        document.getElementById('nuevoRol').value = 'empleado';
    }

    document.getElementById('usuarioError').classList.add('hidden');
    modal.classList.add('show');
};

window.closeModalUsuario = function () {
    document.getElementById('modalUsuario').classList.remove('show');
    usuarioEditando = null;
};

window.guardarUsuario = async function () {
    const nombre = document.getElementById('nuevoNombre').value.trim();
    const username = document.getElementById('nuevoUsername').value.trim();
    const password = document.getElementById('nuevoPassword').value;
    const rol = document.getElementById('nuevoRol').value;
    const errorDiv = document.getElementById('usuarioError');

    const email = `${username}@billar.app`;

    errorDiv.classList.add('hidden');

    if (!nombre || !username || (!usuarioEditando && !password)) {
        errorDiv.textContent = 'Por favor completa todos los campos';
        errorDiv.classList.remove('hidden');
        return;
    }

    const existente = usuarios.find(u => u.username === username && u.id !== (usuarioEditando ? usuarioEditando.id : null));
    if (existente) {
        errorDiv.textContent = 'El nombre de usuario ya existe';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        if (usuarioEditando) {
            usuarioEditando.nombre = nombre;
            usuarioEditando.username = username;
            usuarioEditando.rol = rol;

            if (password) {
                await window.firebaseAuth.updatePassword(usuarioEditando.uid, password);
                usuarioEditando.password = password;
                debugLog('seguridad', '✅ Contraseña de usuario actualizada en Firebase Auth');
            }

        } else {
            const userCredential = await window.firebaseAuth.createUser(email, password);

            debugLog('seguridad', '✅ Cuenta de Firebase Auth creada', { email });

            usuarios.push({
                id: Date.now(),
                uid: userCredential.user.uid,
                username,
                password,
                nombre,
                rol
            });
        }

        await guardarUsuarios();
        actualizarUsuarios();
        window.closeModalUsuario();

    } catch (error) {
        console.error('❌ Error al guardar usuario:', error);

        if (error.code === 'auth/email-already-in-use') {
            errorDiv.textContent = 'El nombre de usuario ya existe (usado en Firebase)';
        } else if (error.code === 'auth/weak-password') {
            errorDiv.textContent = 'Contraseña muy débil (mínimo 6 caracteres)';
        } else if (error.code === 'auth/invalid-email') {
            errorDiv.textContent = 'El formato del usuario es inválido.';
        } else {
            errorDiv.textContent = `Error al guardar: ${error.message}`;
        }
        errorDiv.classList.remove('hidden');
    }
};

window.eliminarUsuario = async function (id) {
    if (usuarioActual.id === id) {
        mostrarError('No puedes eliminar tu propio usuario');
        return;
    }

    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    usuarios = usuarios.filter(u => u.id !== id);
    await guardarUsuarios();
    actualizarUsuarios();
};

function actualizarUsuarios() {
    const tbody = document.getElementById('usuariosTable');
    if (!tbody) {
        debugLog('error', '⚠️ Elemento usuariosTable no encontrado');
        return;
    }

    if (usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: #999;">No hay usuarios registrados</td></tr>';
        return;
    }

    tbody.innerHTML = usuarios.map(u => {
        return `
            <tr>
                <td>${u.username}</td>
                <td>${u.nombre}</td>
                <td style="text-align: center;">
                    <span class="badge ${u.rol === 'admin' ? 'badge-success' : 'badge-info'}">
                        ${u.rol.toUpperCase()}
                    </span>
                </td>
                <td style="text-align: center;">
                    <button class="btn-small btn-green" onclick='showModalUsuario(${u.id})' style="margin-right: 5px;">✏️</button>
                    ${usuarioActual.id !== u.id ? `<button class="btn-small btn-red" onclick="eliminarUsuario(${u.id})">🗑️</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');

    debugLog('sistema', '👥 Tabla de usuarios actualizada', { total: usuarios.length });
}

// ========== FUNCIÓN QUE PREVIENE DOBLE COBRO ==========
// --- Función para cerrar la mesa directamente desde el modal de consumo ---
window.cerrarMesaCompleto = function () {
    if (!mesaConsumoActual) return;

    debugLog('sistema', '🚀 Cerrando mesa completa desde modal', { id: mesaConsumoActual, tipo: tipoMesaActual });

    // Cerramos el modal primero para no tener conflictos visuales
    window.closeModalConsumo();

    if (tipoMesaActual === 'billar') {
        finalizarMesa(mesaConsumoActual);
    } else {
        finalizarMesaConsumo(mesaConsumoActual);
    }
};

// ========== REPORTES Y CIERRES ==========
function generarReporte() {
    debugLog('sistema', '📊 Generando reporte...');

    const ventasActuales = ultimoCierre
        ? ventas.filter(v => v.id > ultimoCierre)
        : ventas;

    const totalVentas = ventasActuales.reduce((sum, v) => sum + v.monto, 0);
    const cantidadVentas = ventasActuales.length;

    const ventasMesas = ventasActuales.filter(v => v.tipo === 'Mesa Billar').reduce((sum, v) => sum + v.monto, 0);
    const ventasProductos = ventasActuales.filter(v => v.tipo === 'Venta Directa').reduce((sum, v) => sum + v.monto, 0);
    const ventasConsumo = ventasActuales.filter(v => v.tipo === 'Mesa Consumo').reduce((sum, v) => sum + v.monto, 0);
    const ventasManuales = ventasActuales.filter(v => v.tipo === 'Venta Manual').reduce((sum, v) => sum + v.monto, 0);

    const consumosDuenoActuales = ultimoCierre
        ? consumosDueno.filter(c => c.id > ultimoCierre)
        : consumosDueno;

    const totalConsumosDueno = consumosDuenoActuales.reduce((sum, c) => sum + c.total, 0);

    const totalEl = document.getElementById('reporteTotalVentas');
    const mesasEl = document.getElementById('reporteVentasMesas');
    const productosEl = document.getElementById('reporteVentasProductos');
    const transaccionesEl = document.getElementById('reporteTransacciones');
    const detalleTable = document.getElementById('reporteDetalleTable');

    if (!totalEl || !mesasEl || !productosEl || !transaccionesEl || !detalleTable) {
        debugLog('error', '⚠️ Elementos del reporte no encontrados en el DOM');
        return;
    }

    totalEl.textContent = `S/ ${totalVentas.toFixed(2)}`;
    mesasEl.textContent = `S/ ${ventasMesas.toFixed(2)}`;
    productosEl.textContent = `S/ ${(ventasProductos + ventasConsumo + ventasManuales).toFixed(2)}`;
    transaccionesEl.textContent = cantidadVentas;

    const consumoDuenoEl = document.getElementById('reporteConsumoDueno');
    if (consumoDuenoEl) {
        consumoDuenoEl.textContent = `S/ ${totalConsumosDueno.toFixed(2)} (${consumosDuenoActuales.length} consumos)`;
    }

    let infoCierre = '';
    if (ultimoCierre) {
        const fechaCierre = new Date(ultimoCierre).toLocaleString('es-PE');
        infoCierre = `<div class="info-cierre-anterior" style="background: #e3f2fd; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #2196f3;">
        <strong>📊 Ventas desde último cierre:</strong> ${fechaCierre}
    </div>`;
    }

    if (ventasActuales.length === 0) {
        detalleTable.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: #999;">No hay ventas para mostrar</td></tr>';
    } else {
        const ventasOrdenadas = [...ventasActuales].reverse();

        let htmlFilas = ventasOrdenadas.map(v => {
            let detalleHTML = '';

            if (v.detalle) {
                if (v.tipo === 'Mesa Billar') {
                    detalleHTML = `
                        <div style="margin-top: 5px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                            <strong>🎱 ${v.tipoDetalle}</strong><br>
                            ⏰ ${v.detalle.horaInicio} - ${v.detalle.horaFin} 
                            (${v.detalle.tiempoMinutos} min = ${v.detalle.tiempoHoras}h ${v.detalle.tiempoMinutosExtra}min)<br>
                            💵 Tiempo: S/ ${v.detalle.costoTiempo.toFixed(2)}
                            ${v.detalle.consumos.length > 0 ? `
                                <br><strong style="margin-top: 5px; display: block;">🛒 Consumos:</strong>
                                ${v.detalle.consumos.map(c =>
                        `• ${c.producto} x${c.cantidad} = S/ ${c.subtotal.toFixed(2)}`
                    ).join('<br>')}
                                <br><strong>Total Consumos: S/ ${v.detalle.totalConsumos.toFixed(2)}</strong>
                            ` : ''}
                        </div>
                    `;
                } else if (v.tipo === 'Mesa Consumo') {
                    detalleHTML = `
                        <div style="margin-top: 5px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                            <strong>🍺 ${v.tipoDetalle}</strong><br>
                            <strong>🛒 Consumos:</strong><br>
                            ${v.detalle.consumos.map(c =>
                        `• ${c.producto} x${c.cantidad} (S/ ${c.precioUnitario.toFixed(2)} c/u) = S/ ${c.subtotal.toFixed(2)}`
                    ).join('<br>')}
                        </div>
                    `;
                } else if (v.tipo === 'Venta Directa') {
                    detalleHTML = `
                        <div style="margin-top: 5px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                            <strong>🛒 ${v.tipoDetalle}</strong><br>
                            ${v.detalle.consumos.map(c =>
                        `${c.producto}: ${c.cantidad} × S/ ${c.precioUnitario.toFixed(2)} = S/ ${c.subtotal.toFixed(2)}`
                    ).join('<br>')}
                        </div>
                    `;
                } else if (v.tipo === 'Venta Manual') {
                    detalleHTML = `<div style="color: #666; font-size: 12px; margin-top: 3px;">📝 ${v.tipoDetalle}</div>`;
                } else if (v.tipo === 'Cobro Parcial') {
                    detalleHTML = `
                        <div style="margin-top: 5px; padding: 8px; background: #fff3cd; border-radius: 4px; font-size: 12px; border-left: 3px solid #ff9800;">
                            <strong>💰 ${v.tipoDetalle}</strong><br>
                            <strong style="margin-top: 5px; display: block;">🛒 Items cobrados:</strong>
                            ${v.detalle.consumos.map(c =>
                        `• ${c.producto} x${c.cantidad} (S/ ${c.precioUnitario.toFixed(2)} c/u) = S/ ${c.subtotal.toFixed(2)}`
                    ).join('<br>')}
                        </div>
                    `;
                }
            } else {
                detalleHTML = `<div style="color: #666; font-size: 12px; margin-top: 3px;">${v.tipo}</div>`;
            }

            return `
                <tr style="border-bottom: 1px solid #e0e0e0;">
                    <td style="padding: 10px; font-size: 13px;">${v.fecha}</td>
                    <td style="padding: 10px;">${detalleHTML}</td>
                    <td style="padding: 10px; font-size: 13px; color: #666;">${v.usuario}</td>
                    <td style="padding: 10px; text-align: right; font-weight: 600; color: #2d7a4d;">S/ ${v.monto.toFixed(2)}</td>
                </tr>
            `;
        }).join('');


        detalleTable.innerHTML = htmlFilas;

        const container = document.getElementById('reporteDetalleContainer');
        if (container && infoCierre) {
            const infoAnterior = container.querySelector('.info-cierre-anterior');
            if (infoAnterior) {
                infoAnterior.remove();
            }

            const tabla = container.querySelector('table');
            if (tabla) {
                const div = document.createElement('div');
                div.className = 'info-cierre-anterior';
                div.innerHTML = infoCierre;
                tabla.parentNode.insertBefore(div, tabla);
            }
        }
    }

    actualizarHistorialCierres();

    debugLog('sistema', '✅ Reporte generado correctamente');
}

window.cerrarDia = async function () {
    const ventasActuales = ultimoCierre
        ? ventas.filter(v => v.id > ultimoCierre)
        : ventas;

    if (ventasActuales.length === 0) {
        alert('⚠️ No hay ventas nuevas para cerrar');
        return;
    }

    const totalCierre = ventasActuales.reduce((sum, v) => sum + (v.monto || 0), 0);

    // ⭐ NUEVO: Desglose de pago para el periodo actual
    const totalEfectivoPeriodo = ventasActuales.filter(v => (v.metodoPago || 'Efectivo') === 'Efectivo').reduce((sum, v) => sum + (v.monto || 0), 0);
    const totalYapePeriodo = ventasActuales.filter(v => v.metodoPago === 'Yape').reduce((sum, v) => sum + (v.monto || 0), 0);

    const consumosDuenoActuales = ultimoCierre
        ? consumosDueno.filter(c => c.id > ultimoCierre)
        : consumosDueno;

    const totalConsumosDuenoVenta = consumosDuenoActuales.reduce((sum, c) => sum + (c.totalVenta || c.total || 0), 0);
    const totalConsumosDuenoCosto = consumosDuenoActuales.reduce((sum, c) => sum + (c.totalCosto || 0), 0);

    const movimientosActuales = ultimoCierre
        ? movimientos.filter(m => m.id > ultimoCierre)
        : movimientos;

    const totalIngresosExtra = movimientosActuales.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0);
    const totalEgresos = movimientosActuales.filter(m => m.tipo === 'egreso' || m.tipo === 'retiro' || m.tipo === 'reposicion').reduce((sum, m) => sum + m.monto, 0);

    // Ganancia de ventas para este periodo
    const gananciaVentasPeriodo = ventasActuales.reduce((sum, v) => sum + (v.ganancia || 0), 0);

    // UTILIDAD NETA = Ganancia Bruta (Ventas) + Ingresos Extra - Gastos - Costo Consumo Dueño
    const utilidadNetaPeriodo = gananciaVentasPeriodo + totalIngresosExtra - totalEgresos - totalConsumosDuenoCosto;

    // --- DESGLOSE POR CAJAS PARA EL RESUMEN ---
    const ventasEfectivoActual = ventasActuales.filter(v => (v.metodoPago || 'Efectivo') === 'Efectivo').reduce((sum, v) => sum + (v.monto || 0), 0);
    const ingresosLocalActual = movimientosActuales.filter(m => m.caja === 'local' && m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0);
    const egresosLocalActual = movimientosActuales.filter(m => m.caja === 'local' && (m.tipo === 'egreso' || m.tipo === 'retiro' || m.tipo === 'reposicion')).reduce((sum, m) => sum + m.monto, 0);
    const transfLocalActual = movimientosActuales.filter(m => m.tipo === 'transferencia').reduce((sum, m) => sum + m.monto, 0);

    const ingresosChicaActual = movimientosActuales.filter(m => m.caja === 'chica' && m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0);
    const egresosChicaActual = movimientosActuales.filter(m => m.caja === 'chica' && (m.tipo === 'egreso' || m.tipo === 'retiro' || m.tipo === 'reposicion')).reduce((sum, m) => sum + m.monto, 0);
    const transfChicaActual = transfLocalActual;

    const ajustesLocalActual = movimientosActuales.filter(m => m.caja === 'local' && m.tipo === 'ajuste').reduce((sum, m) => {
        return sum + (m.ajusteTipo === 'positivo' ? m.monto : -m.monto);
    }, 0);

    const ajustesChicaActual = movimientosActuales.filter(m => m.caja === 'chica' && m.tipo === 'ajuste').reduce((sum, m) => {
        return sum + (m.ajusteTipo === 'positivo' ? m.monto : -m.monto);
    }, 0);

    const balanceLocalActual = ventasEfectivoActual + ingresosLocalActual - egresosLocalActual - transfLocalActual + ajustesLocalActual;
    const balanceChicaActual = ingresosChicaActual + transfChicaActual - egresosChicaActual + ajustesChicaActual;

    const confirmar = confirm(
        `📊 RESUMEN DE CIERRE\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🛒 Ventas Totales: S/ ${totalCierre.toFixed(2)}\n` +
        `   💵 Efectivo : S/ ${totalEfectivoPeriodo.toFixed(2)}\n` +
        `   📱 Yape/Plin: S/ ${totalYapePeriodo.toFixed(2)}\n\n` +
        `🏠 SALDO CAJA LOCAL: S/ ${balanceLocalActual.toFixed(2)}\n` +
        `👛 SALDO CAJA CHICA: S/ ${balanceChicaActual.toFixed(2)}\n` +
        `━━━━━━━━━━━━━━━\n` +
        `💰 Margen Ventas:  S/ ${gananciaVentasPeriodo.toFixed(2)}\n` +
        `➕ Ingresos Extra: S/ ${totalIngresosExtra.toFixed(2)}\n` +
        `➖ Gastos/Retiros: S/ ${totalEgresos.toFixed(2)}\n` +
        `➖ Consumo Dueño:  S/ ${totalConsumosDuenoCosto.toFixed(2)}\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🚀 UTILIDAD NETA: S/ ${utilidadNetaPeriodo.toFixed(2)}\n\n` +
        `¿Deseas confirmar el cierre y generar el reporte?`
    );

    if (!confirmar) return;

    const cierre = {
        id: Date.now(),
        timestamp: Date.now(),
        fecha: new Date().toLocaleString('es-PE'),
        usuario: usuarioActual.nombre,
        cantidadVentas: ventasActuales.length,
        total: totalCierre,
        totalEfectivo: totalEfectivoPeriodo, // ⭐ Guardar desglose
        totalYape: totalYapePeriodo,         // ⭐ Guardar desglose
        balanceLocal: balanceLocalActual,    // ⭐ Nuevo: Saldo Local
        balanceChica: balanceChicaActual,    // ⭐ Nuevo: Saldo Chica
        gananciaVentas: gananciaVentasPeriodo,
        totalEgresos: totalEgresos,
        totalIngresosExtra: totalIngresosExtra,
        utilidadNeta: utilidadNetaPeriodo,
        ventas: ventasActuales.map(v => ({ ...v })),
        movimientos: movimientosActuales.map(m => ({ ...m })),
        ventasMesas: ventasActuales.filter(v => v.tipo === 'Mesa Billar').reduce((sum, v) => sum + v.monto, 0),
        ventasProductos: ventasActuales.filter(v => v.tipo !== 'Mesa Billar').reduce((sum, v) => sum + v.monto, 0),
        consumosDueno: consumosDuenoActuales.map(c => ({ ...c })),
        totalConsumosDuenoVenta: totalConsumosDuenoVenta,
        totalConsumosDuenoCosto: totalConsumosDuenoCosto
    };

    cierres.push(cierre);
    ultimoCierre = cierre.timestamp;

    await guardarCierres();

    descargarReporteCierre(cierre);

    alert(`✅ Cierre registrado correctamente\n\n📄 Se descargó el reporte automáticamente`);

    generarReporte();
};

function descargarReporteCierre(cierre) {
    // Abrir ventana para generar PDF
    const ventanaImpresion = window.open('', '_blank', 'width=800,height=600');

    ventanaImpresion.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Cierre de Caja - ${cierre.fecha}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    padding: 30px;
                    background: #f5f5f5;
                }
                .container {
                    max-width: 900px;
                    margin: 0 auto;
                    background: white;
                    padding: 30px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                h1 {
                    color: #2d7a4d;
                    margin-bottom: 20px;
                    text-align: center;
                    font-size: 28px;
                    border-bottom: 3px solid #2d7a4d;
                    padding-bottom: 15px;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    margin-bottom: 25px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 6px;
                }
                .info-item {
                    display: flex;
                    flex-direction: column;
                }
                .info-label {
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 4px;
                }
                .info-value {
                    font-size: 16px;
                    font-weight: 600;
                    color: #333;
                }
                .summary-box {
                    background: linear-gradient(135deg, #2d7a4d 0%, #1e5a35 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 25px;
                }
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                }
                .summary-item {
                    text-align: center;
                }
                .summary-label {
                    font-size: 13px;
                    opacity: 0.9;
                    margin-bottom: 5px;
                }
                .summary-value {
                    font-size: 24px;
                    font-weight: bold;
                }
                .section { 
                
                    margin-bottom: 25px;
                }
                .section-title {
                    font-size: 18px;
                    color: #2d7a4d;
                    margin-bottom: 12px;
                    padding-bottom: 8px;
                    border-bottom: 2px solid #e0e0e0;
                }
                .ventas-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                }
                .ventas-table th {
                    background: #f8f9fa;
                    padding: 10px;
                    text-align: left;
                    font-weight: 600;
                    color: #495057;
                    border-bottom: 2px solid #dee2e6;
                }
                .ventas-table td {
                    padding: 10px;
                    border-bottom: 1px solid #f0f0f0;
                }
                .ventas-table tr:hover {
                    background: #f8f9fa;
                }
                .monto {
                    color: #2d7a4d;
                    font-weight: 600;
                    text-align: right;
                }
                .consumo-dueno {
                    background: #fff3cd;
                    padding: 15px;
                    border-radius: 6px;
                    border-left: 4px solid #ff9800;
                }
                .consumo-item {
                    padding: 8px 0;
                    border-bottom: 1px solid #f0e5c9;
                }
                .consumo-item:last-child {
                    border-bottom: none;
                }
                @media print {
                    body { background: white; padding: 0; }
                    .container { box-shadow: none; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📊 CIERRE DE CAJA</h1>
                
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Fecha y Hora</div>
                        <div class="info-value">${cierre.fecha}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Usuario</div>
                        <div class="info-value">${cierre.usuario}</div>
                    </div>
                </div>

                <div class="summary-box">
                    <div class="summary-grid">
                        <div class="summary-item">
                            <div class="summary-label">🏠 Saldo Caja Local</div>
                            <div class="summary-value">S/ ${(cierre.balanceLocal || 0).toFixed(2)}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">👛 Saldo Caja Chica</div>
                            <div class="summary-value">S/ ${(cierre.balanceChica || 0).toFixed(2)}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">Total Recaudado</div>
                            <div class="summary-value">S/ ${cierre.total.toFixed(2)}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">Transacciones</div>
                            <div class="summary-value">${cierre.cantidadVentas}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">💵 Efectivo (Local)</div>
                            <div class="summary-value">S/ ${(cierre.totalEfectivo || 0).toFixed(2)}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">📱 Yape/Plin</div>
                            <div class="summary-value">S/ ${(cierre.totalYape || 0).toFixed(2)}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">🚀 Utilidad Neta</div>
                            <div class="summary-value">S/ ${cierre.utilidadNeta.toFixed(2)}</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">📋 Detalle de Ventas</div>
                    <table class="ventas-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Tipo</th>
                                <th>Descripción</th>
                                <th>Usuario</th>
                                <th style="text-align: center;">Pago</th>
                                <th style="text-align: right;">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cierre.ventas.map(v => {
        let descripcion = '';
        if (v.detalle) {
            if (v.tipo === 'Mesa Billar') {
                descripcion = `${v.tipoDetalle} | ${v.detalle.horaInicio}-${v.detalle.horaFin} (${v.detalle.tiempoMinutos}min)`;
                if (v.detalle.consumos.length > 0) {
                    descripcion += ` + Consumos`;
                }
            } else if (v.tipo === 'Cobro Parcial') {
                descripcion = v.detalle.consumos.map(c =>
                    `${c.producto} x${c.cantidad}`
                ).join(', ');
            } else if (v.detalle.consumos) {
                descripcion = v.detalle.consumos.map(c =>
                    `${c.producto} x${c.cantidad}`
                ).join(', ');
            }
        } else {
            descripcion = v.tipoDetalle || v.tipo;
        }

        const metodo = v.metodoPago || 'Efectivo';

        return `
                                    <tr>
                                        <td>${v.fecha}</td>
                                        <td>${v.tipo}</td>
                                        <td>${descripcion}</td>
                                        <td>${v.usuario}</td>
                                        <td style="text-align: center;">${metodo}</td>
                                        <td class="monto">S/ ${v.monto.toFixed(2)}</td>
                                    </tr>
                                `;
    }).join('')}
                        </tbody>
                    </table>
                </div>

                ${cierre.consumosDueno && cierre.consumosDueno.length > 0 ? `
                    <div class="section">
                        <div class="section-title">🍺 Consumo del Dueño (No Cobrado)</div>
                        <div class="consumo-dueno">
                            <div style="font-weight: 600; margin-bottom: 10px; color: #856404;">
                                Total: S/ ${cierre.totalConsumosDueno.toFixed(2)}
                            </div>
                            ${cierre.consumosDueno.map(c => `
                                <div class="consumo-item">
                                    <div style="font-weight: 500;">${c.fecha}</div>
                                    <div style="font-size: 12px; color: #666; margin-top: 3px;">
                                        ${c.productos.map(p => `${p.nombre} x${p.cantidad}`).join(', ')}
                                    </div>
                                    <div style="font-weight: 600; color: #ff9800; margin-top: 3px;">
                                        S/ ${c.total.toFixed(2)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>

            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `);

    ventanaImpresion.document.close();
}

function actualizarHistorialCierres() {
    const container = document.getElementById('historialCierresContainer');
    if (!container) return;

    if (cierres.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">No hay cierres registrados</p>';
        return;
    }

    const cierresOrdenados = [...cierres].reverse();

    container.innerHTML = cierresOrdenados.slice(0, 10).map((c, index) => `
        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 10px; padding: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600; color: #2d7a4d;">
                        🔒 Cierre #${c.id}
                        ${index === 0 ? '<span style="background: #28a745; color: white; font-size: 11px; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">ÚLTIMO</span>' : ''}
                    </div>
                    <div style="font-size: 12px; color: #666; margin-top: 3px;">
                        📅 ${c.fecha} • 👤 ${c.usuario}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 22px; font-weight: bold; color: #2d7a4d;">S/ ${c.total.toFixed(2)}</div>
                    <div style="font-size: 12px; color: #666;">${c.cantidadVentas} ventas</div>
                </div>
            </div>
            ${(usuarioActual.rol || '').toLowerCase() === 'admin' ? `
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button class="btn btn-blue btn-small" onclick="descargarCierrePDF(${c.id})" style="flex: 1;">
                        📄 PDF
                    </button>
                    <button class="btn btn-red btn-small" onclick="eliminarCierre(${c.id})">
                        🗑️
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// ========== REPORTES Y CIERRES ==========
window.descargarCierrePDF = function (cierreId) {
    const cierre = cierres.find(c => c.id === cierreId);
    if (!cierre) {
        alert('⚠️ Cierre no encontrado');
        return;
    }

    const ventanaImpresion = window.open('', '_blank', 'width=800,height=600');

    ventanaImpresion.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Cierre de Caja #${cierre.id}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    padding: 30px;
                    background: white;
                    color: #333;
                }
                .header {
                    text-align: center;
                    border-bottom: 3px solid #2d7a4d;
                    padding-bottom: 20px;
                    margin-bottom: 25px;
                }
                h1 {
                    color: #2d7a4d;
                    font-size: 28px;
                    margin-bottom: 10px;
                }
                .resumen-box {
                    background: #e8f5e9;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                    border-left: 4px solid #2d7a4d;
                }
                .resumen-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-top: 15px;
                }
                .resumen-item {
                    padding: 10px;
                    background: white;
                    border-radius: 5px;
                }
                .venta-item {
                    background: #f9f9f9;
                    padding: 15px;
                    border-radius: 6px;
                    margin-bottom: 12px;
                    border-left: 4px solid #2d7a4d;
                    page-break-inside: avoid;
                }
                .venta-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #e0e0e0;
                }
                .detalle-venta {
                    background: #fff;
                    padding: 10px;
                    border-radius: 4px;
                    margin-top: 8px;
                    font-size: 12px;
                }
                .footer {
                    margin-top: 30px;
                    text-align: center;
                    color: #999;
                    font-size: 11px;
                    border-top: 1px solid #e0e0e0;
                    padding-top: 15px;
                }
                @media print {
                    body { padding: 15px; }
                    .no-print { display: none; }
                    @page { margin: 1cm; }
                }
                .btn-imprimir {
                    background: #2d7a4d;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    margin: 15px 0;
                }
                .btn-imprimir:hover {
                    background: #1f5a37;
                }
                .consumo-dueno {
                    background: #fff3cd;
                    padding: 15px;
                    border-radius: 8px;
                    margin-top: 20px;
                    border-left: 4px solid #ff9800;
                }
            </style>
        </head>
        <body>
            <div class="no-print">
                <button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
            </div>
            
            <div class="header">
                <h1>🔒 CIERRE DE CAJA #${cierre.id}</h1>
                <p style="color: #666; margin-top: 5px;">Fecha: ${cierre.fecha}</p>
                <p style="color: #666; margin-top: 5px;">Usuario: ${cierre.usuario}</p>
            </div>
            
            <div class="resumen-box">
                <h2 style="font-size: 18px; color: #2d7a4d; margin-bottom: 15px;">📊 Resumen del Cierre</h2>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 15px; background: white; border-radius: 8px;">
                    <div>
                        <strong style="font-size: 16px; color: #2d7a4d;">Total General</strong>
                        <div style="font-size: 13px; color: #666; margin-top: 5px;">
                            ${cierre.cantidadVentas} ${cierre.cantidadVentas === 1 ? 'transacción' : 'transacciones'}
                        </div>
                    </div>
                    <div style="font-size: 32px; font-weight: bold; color: #2d7a4d;">
                        S/ ${cierre.total.toFixed(2)}
                    </div>
                </div>
                
                <div class="resumen-grid">
                    <div class="resumen-item">
                        <div style="font-size: 11px; color: #666;">Ventas Mesas Billar</div>
                        <div style="font-size: 18px; font-weight: bold; color: #2d7a4d;">S/ ${cierre.ventasMesas.toFixed(2)}</div>
                    </div>
                    <div class="resumen-item">
                        <div style="font-size: 11px; color: #666;">Ventas Productos</div>
                        <div style="font-size: 18px; font-weight: bold; color: #2d7a4d;">S/ ${cierre.ventasProductos.toFixed(2)}</div>
                    </div>
                    <div class="resumen-item" style="border-top: 2px solid #2d7a4d; margin-top: 5px;">
                        <div style="font-size: 11px; color: #666;">Margen Ventas</div>
                        <div style="font-size: 18px; font-weight: bold; color: #10b981;">+ S/ ${(cierre.gananciaVentas || 0).toFixed(2)}</div>
                    </div>
                    <div class="resumen-item" style="border-top: 2px solid #ef4444; margin-top: 5px;">
                        <div style="font-size: 11px; color: #666;">Total Gastos/Egresos</div>
                        <div style="font-size: 18px; font-weight: bold; color: #ef4444;">- S/ ${(cierre.totalEgresos || 0).toFixed(2)}</div>
                    </div>
                    <div class="resumen-item" style="border-top: 2px solid #f59e0b; margin-top: 5px;">
                        <div style="font-size: 11px; color: #666;">Costo Consumo Dueño</div>
                        <div style="font-size: 18px; font-weight: bold; color: #f59e0b;">- S/ ${(cierre.totalConsumosDuenoCosto || 0).toFixed(2)}</div>
                    </div>
                    <div class="resumen-item" style="border-top: 2px solid #3b82f6; margin-top: 5px; grid-column: 1 / -1; background: #f0f9ff; display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 14px; font-weight: bold; color: #1e40af;">🚀 UTILIDAD NETA DEL TURNO</div>
                        <div style="font-size: 24px; font-weight: 800; color: #1e40af;">S/ ${(cierre.utilidadNeta || 0).toFixed(2)}</div>
                    </div>
                </div>
            </div>

            ${cierre.movimientos && cierre.movimientos.length > 0 ? `
                <h2 style="font-size: 18px; color: #333; margin-bottom: 10px; margin-top: 30px;">💸 Movimientos de Caja</h2>
                <div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 10px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead>
                            <tr style="border-bottom: 2px solid #eee;">
                                <th style="text-align: left; padding: 8px;">Tipo</th>
                                <th style="text-align: left; padding: 8px;">Descripción</th>
                                <th style="text-align: right; padding: 8px;">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cierre.movimientos.map(m => `
                                <tr style="border-bottom: 1px solid #f5f5f5;">
                                    <td style="padding: 8px;"><span style="color: ${m.tipo === 'ingreso' ? '#10b981' : '#ef4444'}; font-weight: bold;">${m.tipo.toUpperCase()}</span></td>
                                    <td style="padding: 8px;">${m.descripcion}</td>
                                    <td style="padding: 8px; text-align: right; font-weight: bold; color: ${m.tipo === 'ingreso' ? '#10b981' : '#ef4444'}">
                                        ${m.tipo === 'ingreso' ? '+' : '-'} S/ ${m.monto.toFixed(2)}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
            
            <h2 style="font-size: 18px; color: #333; margin-bottom: 15px; margin-top: 30px;">📋 Detalle de Ventas</h2>
            
            ${cierre.ventas.map(v => {
        let detalleHTML = '';

        if (v.detalle) {
            if (v.tipo === 'Mesa Billar') {
                detalleHTML = `
                            <div class="detalle-venta">
                                <strong>🎱 Mesa de Billar ${v.detalle.mesaId}</strong><br>
                                <div style="margin-top: 8px;">
                                    ⏰ Horario: ${v.detalle.horaInicio} - ${v.detalle.horaFin}<br>
                                    ⏱️ Tiempo: ${v.detalle.tiempoMinutos} minutos (${v.detalle.tiempoHoras}h ${v.detalle.tiempoMinutosExtra}min)<br>
                                    💵 Costo tiempo: S/ ${v.detalle.costoTiempo.toFixed(2)}
                                </div>
                                ${v.detalle.consumos.length > 0 ? `
                                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0;">
                                        <strong>🛒 Consumos:</strong><br>
                                        ${v.detalle.consumos.map(c =>
                    `<div style="margin: 3px 0;">• ${c.producto} x${c.cantidad} (S/ ${c.precioUnitario.toFixed(2)} c/u) = S/ ${c.subtotal.toFixed(2)}</div>`
                ).join('')}
                                        <div style="margin-top: 5px; font-weight: bold;">Total Consumos: S/ ${v.detalle.totalConsumos.toFixed(2)}</div>
                                    </div>
                                ` : ''}
                            </div>
                        `;
            } else if (v.tipo === 'Mesa Consumo') {
                detalleHTML = `
                            <div class="detalle-venta">
                                <strong>🍺 ${v.tipoDetalle}</strong><br>
                                <div style="margin-top: 8px;">
                                    <strong>🛒 Consumos:</strong><br>
                                    ${v.detalle.consumos.map(c =>
                    `<div style="margin: 3px 0;">• ${c.producto} x${c.cantidad} (S/ ${c.precioUnitario.toFixed(2)} c/u) = S/ ${c.subtotal.toFixed(2)}</div>`
                ).join('')}
                                </div>
                            </div>
                        `;
            } else if (v.tipo === 'Venta Directa') {
                detalleHTML = `
                            <div class="detalle-venta">
                                <strong>🛒 Venta Directa</strong><br>
                                <div style="margin-top: 8px;">
                                    ${v.detalle.consumos.map(c =>
                    `<div style="margin: 3px 0;">${c.producto}: ${c.cantidad} × S/ ${c.precioUnitario.toFixed(2)} = S/ ${c.subtotal.toFixed(2)}</div>`
                ).join('')}
                                </div>
                            </div>
                        `;
            } else if (v.tipo === 'Venta Manual') {
                detalleHTML = `<div class="detalle-venta">📝 ${v.tipoDetalle}</div>`;
            } else if (v.tipo === 'Cobro Parcial') {
                detalleHTML = `
                            <div class="detalle-venta" style="background: #fff3cd; border-left: 4px solid #ff9800;">
                                <strong>💰 Cobro Parcial</strong><br>
                                <div style="margin-top: 8px;">
                                    <strong>🛒 Items cobrados:</strong><br>
                                    ${v.detalle.consumos.map(c =>
                    `<div style="margin: 3px 0;">• ${c.producto} x${c.cantidad} (S/ ${c.precioUnitario.toFixed(2)} c/u) = S/ ${c.subtotal.toFixed(2)}</div>`
                ).join('')}
                                </div>
                            </div>
                        `;
            }
        } else {
            detalleHTML = `<div class="detalle-venta">${v.tipoDetalle || v.tipo}</div>`;
        }

        return `
                    <div class="venta-item">
                        <div class="venta-header">
                            <div>
                                <div style="font-weight: bold; color: #333;">${v.fecha}</div>
                                <div style="font-size: 12px; color: #666; margin-top: 3px;">Usuario: ${v.usuario}</div>
                            </div>
                            <div style="font-size: 20px; font-weight: bold; color: #2d7a4d;">S/ ${v.monto.toFixed(2)}</div>
                        </div>
                        ${detalleHTML}
                    </div>
                `;
    }).join('')}
            
            ${cierre.consumosDueno && cierre.consumosDueno.length > 0 ? `
                <div class="consumo-dueno">
                    <h2 style="font-size: 18px; color: #856404; margin-bottom: 15px;">🍽️ Consumo del Dueño (No Cobrado)</h2>
                    <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong style="font-size: 16px; color: #856404;">Costo Total Perdido</strong>
                                <div style="font-size: 13px; color: #856404; margin-top: 5px;">
                                    ${cierre.consumosDueno.length} ${cierre.consumosDueno.length === 1 ? 'registro' : 'registros'}
                                </div>
                            </div>
                            <div style="font-size: 28px; font-weight: bold; color: #ff9800;">
                                S/ ${(cierre.totalConsumosDuenoCosto || 0).toFixed(2)}
                            </div>
                        </div>
                    </div>
                    
                    ${cierre.consumosDueno.map(c => `
                        <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <strong>${c.fecha}</strong>
                                <strong style="color: #ff9800;">Costo: S/ ${(c.totalCosto || 0).toFixed(2)}</strong>
                            </div>
                            <div style="font-size: 12px;">
                                ${c.productos.map(p =>
        `<div style="margin: 2px 0;">• ${p.nombre} x${p.cantidad} (Costo: S/ ${(p.precioCosto || 0).toFixed(2)} c/u)</div>`
    ).join('')}
                            </div>
                        </div>
                    `).join('')}
                    
                    <div style="background: #fff; padding: 12px; border-radius: 6px; margin-top: 15px; border: 2px solid #ff9800;">
                        <p style="font-size: 12px; color: #856404; text-align: center;">
                            ⚠️ Estos consumos se restan de la utilidad neta a precio de costo.
                        </p>
                    </div>
                </div>
            ` : ''}
            
            <div class="footer">
                <p>Sistema de Gestión de Billar • Reporte generado automáticamente</p>
                <p style="margin-top: 5px;">Documento válido sin firma</p>
            </div>
        </body>
        </html>
    `);

    ventanaImpresion.document.close();

    setTimeout(() => {
        ventanaImpresion.focus();
    }, 250);

    debugLog('sistema', '📄 PDF de cierre generado', { cierreId });
};

window.eliminarCierre = async function (id) {
    if (!confirm('¿Estás seguro de eliminar este cierre?')) return;

    cierres = cierres.filter(c => c.id !== id);
    await guardarCierres();
    actualizarHistorialCierres();
    generarReporte();
};

// ===========================================
// ========== ANÁLISIS FINANCIERO ============
// ===========================================

window.actualizarDashboardFinanciero = function () {
    if ((usuarioActual.rol || '').toLowerCase() !== 'admin') return;

    debugLog('sistema', '📊 Generando Dashboard Financiero...');

    // 1. Ganancia Bruta (Utilidad Bruta de Ventas: incluye productos y servicios/tiempo)
    const gananciaVentasActual = ventas.reduce((acc, v) => acc + (v.ganancia || 0), 0);
    const gananciaVentasHistorica = cierres.reduce((acc, c) => acc + (c.gananciaVentas || 0), 0);
    const gananciaBrutaTotal = gananciaVentasActual + gananciaVentasHistorica;

    // --- DESGLOSE POR MÉTODO DE PAGO ---
    const ventasEfectivoActual = ventas.filter(v => (v.metodoPago || 'Efectivo') === 'Efectivo').reduce((acc, v) => acc + (v.monto || 0), 0);
    const ventasYapeActual = ventas.filter(v => v.metodoPago === 'Yape').reduce((acc, v) => acc + (v.monto || 0), 0);

    // Histórico por método
    const ventasEfectivoHistorica = cierres.reduce((acc, c) => acc + (c.totalEfectivo || c.totalVentas || 0), 0);
    const ventasYapeHistorica = cierres.reduce((acc, c) => acc + (c.totalYape || 0), 0);

    const totalEfectivo = ventasEfectivoActual + ventasEfectivoHistorica;

    // Balance Yape (Ventas - Transferencias + Ajustes)
    const { balLocal, balChica, balYape } = calcularBalances();
    const totalDashboardYape = balYape;

    let inversionStockActual = 0;
    let totalVentaProductosActual = 0;
    let gananciaPotencialTotal = 0;

    productos.forEach(p => {
        const costo = p.precioCosto || 0;
        const margenPorUnidad = (p.precio || 0) - costo;
        inversionStockActual += (p.stock || 0) * costo;
        totalVentaProductosActual += (p.unidadesVendidas || 0) * p.precio;
        gananciaPotencialTotal += (p.stock || 0) * margenPorUnidad;
    });

    // 2. Gastos y Movimientos
    const totalIngresosExtraActual = movimientos.filter(m => m.tipo === 'ingreso').reduce((acc, curr) => acc + curr.monto, 0);
    const totalIngresosExtraHistorico = cierres.reduce((acc, c) => acc + (c.totalIngresosExtra || 0), 0);
    const totalIngresosExtra = totalIngresosExtraActual + totalIngresosExtraHistorico;

    const totalEgresosActual = movimientos.filter(m => m.tipo === 'egreso' || m.tipo === 'retiro' || m.tipo === 'reposicion').reduce((acc, curr) => acc + curr.monto, 0);
    const totalEgresosHistorico = cierres.reduce((acc, c) => acc + (c.totalEgresos || 0), 0);
    const totalEgresos = totalEgresosActual + totalEgresosHistorico;

    const totalAjustesActual = movimientos.filter(m => m.tipo === 'ajuste').reduce((acc, m) => {
        const factor = (m.ajusteTipo === 'positivo') ? 1 : -1;
        return acc + (m.monto * factor);
    }, 0);
    const totalAjustesHistorico = cierres.reduce((acc, c) => acc + (c.totalAjustes || 0), 0);
    const totalAjustes = totalAjustesActual + totalAjustesHistorico;

    const totalConsumoDuenoCostoActual = consumosDueno.reduce((acc, c) => acc + (c.totalCosto || 0), 0);
    const totalConsumoDuenoCostoHistorico = cierres.reduce((acc, c) => acc + (c.totalConsumosDuenoCosto || 0), 0);
    const totalConsumoDuenoCosto = totalConsumoDuenoCostoActual + totalConsumoDuenoCostoHistorico;

    // 3. Utilidad Neta Total
    const utilidadNeta = gananciaBrutaTotal + totalIngresosExtra - totalEgresos + totalAjustes - totalConsumoDuenoCosto;

    // 4. Margen Promedio
    const margenProm = totalVentaProductosActual > 0 ? (gananciaVentasActual / totalVentaProductosActual) * 100 : 0;

    // Actualizar UI - Cards
    if (document.getElementById('dashDineroCaja')) {
        document.getElementById('dashDineroCaja').textContent = `S/ ${(balLocal + balChica + balYape).toFixed(2)}`;
    }
    document.getElementById('dashGananciaBruta').textContent = `S/ ${gananciaBrutaTotal.toFixed(2)}`;
    document.getElementById('dashGananciaPotencial').textContent = `S/ ${gananciaPotencialTotal.toFixed(2)}`;
    document.getElementById('dashUtilidadNeta').textContent = `S/ ${utilidadNeta.toFixed(2)}`;
    document.getElementById('dashInversionStock').textContent = `S/ ${inversionStockActual.toFixed(2)}`;
    document.getElementById('dashMargenPromedio').textContent = `${margenProm.toFixed(1)}%`;

    // --- MOSTRAR DESGLOSE DE PAGO Y CAJAS EN DASHBOARD ---
    const containerBreakdown = document.getElementById('dashBreakdownContainer') || crearBreakdownContainer();

    containerBreakdown.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
            <div style="background: #f0fdf4; border: 1px solid #10b981; padding: 15px; border-radius: 10px; text-align: center;">
                <small style="color: #047857; font-weight: 600;">💵 Ventas Efectivo (Total)</small>
                <div style="font-size: 20px; font-weight: bold; color: #064e3b;">S/ ${totalEfectivo.toFixed(2)}</div>
            </div>
            <div style="background: #f5f0f7; border: 1px solid #742284; padding: 15px; border-radius: 10px; text-align: center;">
                <small style="color: #742284; font-weight: 600;">📱 Saldo Digital (Yape/Plin)</small>
                <div style="font-size: 20px; font-weight: bold; color: #4c1d95;">S/ ${balYape.toFixed(2)}</div>
            </div>
            <div style="background: #eff6ff; border: 1px solid #3b82f6; padding: 15px; border-radius: 10px; text-align: center;">
                <small style="color: #1d4ed8; font-weight: 600;">🏠 Saldo Real Caja Local</small>
                <div style="font-size: 20px; font-weight: bold; color: #1e3a8a;">S/ ${balLocal.toFixed(2)}</div>
            </div>
            <div style="background: #fff7ed; border: 1px solid #f97316; padding: 15px; border-radius: 10px; text-align: center;">
                <small style="color: #c2410c; font-weight: 600;">👛 Saldo Real Caja Chica</small>
                <div style="font-size: 20px; font-weight: bold; color: #7c2d12;">S/ ${balChica.toFixed(2)}</div>
            </div>
        </div>
        
        <div style="margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="padding: 15px; border: 2px dashed #3b82f6; border-radius: 12px; background: #f0f7ff; text-align: center;">
                <h4 style="color: #1e40af; margin-bottom: 8px;">⚖️ Sincronizar Cuentas</h4>
                <p style="font-size: 11px; color: #1e3a8a; margin-bottom: 12px;">
                    ¿El Panel dice que tienes más dinero del que hay en caja?
                    <br>Usa esto para "cuadrar" la Utilidad con tu saldo real sin borrar nada.
                </p>
                <button onclick="sincronizarUtilidadConCaja()" style="background: #3b82f6; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">
                    ✅ Cuadrar Panel con Caja
                </button>
            </div>

            <div style="padding: 15px; border: 2px dashed #ef4444; border-radius: 12px; background: #fef2f2; text-align: center;">
                <h4 style="color: #991b1b; margin-bottom: 8px;">🚨 Reinicio Contable</h4>
                <p style="font-size: 11px; color: #b91c1c; margin-bottom: 12px;">
                    Borra todo el historial de ventas y movimientos.
                    <br>Solo úsalo si quieres empezar el negocio desde Cero hoy.
                </p>
                <button onclick="reiniciarTodoFinanciero()" style="background: #ef4444; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">
                    🔄 Borrar Todo e Ir a Cero
                </button>
            </div>
        </div>
    `;

    // Actualizar Categorías
    const categorias = ['Gaseosas', 'Golosinas', 'Licores', 'Otros'];
    const containerCats = document.getElementById('dashCategoriasContainer');

    containerCats.innerHTML = categorias.map(cat => {
        const prodsCat = productos.filter(p => (p.categoria || 'Otros') === cat);
        const gananciaCat = prodsCat.reduce((acc, p) => acc + ((p.unidadesVendidas || 0) * (p.precio - (p.precioCosto || 0))), 0);

        const maxGanancia = Math.max(...categorias.map(c =>
            productos.filter(p => (p.categoria || 'Otros') === c).reduce((acc, p) => acc + ((p.unidadesVendidas || 0) * (p.precio - (p.precioCosto || 0))), 0)
        ), 1);

        const porcentajeBarra = (gananciaCat / maxGanancia) * 100;

        return `
            <div class="categoria-bar-container">
                <div class="categoria-info">
                    <span>${cat}</span>
                    <strong>S/ ${gananciaCat.toFixed(2)}</strong>
                </div>
                <div class="bar-outer">
                    <div class="bar-inner" style="width: ${porcentajeBarra}%; background: ${cat === 'Licores' ? '#ef4444' : (cat === 'Gaseosas' ? '#3b82f6' : '#10b981')}"></div>
                </div>
            </div>
        `;
    }).join('');

    // Top Productos
    const topProds = [...productos]
        .sort((a, b) => {
            const ganA = (a.unidadesVendidas || 0) * (a.precio - (a.precioCosto || 0));
            const ganB = (b.unidadesVendidas || 0) * (b.precio - (b.precioCosto || 0));
            return ganB - ganA;
        })
        .slice(0, 5);

    document.getElementById('dashTopProductos').innerHTML = topProds.map(p => `
        <div class="top-producto-item">
            <span>${p.nombre}</span>
            <strong style="color: #10b981;">+ S/ ${((p.unidadesVendidas || 0) * (p.precio - (p.precioCosto || 0))).toFixed(2)}</strong>
        </div>
    `).join('') || '<p style="text-align:center; color: #666; margin-top:20px;">Sin ventas aún</p>';

    actualizarAlertasDashboard();
    actualizarTablaRentabilidad(); // ⭐ NUEVO: Tabla de rentabilidad en tiempo real
};

function crearBreakdownContainer() {
    const context = document.querySelector('.financial-summary-grid');
    const div = document.createElement('div');
    div.id = 'dashBreakdownContainer';
    div.style.gridColumn = '1 / -1';
    context.after(div);
    return div;
}

function actualizarAlertasDashboard() {
    const dashAlertas = document.getElementById('dashAlertasContainer');
    if (!dashAlertas) return;

    let alertHTML = '';
    const prodsBajoMargen = productos.filter(p => {
        const costo = p.precioCosto || 0;
        if (costo === 0) return false;
        const margen = ((p.precio - costo) / p.precio) * 100;
        return margen < 20;
    });

    if (prodsBajoMargen.length > 0) {
        alertHTML += `
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 10px; border-radius: 4px;">
                <strong style="color: #92400e; font-size: 14px;">⚠️ Margen Bajo (< 20%)</strong>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #b45309;">
                    ${prodsBajoMargen.slice(0, 5).map(p => p.nombre).join(', ')}${prodsBajoMargen.length > 5 ? ' y más...' : ''}
                </p>
            </div>
        `;
    }

    const prodsSinCosto = productos.filter(p => !p.precioCosto || p.precioCosto <= 0);
    if (prodsSinCosto.length > 0) {
        alertHTML += `
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin-bottom: 10px; border-radius: 4px;">
                <strong style="color: #991b1b; font-size: 14px;">🚫 Sin Precio de Costo</strong>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #b91c1c;">
                    ${prodsSinCosto.slice(0, 10).map(p => p.nombre).join(', ')}${prodsSinCosto.length > 10 ? ' y más...' : ''}
                </p>
            </div>
        `;
    }

    dashAlertas.innerHTML = alertHTML;
}

// ===========================================
// ========== RENTABILIDAD EN TIEMPO REAL ====
// ===========================================
function actualizarTablaRentabilidad() {
    const container = document.getElementById('sectionRentabilidadReal');
    if (!container) return;

    if (productos.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">No hay productos registrados</p>';
        return;
    }

    // Calcular métricas para cada producto
    const reporte = productos.map(p => {
        const precioVenta = p.precio || 0;
        const precioCosto = p.precioCosto || 0;
        const vendidos = p.unidadesVendidas || 0;

        // Métricas financieras
        const costoVendido = vendidos * precioCosto;
        const gananciaReal = p.gananciaAcumulada || 0;
        // Venta total la derivamos: Ganancia + Costo (Más exacto que precioVenta * vendidos si hubo cambios de precio)
        // O si preferimos precio actual: precioVenta * vendidos. 
        // Usemos lo acumulado para consistencia con ganancia
        const ventaTotal = costoVendido + gananciaReal;

        const margenPorcentaje = ventaTotal > 0 ? (gananciaReal / ventaTotal) * 100 : 0;

        return {
            ...p,
            costoVendido,
            gananciaReal,
            ventaTotal,
            margenPorcentaje
        };
    });

    // Ordenar: Primero los que dan más ganancia
    reporte.sort((a, b) => b.gananciaReal - a.gananciaReal);

    // Totales
    const totalGanancia = reporte.reduce((sum, p) => sum + p.gananciaReal, 0);
    const totalVenta = reporte.reduce((sum, p) => sum + p.ventaTotal, 0);

    // Renderizar Tabla
    container.innerHTML = `
        <table class="ventas-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
                <tr style="background: #e5e7eb; color: #374151; border-bottom: 2px solid #d1d5db;">
                    <th style="padding: 10px; text-align: left;">Producto</th>
                    <th style="padding: 10px; text-align: center;">Stock</th>
                    <th style="padding: 10px; text-align: center;">Vendido</th>
                    <th style="padding: 10px; text-align: right;">Costo Vendido</th>
                    <th style="padding: 10px; text-align: right;">Venta Total</th>
                    <th style="padding: 10px; text-align: right;">GANANCIA REAL</th>
                    <th style="padding: 10px; text-align: center;">%</th>
                </tr>
            </thead>
            <tbody>
                ${reporte.map(p => `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 8px;">
                            <strong>${p.nombre}</strong><br>
                            <small style="color: #666;">${p.categoria || 'Otros'}</small>
                        </td>
                        <td style="padding: 8px; text-align: center;">${p.stock}</td>
                        <td style="padding: 8px; text-align: center;">${p.unidadesVendidas || 0}</td>
                        <td style="padding: 8px; text-align: right; color: #666;">S/ ${p.costoVendido.toFixed(2)}</td>
                        <td style="padding: 8px; text-align: right; color: #1e40af;">S/ ${p.ventaTotal.toFixed(2)}</td>
                        <td style="padding: 8px; text-align: right; font-weight: bold; color: ${p.gananciaReal >= 0 ? '#10b981' : '#dc3545'};">
                            S/ ${p.gananciaReal.toFixed(2)}
                        </td>
                        <td style="padding: 8px; text-align: center; font-size: 11px;">
                            <span style="padding: 2px 5px; border-radius: 4px; background: ${p.margenPorcentaje < 20 ? '#fee2e2' : '#d1fae5'}; color: ${p.margenPorcentaje < 20 ? '#b91c1c' : '#065f46'};">
                                ${p.margenPorcentaje.toFixed(0)}%
                            </span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot style="background: #ecfdf5; font-weight: bold; border-top: 2px solid #10b981; color: #065f46;">
                <tr>
                    <td colspan="4" style="padding: 15px; text-align: right;">TOTAL ACUMULADO (STOCK ACTUAL):</td>
                    <td style="padding: 15px; text-align: right;">S/ ${totalVenta.toFixed(2)}</td>
                    <td style="padding: 15px; text-align: right; font-size: 15px;">S/ ${totalGanancia.toFixed(2)}</td>
                    <td></td>
                </tr>
            </tfoot>
        </table>
    `;
}

// ===========================================
// ========== GESTIÓN DE CAJA ================
// ===========================================

let tipoMovimientoActual = 'egreso';

window.showModalMovimiento = function (tipo) {
    const modal = document.getElementById('modalMovimiento');
    const title = document.getElementById('movimientoModalTitle');
    const btn = document.getElementById('btnGuardarMovimiento');
    const selectTipo = document.getElementById('movimientoTipo');

    selectTipo.value = tipo;

    // Configurar color y título dinámicamente
    if (tipo === 'ingreso') {
        title.textContent = '➕ Registrar Ingreso Extra';
        btn.className = 'btn btn-green btn-full';
    } else if (tipo === 'egreso') {
        title.textContent = '➖ Registrar Gasto / Egreso';
        btn.className = 'btn btn-red btn-full';
    } else if (tipo === 'retiro') {
        title.textContent = '💸 Registrar Retiro de Caja';
        btn.className = 'btn btn-orange btn-full';
    } else {
        title.textContent = '📦 Registrar Reposición Stock';
        btn.className = 'btn btn-purple btn-full';
    }

    document.getElementById('movimientoDescripcion').value = '';
    document.getElementById('movimientoMonto').value = '';
    document.getElementById('movimientoError').classList.add('hidden');

    modal.classList.add('show');
};

window.closeModalMovimiento = function () {
    document.getElementById('modalMovimiento').classList.remove('show');
};

window.guardarMovimiento = async function () {
    const tipo = document.getElementById('movimientoTipo').value;
    const desc = document.getElementById('movimientoDescripcion').value.trim();
    const monto = parseFloat(document.getElementById('movimientoMonto').value);
    const caja = document.getElementById('movimientoCaja').value;
    const errorDiv = document.getElementById('movimientoError');

    if (!desc || isNaN(monto) || monto <= 0) {
        errorDiv.textContent = 'Por favor completa todos los campos con valores válidos';
        errorDiv.classList.remove('hidden');
        return;
    }

    const nuevoMovimiento = {
        id: Date.now(),
        fecha: new Date().toLocaleString(),
        descripcion: desc,
        monto: monto,
        tipo: tipo,
        caja: caja,
        usuario: usuarioActual.nombre
    };

    movimientos.unshift(nuevoMovimiento);
    await guardarMovimientos();
    actualizarTablaMovimientos();
    closeModalMovimiento();
};

// --- GESTIÓN DE TRANSFERENCIAS ---
window.showModalTransferencia = function () {
    document.getElementById('modalTransferencia').classList.add('show');
    document.getElementById('transferenciaMonto').value = '';
    document.getElementById('transferenciaError').classList.add('hidden');
};

window.closeModalTransferencia = function () {
    document.getElementById('modalTransferencia').classList.remove('show');
};

window.guardarTransferencia = async function () {
    const monto = parseFloat(document.getElementById('transferenciaMonto').value);
    const errorDiv = document.getElementById('transferenciaError');

    if (isNaN(monto) || monto <= 0) {
        errorDiv.textContent = 'Ingresa un monto válido';
        errorDiv.classList.remove('hidden');
        return;
    }

    // 🛡️ VALIDACIÓN: No transferir más de lo que hay en Caja Local
    const balances = calcularBalances();
    if (monto > balances.balLocal) {
        errorDiv.textContent = `⚠️ No puedes transferir S / ${monto.toFixed(2)} porque solo tienes S / ${balances.balLocal.toFixed(2)} en Caja Local.`;
        errorDiv.classList.remove('hidden');
        return;
    }

    // Registrar como un movimiento especial
    const nuevaTransferencia = {
        id: Date.now(),
        fecha: new Date().toLocaleString(),
        descripcion: 'Transferencia a Caja Chica',
        monto: monto,
        tipo: 'transferencia',
        caja: 'local', // Origen Local, destino implícito Chica
        usuario: usuarioActual.nombre
    };

    movimientos.unshift(nuevaTransferencia);
    await guardarMovimientos();
    actualizarTablaMovimientos();
    closeModalTransferencia();
    alert(`✅ Transferencia de S / ${monto.toFixed(2)} realizada con éxito.`);
};

// --- AJUSTE DE SALDO (GENÉRICO) ---
let cajaAjusteActual = 'chica';

window.showModalAjusteCaja = function (caja) {
    cajaAjusteActual = caja;
    const modal = document.getElementById('modalAjusteCaja');
    modal.classList.add('show');

    // Texto dinámico
    document.getElementById('ajusteTitulo').textContent = `Ajustar Saldo Caja ${caja === 'local' ? 'Local' : 'Chica'} `;

    const balances = calcularBalances();
    const saldoActual = caja === 'local' ? balances.balLocal : balances.balChica;

    document.getElementById('ajusteMontoActual').textContent = `S / ${saldoActual.toFixed(2)} `;
    document.getElementById('ajusteMontoNuevo').value = '';
    document.getElementById('ajusteError').classList.add('hidden');
};

window.closeModalAjusteCaja = function () {
    const modal = document.getElementById('modalAjusteCaja'); // o modalAjusteCajaChica si no lo renombramos en HTML
    if (modal) modal.classList.remove('show');
    // Soporte para ID antiguo si no se renombra en todas partes
    const modalOld = document.getElementById('modalAjusteCajaChica');
    if (modalOld) modalOld.classList.remove('show');
};

window.guardarAjusteCaja = async function () {
    const nuevoMonto = parseFloat(document.getElementById('ajusteMontoNuevo').value);
    const errorDiv = document.getElementById('ajusteError');

    if (isNaN(nuevoMonto) || nuevoMonto < 0) {
        errorDiv.textContent = 'Ingresa un monto válido (puede ser 0)';
        errorDiv.classList.remove('hidden');
        return;
    }

    const balances = calcularBalances();
    const saldoActual = cajaAjusteActual === 'local' ? balances.balLocal : balances.balChica;
    const diferencia = nuevoMonto - saldoActual;

    if (Math.abs(diferencia) < 0.01) {
        closeModalAjusteCaja();
        return;
    }

    // Registramos la diferencia como un movimiento de tipo "ajuste"
    const nuevoMovimiento = {
        id: Date.now(),
        fecha: new Date().toLocaleString(),
        descripcion: `Ajuste manual de Caja ${cajaAjusteActual === 'local' ? 'Local' : 'Chica'} `,
        monto: Math.abs(diferencia),
        tipo: 'ajuste',
        ajusteTipo: diferencia > 0 ? 'positivo' : 'negativo',
        caja: cajaAjusteActual,
        usuario: usuarioActual.nombre
    };

    movimientos.unshift(nuevoMovimiento);
    await guardarMovimientos();
    actualizarTablaMovimientos();
    closeModalAjusteCaja();
    alert(`✅ Saldo de Caja ${cajaAjusteActual === 'local' ? 'Local' : 'Chica'} ajustado a S / ${nuevoMonto.toFixed(2)} `);
};

window.calcularBalances = function () {
    // 1. Ventas en Efectivo (siempre van a Local)
    const ventasEfectivo = ventas.filter(v => (v.metodoPago || 'Efectivo') === 'Efectivo').reduce((acc, v) => acc + (v.monto || 0), 0);

    // 2. Movimientos manuales
    const ingresosLocal = movimientos.filter(m => m.caja === 'local' && m.tipo === 'ingreso').reduce((acc, m) => acc + m.monto, 0);
    const egresosLocal = movimientos.filter(m => m.caja === 'local' && (m.tipo === 'egreso' || m.tipo === 'retiro' || m.tipo === 'reposicion')).reduce((acc, m) => acc + m.monto, 0);
    const transferenciasSalientes = movimientos.filter(m => m.tipo === 'transferencia').reduce((acc, m) => acc + m.monto, 0);

    const ajustesLocal = movimientos.filter(m => m.caja === 'local' && m.tipo === 'ajuste').reduce((acc, m) => {
        return acc + (m.ajusteTipo === 'positivo' ? m.monto : -m.monto);
    }, 0);

    const ingresosChica = movimientos.filter(m => m.caja === 'chica' && m.tipo === 'ingreso').reduce((acc, m) => acc + m.monto, 0);
    const egresosChica = movimientos.filter(m => m.caja === 'chica' && (m.tipo === 'egreso' || m.tipo === 'retiro' || m.tipo === 'reposicion')).reduce((acc, m) => acc + m.monto, 0);
    const transferenciasEntrantes = transferenciasSalientes;

    const ajustesChica = movimientos.filter(m => m.caja === 'chica' && m.tipo === 'ajuste').reduce((acc, m) => {
        return acc + (m.ajusteTipo === 'positivo' ? m.monto : -m.monto);
    }, 0);

    const balLocal = ventasEfectivo + ingresosLocal - egresosLocal - transferenciasSalientes + ajustesLocal;
    const balChica = ingresosChica + transferenciasEntrantes - egresosChica + ajustesChica;

    // 3. Balance Yape (Ventas - Transferencias + Ajustes)
    const ventasYapeTotal = ventas.filter(v => v.metodoPago === 'Yape').reduce((acc, v) => acc + (v.monto || 0), 0);
    const transYapeTotal = movimientos.filter(m => m.origenYape === true).reduce((acc, m) => acc + (m.monto || 0), 0);
    const ajustesYape = movimientos.filter(m => m.caja === 'yape' && m.tipo === 'ajuste').reduce((acc, m) => {
        return acc + (m.ajusteTipo === 'positivo' ? m.monto : -m.monto);
    }, 0);
    const balYape = ventasYapeTotal - transYapeTotal + ajustesYape;

    const totalEgresosTotal = egresosLocal + egresosChica;

    return { balLocal, balChica, balYape, totalEgresosTotal };
};

window.actualizarTablaMovimientos = function (filtro = 'todos', filtroFecha = 'todo') {
    const tbody = document.getElementById('tablaMovimientos');
    if (!tbody) return;

    // Obtener movimientos (filtro básico)
    let movsFiltrados = movimientos.filter(m => !m.oculto); // Filtrar ocultos

    // Filtro por tipo
    if (filtro !== 'todos') {
        movsFiltrados = movsFiltrados.filter(m => m.tipo === filtro);
    }

    // Filtro por fecha
    if (filtroFecha !== 'todo') {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        movsFiltrados = movsFiltrados.filter(m => {
            const fechaMov = new Date(m.fecha);
            fechaMov.setHours(0, 0, 0, 0);

            if (filtroFecha === 'hoy') {
                return fechaMov.getTime() === hoy.getTime();
            } else if (filtroFecha === 'semana') {
                const haceUnaSemana = new Date(hoy);
                haceUnaSemana.setDate(hoy.getDate() - 7);
                return fechaMov >= haceUnaSemana;
            }
            return true;
        });
    }

    const { balLocal, balChica, balYape, totalEgresosTotal } = calcularBalances();

    // Actualizar UI de balances
    document.getElementById('balanceCajaLocal').textContent = `S/ ${balLocal.toFixed(2)}`;
    document.getElementById('balanceCajaChica').textContent = `S/ ${balChica.toFixed(2)}`;
    document.getElementById('balanceYape').textContent = `S/ ${balYape.toFixed(2)}`;
    document.getElementById('cajaEgresos').textContent = `S/ ${totalEgresosTotal.toFixed(2)}`;
    document.getElementById('cajaBalance').textContent = `S/ ${(balLocal + balChica + balYape).toFixed(2)}`;

    // Renderizar tabla
    tbody.innerHTML = movsFiltrados.map(m => {
        let colorBadge = '#eee';
        if (m.tipo === 'ingreso') colorBadge = '#d1fae5';
        else if (m.tipo === 'egreso') colorBadge = '#fee2e2';
        else if (m.tipo === 'retiro') colorBadge = '#ffedd5';
        else if (m.tipo === 'reposicion') colorBadge = '#f3e8ff';
        else if (m.tipo === 'transferencia') colorBadge = '#dbeafe';
        else if (m.tipo === 'ajuste') colorBadge = '#fef3c7';

        // Signo
        let signo = (m.tipo === 'ingreso') ? '+' : '-';
        if (m.tipo === 'transferencia') signo = '🔄';
        if (m.tipo === 'ajuste') signo = (m.ajusteTipo === 'positivo') ? '+' : '-';

        let colorMonto = m.tipo === 'ingreso' ? '#10b981' : (m.tipo === 'transferencia' ? '#3b82f6' : '#ef4444');
        if (m.tipo === 'ajuste') colorMonto = m.ajusteTipo === 'positivo' ? '#10b981' : '#ef4444';

        return `
        <tr>
            <td><small>${m.fecha}</small></td>
            <td style="text-transform: capitalize;">${m.caja || 'local'}</td>
            <td><span class="user-badge" style="background: ${colorBadge}; color: #333">${m.tipo.toUpperCase()}</span></td>
            <td>${m.descripcion}</td>
            <td style="font-weight: bold; color: ${m.tipo === 'ingreso' ? '#10b981' : (m.tipo === 'transferencia' ? '#3b82f6' : '#ef4444')}">
                ${m.tipo === 'transferencia' ? '' : signo} S/ ${m.monto.toFixed(2)}
            </td>
            <td style="text-align: center; display: flex; gap: 5px; justify-content: center;">
                <button class="delete-btn" onclick="eliminarMovimiento(${m.id})" title="Deshacer operación (Devolver dinero)" style="background: #ef4444; color: white;">🗑️</button>
                <button class="delete-btn" onclick="borrarRegistroSinEfecto(${m.id})" title="Borrar del historial (Mantener saldo igual)" style="background: #6b7280; color: white;">❌</button>
            </td>
        </tr >
        `;
    }).join('') || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">No hay movimientos registrados</td></tr>';
};

window.eliminarMovimiento = async function (id) {
    if (!confirm('¿Deseas DESHACER esta operación?\n\n🗑️ El dinero volverá al saldo (se anulará el gasto/ingreso).\n\nSi solo quieres borrar el registro visualmente pero mantener el gasto, usa el otro botón (❌).')) return;
    movimientos = movimientos.filter(m => m.id !== id);
    await guardarMovimientos();
    actualizarTablaMovimientos();
    // Actualizar dashboard también
    if (typeof actualizarDashboardFinanciero === 'function') actualizarDashboardFinanciero();
};

window.borrarRegistroSinEfecto = async function (id) {
    if (!confirm('¿Borrar registro del historial?\n\n❌ El registro desaparecerá de la lista.\n✅ PERO el efecto en la caja (dinero) se mantendrá igual.\n\nÚsalo para limpiar la lista sin alterar los saldos reales.')) return;

    const index = movimientos.findIndex(m => m.id === id);
    if (index === -1) {
        alert('❌ Error: No se encontró el registro.');
        return;
    }

    const mov = movimientos[index];
    let esNegativo = ['egreso', 'retiro', 'reposicion'].includes(mov.tipo);
    if (mov.tipo === 'ajuste') esNegativo = mov.ajusteTipo === 'negativo';

    // Convertir a ajuste oculto
    movimientos[index].tipo = 'ajuste';
    movimientos[index].ajusteTipo = esNegativo ? 'negativo' : 'positivo';
    movimientos[index].oculto = true;

    await guardarMovimientos();

    // Notificar y refrescar
    if (typeof actualizarDashboardFinanciero === 'function') actualizarDashboardFinanciero();
    actualizarTablaMovimientos();

    alert('✅ Registro borrado de la lista. El dinero en caja NO se ha movido.');
};

window.reiniciarTodoFinanciero = async function () {
    if (!confirm('🚨 ¡CUIDADO! Esta acción borrará TODAS las ventas, gastos y cierres históricos para que el Panel empiece de nuevo en S/ 0.00.\n\n¿Estás seguro de querer borrar el historial financiero?')) return;
    if (!confirm('⚠️ Confirmación FINAL: Se borrarán VENTAS, MOVIMIENTOS y CIERRES.\n\nTus productos y el inventario se mantendrán intactos.\n¿Proceder con el reinicio?')) return;

    // Limpiar datos
    ventas = [];
    movimientos = [];
    cierres = [];
    consumosDueno = [];
    lotesAgotados = [];
    ultimoCierre = null;

    // Resetear contadores de productos
    productos.forEach(p => {
        p.unidadesVendidas = 0;
        p.gananciaAcumulada = 0;
        p.unidadesConsumidasDueno = 0;
        p.conteoAcumuladoLote = 0;
        p.fechaUltimaReposicion = Date.now();
    });

    // Guardar todo
    await Promise.all([
        guardarVentas(),
        guardarMovimientos(),
        guardarCierres(),
        guardarConsumoDueno(),
        guardarLotesAgotados(),
        guardarProductos()
    ]);

    alert('✅ Sistema financiero reiniciado correctamente.');
    location.reload(); // Recargar para limpiar todo el estado
};

// ===========================================
// ========== GESTIÓN DE VENTAS (ELIMINAR) ===
// ===========================================

// ===========================================
// ========== GESTIÓN DE VENTAS (ELIMINAR) ===
// ===========================================

window.showModalEliminarVentas = function () {
    if ((usuarioActual.rol || '').toLowerCase() !== 'admin') {
        mostrarError('Solo los administradores pueden eliminar ventas');
        return;
    }
    document.getElementById('modalEliminarVentas').classList.add('show');
    document.getElementById('fechaInicioEliminar').value = '';
    document.getElementById('fechaFinEliminar').value = '';
    document.getElementById('eliminarVentasError').classList.add('hidden');
};

window.closeModalEliminarVentas = function () {
    document.getElementById('modalEliminarVentas').classList.remove('show');
};

window.eliminarVentasPorRango = async function () {
    const fechaInicioVal = document.getElementById('fechaInicioEliminar').value;
    const fechaFinVal = document.getElementById('fechaFinEliminar').value;
    const errorDiv = document.getElementById('eliminarVentasError');

    if (!fechaInicioVal || !fechaFinVal) {
        errorDiv.textContent = 'Por favor selecciona ambas fechas';
        errorDiv.classList.remove('hidden');
        return;
    }

    const fechaInicio = new Date(fechaInicioVal);
    fechaInicio.setHours(0, 0, 0, 0);

    const fechaFin = new Date(fechaFinVal);
    fechaFin.setHours(23, 59, 59, 999);

    if (fechaInicio > fechaFin) {
        errorDiv.textContent = 'La fecha de inicio debe ser anterior o igual a la fecha fin';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (!confirm(`🛑 ¿Estás seguro de eliminar las ventas desde ${fechaInicio.toLocaleDateString()} hasta ${fechaFin.toLocaleDateString()}?\n\nEsta acción NO se puede deshacer.`)) return;

    if (!confirm('⚠️ CONFIRMACIÓN FINAL: Se borrarán permanentemente los registros de ventas del rango seleccionado.')) return;

    const ventasAnteriores = ventas.length;

    // Filtrar para MANTENER ventas que NO están en el rango
    ventas = ventas.filter(v => {
        // v.id es el timestamp de creación
        const fechaVenta = new Date(v.id);
        return fechaVenta < fechaInicio || fechaVenta > fechaFin;
    });

    const ventasEliminadas = ventasAnteriores - ventas.length;

    if (ventasEliminadas === 0) {
        errorDiv.textContent = 'No se encontraron ventas en el rango seleccionado.';
        errorDiv.classList.remove('hidden');
        return;
    }

    await guardarVentas();
    actualizarTablaVentas();
    actualizarDashboardFinanciero();
    closeModalEliminarVentas();

    alert(`✅ Se eliminaron ${ventasEliminadas} ventas correctamente.`);
};

// ===========================================
// ========== TRANSFERENCIA YAPE =============
// ===========================================

window.showModalTransferenciaYape = function () {
    document.getElementById('modalTransferenciaYape').classList.add('show');
    document.getElementById('transferenciaYapeMonto').value = '';
    document.getElementById('transferenciaYapeDestino').value = 'local'; // Default
    document.getElementById('transferenciaYapeError').classList.add('hidden');
};

window.closeModalTransferenciaYape = function () {
    document.getElementById('modalTransferenciaYape').classList.remove('show');
};

window.guardarTransferenciaYape = async function () {
    const monto = parseFloat(document.getElementById('transferenciaYapeMonto').value);
    const destino = document.getElementById('transferenciaYapeDestino').value;
    const errorDiv = document.getElementById('transferenciaYapeError');

    if (isNaN(monto) || monto <= 0) {
        errorDiv.textContent = 'Ingresa un monto válido mayor a 0';
        errorDiv.classList.remove('hidden');
        return;
    }

    // Registramos el ingreso en la caja seleccionada
    const nuevoMovimiento = {
        id: Date.now(),
        fecha: new Date().toLocaleString(),
        descripcion: 'Transferencia desde Yape',
        monto: monto,
        tipo: 'ingreso', // Es un ingreso para la caja física
        caja: destino,
        origenYape: true, // ⭐ NUEVO: Flag para restar del balance Yape
        usuario: usuarioActual.nombre
    };

    movimientos.unshift(nuevoMovimiento);
    await guardarMovimientos();
    actualizarTablaMovimientos();
    closeModalTransferenciaYape();
    alert(`✅ Transferencia de Yape a Caja ${destino === 'local' ? 'Local' : 'Chica'} registrada por S / ${monto.toFixed(2)} `);
};

// ========== REINICIO FINANCIERO TOTAL ==========
window.reiniciarTodoFinanciero = async function () {
    if (!confirm('🚨 ¡ATENCIÓN! Estás a punto de borrar TODO el historial financiero.\n\nEsto incluye:\n- Todas las ventas pasadas.\n- Todos los movimientos de caja.\n- Todos los cierres de día.\n\n¿Estás SEGURO de querer empezar desde cero?')) return;
    if (!confirm('⚠️ Confirmación FINAL:\n\nLos productos NO se borrarán, pero su historial de ventas se reseteará.\n¿Continuar con el reinicio?')) return;

    // 1. Limpiar arrays globales
    ventas = [];
    movimientos = [];
    cierres = [];
    consumosDueno = [];
    lotesAgotados = [];
    ultimoCierre = null;

    // 2. Resetear productos
    productos.forEach(p => {
        p.unidadesVendidas = 0;
        p.gananciaAcumulada = 0;
        p.unidadesConsumidasDueno = 0;
        p.conteoAcumuladoLote = 0;
        p.fechaUltimaReposicion = Date.now();
    });

    // 3. Guardar todo
    await Promise.all([
        guardarVentas(),
        guardarMovimientos(),
        guardarCierres(),
        guardarConsumoDueno(),
        guardarLotesAgotados(),
        guardarProductos()
    ]);

    // 4. Actualizar UI
    actualizarInventario();
    actualizarTablaVentas();
    actualizarTablaMovimientos();
    actualizarDashboardFinanciero();
    actualizarHistorialCierres();

    alert('✅ Sistema financiero reiniciado. Ahora todo comienza desde S/ 0.00.');
    location.reload(); // Recargar para asegurar limpieza total de modales y estados
};

window.sincronizarUtilidadConCaja = async function () {
    const choice = prompt('¿Qué deseas sincronizar?\n\n1 - Sincronizar PANEL (Hacer que la Utilidad coincida con el dinero en cajas física)\n2 - Sincronizar YAPE (Hacer que el saldo del sistema coincida con tu Yape real)', '1');

    if (choice === '1') {
        const gananciaVentasActual = ventas.reduce((acc, v) => acc + (v.ganancia || 0), 0);
        const gananciaVentasHistorica = cierres.reduce((acc, c) => acc + (c.gananciaVentas || 0), 0);
        const gananciaBrutaTotal = gananciaVentasActual + gananciaVentasHistorica;

        const totalIngresosExtraActual = movimientos.filter(m => m.tipo === 'ingreso').reduce((acc, curr) => acc + curr.monto, 0);
        const totalIngresosExtraHistorico = cierres.reduce((acc, c) => acc + (c.totalIngresosExtra || 0), 0);
        const totalIngresosExtra = totalIngresosExtraActual + totalIngresosExtraHistorico;

        const totalEgresosActual = movimientos.filter(m => m.tipo === 'egreso' || m.tipo === 'retiro' || m.tipo === 'reposicion').reduce((acc, curr) => acc + curr.monto, 0);
        const totalEgresosHistorico = cierres.reduce((acc, c) => acc + (c.totalEgresos || 0), 0);
        const totalEgresos = totalEgresosActual + totalEgresosHistorico;

        const totalAjustesActual = movimientos.filter(m => m.tipo === 'ajuste').reduce((acc, m) => {
            const factor = (m.ajusteTipo === 'positivo') ? 1 : -1;
            return acc + (m.monto * factor);
        }, 0);
        const totalAjustesHistorico = cierres.reduce((acc, c) => acc + (c.totalAjustes || 0), 0);
        const totalAjustes = totalAjustesActual + totalAjustesHistorico;

        const totalConsumoDuenoCostoActual = consumosDueno.reduce((acc, c) => acc + (c.totalCosto || 0), 0);
        const totalConsumoDuenoCostoHistorico = cierres.reduce((acc, c) => acc + (c.totalConsumosDuenoCosto || 0), 0);
        const totalConsumoDuenoCosto = totalConsumoDuenoCostoActual + totalConsumoDuenoCostoHistorico;

        const utilidadNetaActual = gananciaBrutaTotal + totalIngresosExtra - totalEgresos + totalAjustes - totalConsumoDuenoCosto;

        const { balLocal, balChica } = calcularBalances();
        const balanceFisicoReal = balLocal + balChica;

        const diferencia = balanceFisicoReal - utilidadNetaActual;

        if (Math.abs(diferencia) < 0.01) {
            alert('✅ Tu Panel ya está sincronizado con las cajas físicas.');
            return;
        }

        const msg = diferencia > 0
            ? `El Panel muestra S/ ${Math.abs(diferencia).toFixed(2)} MENOS de lo que hay en cajas.\n¿Deseas crear un ajuste para cuadrar?`
            : `El Panel muestra S/ ${Math.abs(diferencia).toFixed(2)} MÁS de lo que hay en cajas.\n¿Deseas crear un ajuste para cuadrar?`;

        if (!confirm(msg)) return;

        movimientos.unshift({
            id: Date.now(),
            fecha: new Date().toLocaleString(),
            descripcion: 'Sincronización Panel vs Cajas Físicas',
            monto: Math.abs(diferencia),
            tipo: 'ajuste',
            ajusteTipo: diferencia > 0 ? 'positivo' : 'negativo',
            oculto: true,
            usuario: usuarioActual.nombre
        });

        await guardarMovimientos();
        actualizarTablaMovimientos();
        actualizarDashboardFinanciero();
        alert('✅ Panel sincronizado.');

    } else if (choice === '2') {
        const { balYape } = calcularBalances();
        const realStr = prompt(`Saldo actual en YAPE (Sistema): S/ ${balYape.toFixed(2)}\n\nIngresa el saldo REAL que ves hoy en tu Yape del celular:`, balYape.toFixed(2));
        const real = parseFloat(realStr);

        if (isNaN(real)) return;

        const diff = real - balYape;
        if (Math.abs(diff) < 0.01) {
            alert('✅ El saldo Yape ya coincide.');
            return;
        }

        if (!confirm(`Se creará un ajuste de S/ ${Math.abs(diff).toFixed(2)} (${diff > 0 ? 'Positivo' : 'Negativo'}) para que el sistema coincida con tu Yape.\n\n¿Proceder?`)) return;

        movimientos.unshift({
            id: Date.now(),
            fecha: new Date().toLocaleString(),
            descripcion: 'Ajuste manual de Sincronización Yape',
            monto: Math.abs(diff),
            tipo: 'ajuste',
            ajusteTipo: diff > 0 ? 'positivo' : 'negativo',
            caja: 'yape',
            oculto: true,
            usuario: usuarioActual.nombre
        });

        await guardarMovimientos();
        actualizarTablaMovimientos();
        actualizarDashboardFinanciero();
        alert('✅ Saldo Yape sincronizado con tu celular.');
    }
};

