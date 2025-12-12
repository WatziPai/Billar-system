// ========== CONFIGURACIÓN DE DEBUGGING ==========
const DEBUG_MODE = true;

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
    CONFIGURACION: 'configuracion'
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

    if (usuarioActual.rol === 'admin') {
        toggleElement('btnUsuarios', true);
        toggleElement('btnAgregarMesa', true);
        toggleElement('btnAgregarMesaConsumo', true);
        toggleElement('btnUsuarios', true);
        toggleElement('btnAgregarMesa', true);
        toggleElement('btnAgregarMesaConsumo', true);
        toggleElement('btnTabErrores', true);
        toggleElement('btnReportarError', false);
        toggleElement('btnAgregarProducto', true);
        toggleElement('tabConsumoDueno', true);
        toggleElement('btnReportarError', false);
        toggleElement('btnAgregarProducto', true);
        toggleElement('tabConsumoDueno', true);
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
        toggleElement('tabConsumoDueno', false);
        toggleElement('btnReportarError', true);
        toggleElement('btnAgregarProducto', false);
        toggleElement('tabConsumoDueno', false);
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
    } else if (tab === 'consumoDueno') {
        actualizarConsumoDueno();
    }
};

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function () {
    debugLog('sistema', '🚀 Iniciando aplicación...');
    showLoading();

    await esperarFirebase();

    window.firebaseAuth.onAuthChange(async (user) => {
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
    debugLog('firebase', '📂 Cargando datos desde Firebase...');

    try {
        const usuariosData = await window.firebaseDB.get(COLLECTIONS.USUARIOS, DOC_IDS.TODOS);
        if (usuariosData && usuariosData.lista) {
            usuarios = usuariosData.lista;
        } else {
            usuarios = [];
            await guardarDatosGenerico(COLLECTIONS.USUARIOS, DOC_IDS.TODOS, { lista: usuarios });
        }

        const config = await window.firebaseDB.get(COLLECTIONS.CONFIGURACION, DOC_IDS.GENERAL);
        if (config) {
            document.getElementById('tarifaHora').value = config.tarifaHora || 5.00;
            document.getElementById('tarifaExtra5Min').value = config.tarifaExtra5Min || 0.50;
        }

        const ventasData = await window.firebaseDB.get(COLLECTIONS.VENTAS, DOC_IDS.TODAS);
        ventas = ventasData?.lista || [];

        const productosData = await window.firebaseDB.get(COLLECTIONS.PRODUCTOS, DOC_IDS.TODOS);
        productos = productosData?.lista || [];

        const erroresData = await window.firebaseDB.get(COLLECTIONS.ERRORES, DOC_IDS.TODOS);
        erroresReportados = erroresData?.lista || [];

        const cierresData = await window.firebaseDB.get(COLLECTIONS.CIERRES, DOC_IDS.HISTORIAL);
        cierres = cierresData?.lista || [];

        if (cierres.length > 0) {
            ultimoCierre = cierres[cierres.length - 1].timestamp;
        }

        const consumosDuenoData = await window.firebaseDB.get(COLLECTIONS.CONSUMOS, DOC_IDS.DUENO);
        consumosDueno = consumosDuenoData?.lista || [];

        const mesasData = await window.firebaseDB.get(COLLECTIONS.MESAS, DOC_IDS.BILLAR);
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

        const mesasConsumoData = await window.firebaseDB.get(COLLECTIONS.MESAS, DOC_IDS.CONSUMO);
        mesasConsumo = mesasConsumoData?.lista || [
            { id: 1, ocupada: false, consumos: [], total: 0 },
            { id: 2, ocupada: false, consumos: [], total: 0 }
        ];

        debugLog('firebase', '✅ Todos los datos cargados correctamente');

    } catch (error) {
        console.error('Error cargando datos:', error);
        throw error;
    }
}

// ========== FUNCIONES DE GUARDADO GENÉRICO ==========
async function guardarDatosGenerico(coleccion, docId, data) {
    try {
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
        await window.firebaseAuth.signOut();
        debugLog('sistema', '✅ Sesión cerrada en Firebase Auth');
    } catch (error) {
        console.error('❌ Error al cerrar sesión:', error);
    }

    usuarioActual = null;
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

        if (mesa.consumos && mesa.consumos.length > 0) {
            const totalConsumos = mesa.consumos.reduce((sum, c) => sum + (c.precio * c.cantidad), 0);
            mensaje += `🛒 Consumos: S/ ${totalConsumos.toFixed(2)}\n`;
            mensaje += `💰 TOTAL: S/ ${(resultado.costo + totalConsumos).toFixed(2)}`;
        } else {
            mensaje += `💰 TOTAL: S/ ${resultado.costo.toFixed(2)}`;
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
        });
    }

    const totalFinal = costoTiempo + totalConsumos;

    const venta = {
        id: Date.now(),
        tipo: 'Mesa Billar',
        tipoDetalle: `Mesa ${mesa.id}`,
        monto: totalFinal,
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

    alert(`✅ Mesa ${id} finalizada.\nTiempo: ${resultado.minutos} minutos (${horaInicio} - ${horaFin})\nTotal: S/ ${totalFinal.toFixed(2)}`);

    actualizarMesas();
    actualizarTablaVentas();
    calcularTotal();
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
        fecha: new Date().toLocaleString(),
        usuario: usuarioActual.nombre
    };

    ventas.push(venta);
    await guardarVentas();
    actualizarTablaVentas();
    calcularTotal();
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

    container.innerHTML = productos.map(p => {
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

    const venta = {
        id: Date.now(),
        tipo: 'Venta Directa',
        tipoDetalle: `${producto.nombre} x${cantidad}`,
        monto: montoTotal,
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

    await guardarVentas();
    await guardarProductos();

    actualizarTablaVentas();
    calcularTotal();
    renderProductosVenta();
    actualizarInventario();

    alert(`Venta de ${cantidad}x ${producto.nombre} por S/ ${montoTotal.toFixed(2)} registrada.`);

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
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #999;">No hay ventas registradas</td></tr>';
        return;
    }

    const ventasOrdenadas = [...ventas].reverse();

    tbody.innerHTML = ventasOrdenadas.map(v => `
        <tr>
            <td style="font-size: 13px;">${v.fecha}</td>
            <td>${v.tipoDetalle || v.tipo}</td>
            <td style="font-size: 13px; color: #666;">${v.usuario}</td>
            <td style="text-align: right; font-weight: 600; color: #2d7a4d;">S/ ${v.monto.toFixed(2)}</td>
            <td style="text-align: center;">
                ${usuarioActual.rol === 'admin' ? `<button class="delete-btn" onclick="eliminarVenta(${v.id})">🗑️</button>` : '-'}
            </td>
        </tr>
    `).join('');
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
        document.getElementById('productoStock').value = producto.stock;
        document.getElementById('productoStockMin').value = producto.stockMin;
    } else {
        title.textContent = 'Agregar Producto';
        document.getElementById('productoNombre').value = '';
        document.getElementById('productoPrecio').value = '';
        document.getElementById('productoStock').value = '';
        document.getElementById('productoStockMin').value = '5';
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
    const stock = parseInt(document.getElementById('productoStock').value);
    const stockMin = parseInt(document.getElementById('productoStockMin').value);
    const errorDiv = document.getElementById('productoError');

    if (!nombre || isNaN(precio) || precio < 0 || isNaN(stock) || stock < 0 || isNaN(stockMin) || stockMin < 0) {
        errorDiv.textContent = 'Por favor completa todos los campos correctamente';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (productoEditando) {
        productoEditando.nombre = nombre;
        productoEditando.precio = precio;
        productoEditando.stock = stock;
        productoEditando.stockMin = stockMin;
    } else {
        productos.push({
            id: Date.now(),
            nombre,
            precio,
            stock,
            stockMin
        });
    }

    await guardarProductos();
    actualizarInventario();
    window.closeModalProducto();
};

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
    if (usuarioActual.rol === 'admin') {
        inputAjuste.placeholder = 'Ej: +10 o -5';
        inputAjuste.setAttribute('min', '');
    } else {
        inputAjuste.placeholder = 'Ej: +10 (solo positivos)';
        inputAjuste.setAttribute('min', '1');
    }

    document.getElementById('modalStock').classList.add('show');
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

    productoEditando.stock = nuevoStock;
    await guardarProductos();
    actualizarInventario();
    window.closeModalStock();
};

function actualizarInventario() {
    const grid = document.getElementById('inventarioGrid');
    if (!grid) return;

    if (productos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">No hay productos en el inventario</p>';
        return;
    }

    grid.innerHTML = productos.map(p => {
        const stockBajo = p.stock <= p.stockMin;
        const productoJSON = JSON.stringify(p).replace(/"/g, '&quot;');
        return `
            <div class="producto-card">
                <h4>${p.nombre}</h4>
                <div class="producto-precio">S/ ${p.precio.toFixed(2)}</div>
                <div class="producto-info">
                    <div>
                        <small style="display: block; color: #666;">Stock:</small>
                        <div class="producto-stock ${stockBajo ? 'stock-bajo' : ''}">${p.stock}</div>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        ${usuarioActual.rol === 'admin' ? `
                            <button class="btn-small btn-blue" onclick="showModalStock(${p.id})" style="padding: 5px 10px; font-size: 12px;" title="Ajustar Stock">
                                📊
                            </button>

                            <button class="btn-small btn-green" onclick="editarProducto(${p.id})" style="padding: 5px 10px; font-size: 12px;" title="Editar Producto">
                                ✏️
                            </button>
                            <button class="btn-small btn-red" onclick="eliminarProducto(${p.id})" style="padding: 5px 10px; font-size: 12px;" title="Eliminar Producto">
                                🗑️
                            </button>
                        ` : `
                            <button class="btn-small btn-green" onclick="showModalStock(${p.id})" style="padding: 5px 10px; font-size: 12px;" title="Agregar Stock">
                            ➕ Stock
                            </button>
                        `}
                    </div>
                </div>
                ${stockBajo ? '<div style="margin-top: 10px; padding: 8px; background: #fff3cd; border-radius: 5px; font-size: 12px; color: #856404;">⚠️ Stock bajo</div>' : ''}
            </div>
        `;
    }).join('');
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

    if (mesa.total > 0) {
        let detalleConsumos = [];
        if (mesa.consumos && mesa.consumos.length > 0) {
            mesa.consumos.forEach(c => {
                const subtotal = c.precio * c.cantidad;
                detalleConsumos.push({
                    producto: c.nombre,
                    cantidad: c.cantidad,
                    precioUnitario: c.precio,
                    subtotal: subtotal
                });
            });
        }

        const venta = {
            id: Date.now(),
            tipo: 'Mesa Consumo',
            tipoDetalle: `Mesa Consumo ${mesa.id}`,
            monto: mesa.total,
            fecha: new Date().toLocaleString(),
            usuario: usuarioActual.nombre,
            detalle: {
                consumos: detalleConsumos,
                totalConsumos: mesa.total
            }
        };

        ventas.push(venta);
        await guardarVentas();
    }

    mesa.ocupada = false;
    mesa.consumos = [];
    mesa.total = 0;
    await guardarMesasConsumo();

    alert(`✅ Mesa ${id} finalizada.\nTotal: S/ ${mesa.total.toFixed(2)}`);

    actualizarMesasConsumo();
    actualizarTablaVentas();
    calcularTotal();
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

    const total = mesa.consumos.reduce((sum, c) => sum + (c.precio * c.cantidad), 0);

    container.innerHTML = mesa.consumos.map(c => `
        <div class="consumo-item">
            <div>
                <div style="font-weight: 600;">${c.nombre}</div>
                <div style="font-size: 14px; color: #666;">S/ ${c.precio.toFixed(2)} x ${c.cantidad}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-weight: 600; color: #2d7a4d;">S/ ${(c.precio * c.cantidad).toFixed(2)}</div>
                <button class="btn btn-red btn-small" onclick="eliminarConsumo(${c.id})">🗑️</button>
            </div>
        </div>
    `).join('');

    totalEl.textContent = `S/ ${total.toFixed(2)}`;
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

    // 1. Generar Venta
    const venta = {
        id: Date.now(),
        tipo: 'Cobro Parcial',
        tipoDetalle: `Parcial - ${tipoMesaActual === 'billar' ? 'Mesa Billar' : 'Mesa Consumo'} ${mesa.id}`,
        monto: totalCobrar,
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
    alert(`✅ Cobro parcial realizado: S/ ${totalCobrar.toFixed(2)}`);
    closeModalCobroParcial();
    renderProductosConsumo(); // Refrescar stock (aunque no cambia stock total, refresca el modal)
    actualizarListaConsumos(); // Refrescar lista de la mesa
    actualizarTablaVentas();
    calcularTotal();
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
    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';
    }

    const total = carritoConsumoDueno.reduce((sum, c) => sum + (c.precio * c.cantidad), 0);

    const consumo = {
        id: Date.now(),
        fecha: new Date().toLocaleString('es-PE'),
        productos: carritoConsumoDueno.map(c => ({
            nombre: c.nombre,
            precio: c.precio,
            cantidad: c.cantidad
        })),
        total: total
    };

    carritoConsumoDueno.forEach(c => {
        const producto = productos.find(p => p.id === c.id);
        if (producto) {
            producto.stock -= c.cantidad;
        }
    });

    consumosDueno.push(consumo);

    await guardarConsumosDueno();
    await guardarProductos();

    alert(`✅ Consumo registrado por S/ ${total.toFixed(2)}\n\nNota: Este consumo NO se cobra pero se descuenta del stock.`);

    carritoConsumoDueno = [];
    window.closeModalConsumoDueno();
    actualizarInventario();
    actualizarConsumoDueno();

    if (btnGuardar) {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar Consumo';
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
window.cerrarMesaCompleto = function () {
    debugLog('sistema', '❌ cerrarMesaCompleto bloqueado - usar botón Finalizar de la mesa');
    alert('⚠️ Para finalizar y cobrar, cierra este modal y usa el botón "⏹️ Finalizar" de la mesa.');
    window.closeModalConsumo();
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

    const totalCierre = ventasActuales.reduce((sum, v) => sum + v.monto, 0);

    const consumosDuenoActuales = ultimoCierre
        ? consumosDueno.filter(c => c.id > ultimoCierre)
        : consumosDueno;

    const totalConsumosDueno = consumosDuenoActuales.reduce((sum, c) => sum + c.total, 0);

    const confirmar = confirm(
        `¿Cerrar turno/día?\n\n` +
        `📊 Ventas: ${ventasActuales.length}\n` +
        `💰 Total: S/ ${totalCierre.toFixed(2)}\n\n` +
        `Se generará un reporte y las ventas quedarán archivadas.`
    );

    if (!confirmar) return;

    const cierre = {
        id: Date.now(),
        timestamp: Date.now(),
        fecha: new Date().toLocaleString('es-PE'),
        usuario: usuarioActual.nombre,
        cantidadVentas: ventasActuales.length,
        total: totalCierre,
        ventas: ventasActuales.map(v => ({ ...v })),
        ventasMesas: ventasActuales.filter(v => v.tipo === 'Mesa Billar').reduce((sum, v) => sum + v.monto, 0),
        ventasProductos: ventasActuales.filter(v => v.tipo !== 'Mesa Billar').reduce((sum, v) => sum + v.monto, 0),
        consumosDueno: consumosDuenoActuales.map(c => ({ ...c })),
        totalConsumosDueno: totalConsumosDueno
    };

    cierres.push(cierre);
    ultimoCierre = cierre.timestamp;

    await guardarCierres();

    descargarReporteCierre(cierre);

    alert(`✅ Cierre registrado correctamente\n\n📄 Se descargó el reporte automáticamente`);

    generarReporte();
};

function descargarReporteCierre(cierre) {
    const BOM = '\uFEFF';
    let csv = BOM + `CIERRE DE CAJA - ${cierre.fecha}\n\n`;
    csv += `Usuario que cierra,${cierre.usuario}\n`;
    csv += `Fecha y hora,${cierre.fecha}\n\n`;
    csv += 'Concepto,Monto\n';
    csv += `"Total del Cierre","S/ ${cierre.total.toFixed(2)}"\n`;
    csv += `"Ventas Mesas","S/ ${cierre.ventasMesas.toFixed(2)}"\n`;
    csv += `"Ventas Productos/Consumo","S/ ${cierre.ventasProductos.toFixed(2)}"\n`;
    csv += `"Total Transacciones","${cierre.cantidadVentas}"\n`;
    csv += `"Consumo Dueño (No Cobrado)","S/ ${cierre.totalConsumosDueno.toFixed(2)}"\n\n`;

    csv += 'DETALLE DE VENTAS\n';
    csv += 'Fecha,Tipo,Descripción,Usuario,Monto\n';

    cierre.ventas.forEach(v => {
        let descripcion = '';

        if (v.detalle) {
            if (v.tipo === 'Mesa Billar') {
                descripcion = `${v.tipoDetalle} | ${v.detalle.horaInicio}-${v.detalle.horaFin} (${v.detalle.tiempoMinutos}min) | Tiempo: S/${v.detalle.costoTiempo.toFixed(2)}`;
                if (v.detalle.consumos.length > 0) {
                    descripcion += ` | Consumos: `;
                    descripcion += v.detalle.consumos.map(c => `${c.producto} x${c.cantidad}`).join(', ');
                    descripcion += ` = S/${v.detalle.totalConsumos.toFixed(2)}`;
                }
            } else if (v.detalle.consumos) {
                descripcion = v.detalle.consumos.map(c =>
                    `${c.producto} x${c.cantidad} @ S/${c.precioUnitario.toFixed(2)}`
                ).join(' | ');
            }
        } else {
            descripcion = v.tipoDetalle || v.tipo;
        }

        csv += `"${v.fecha}","${v.tipo}","${descripcion}","${v.usuario}","S/ ${v.monto.toFixed(2)}"\n`;
    });

    if (cierre.consumosDueno && cierre.consumosDueno.length > 0) {
        csv += '\nCONSUMO DEL DUEÑO (NO COBRADO)\n';
        csv += 'Fecha,Productos,Total\n';

        cierre.consumosDueno.forEach(c => {
            const productosDesc = c.productos.map(p => `${p.nombre} x${p.cantidad}`).join(', ');
            csv += `"${c.fecha}","${productosDesc}","S/ ${c.total.toFixed(2)}"\n`;
        });
    }

    const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fechaArchivo = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const horaArchivo = new Date().toTimeString().slice(0, 5).replace(/:/g, '');
    a.href = url;
    a.download = `Cierre_${fechaArchivo}_${horaArchivo}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
            ${usuarioActual.rol === 'admin' ? `
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
                        <div style="font-size: 12px; color: #666;">Ventas Mesas de Billar</div>
                        <div style="font-size: 20px; font-weight: bold; color: #2d7a4d;">S/ ${cierre.ventasMesas.toFixed(2)}</div>
                    </div>
                    <div class="resumen-item">
                        <div style="font-size: 12px; color: #666;">Ventas Productos/Consumo</div>
                        <div style="font-size: 20px; font-weight: bold; color: #2d7a4d;">S/ ${cierre.ventasProductos.toFixed(2)}</div>
                    </div>
                </div>
            </div>
            
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
                                <strong style="font-size: 16px; color: #856404;">Total Consumido</strong>
                                <div style="font-size: 13px; color: #856404; margin-top: 5px;">
                                    ${cierre.consumosDueno.length} ${cierre.consumosDueno.length === 1 ? 'registro' : 'registros'}
                                </div>
                            </div>
                            <div style="font-size: 28px; font-weight: bold; color: #ff9800;">
                                S/ ${cierre.totalConsumosDueno.toFixed(2)}
                            </div>
                        </div>
                    </div>
                    
                    ${cierre.consumosDueno.map(c => `
                        <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <strong>${c.fecha}</strong>
                                <strong style="color: #ff9800;">S/ ${c.total.toFixed(2)}</strong>
                            </div>
                            <div style="font-size: 12px;">
                                ${c.productos.map(p =>
        `<div style="margin: 2px 0;">• ${p.nombre} x${p.cantidad} (S/ ${p.precio.toFixed(2)} c/u) = S/ ${(p.precio * p.cantidad).toFixed(2)}</div>`
    ).join('')}
                            </div>
                        </div>
                    `).join('')}
                    
                    <div style="background: #fff; padding: 12px; border-radius: 6px; margin-top: 15px; border: 2px solid #ff9800;">
                        <p style="font-size: 12px; color: #856404; text-align: center;">
                            ⚠️ Estos consumos NO fueron cobrados pero se descontaron del stock
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
