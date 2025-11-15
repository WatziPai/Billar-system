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
const TIEMPO_EXPIRACION = 30 * 60 * 1000; // 30 minutos en milisegundos
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
    
    if (tiempoInactivo >= TIEMPO_EXPIRACION) {
        debugLog('seguridad', '⏰ Sesión cerrada por inactividad', {
            tiempoInactivo: Math.floor(tiempoInactivo / 1000 / 60) + ' minutos'
        });
        
        cerrarSesionPorInactividad();
    }
}

function cerrarSesionPorInactividad() {
    usuarioActual = null;
    localStorage.removeItem('sesion');
    localStorage.removeItem('ultimaActividad');
    
    detenerMonitoreoInactividad();
    
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainScreen').classList.add('hidden');
    
    alert('🔒 Tu sesión se cerró automáticamente por 30 minutos de inactividad.\n\nLas mesas ocupadas siguen corriendo normalmente.');
}

function verificarExpiracionSesion() {
    const sesion = localStorage.getItem('sesion');
    
    if (sesion) {
        const ultimaActividad = parseInt(localStorage.getItem('ultimaActividad') || '0');
        const tiempoInactivo = Date.now() - ultimaActividad;
        
        if (tiempoInactivo >= TIEMPO_EXPIRACION) {
            debugLog('seguridad', '⏰ Sesión expirada detectada al cargar', {
                tiempoInactivo: Math.floor(tiempoInactivo / 1000 / 60) + ' minutos'
            });
            
            localStorage.removeItem('sesion');
            localStorage.removeItem('ultimaActividad');
            
            alert('🔒 Tu sesión expiró por inactividad (más de 30 minutos).\n\nPor favor, inicia sesión nuevamente.');
            
            return false;
        }
        
        return true;
    }
    
    return false;
}

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function() {
    debugLog('sistema', '🚀 Iniciando aplicación...');
    showLoading();

    await esperarFirebase();

    // 🔥 Cargar usuarios ANTES del login
    await cargarDatos();

    hideLoading();
    debugLog('sistema', '⏳ Esperando login...');
});


// ESPERAR A QUE FIREBASE ESTÉ LISTO
function esperarFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = setInterval(() => {
            if (window.firebaseDB && window.firebaseDB.isReady()) {
                clearInterval(checkFirebase);
                debugLog('firebase', '✅ Firebase disponible');
                resolve();
            }
        }, 100);

        setTimeout(() => {
            clearInterval(checkFirebase);
            if (!window.firebaseDB) {
                console.error('❌ Firebase no se cargó correctamente');
                alert('Error: Firebase no está disponible. Recarga la página.');
            }
            resolve();
        }, 10000);
    });
}



// CARGAR DATOS (DESPUÉS DEL LOGIN)
async function cargarDatos() {
    debugLog('firebase', '📂 Cargando datos desde Firebase...');

    try {

        // === USUARIOS ===
        const usuariosData = await window.firebaseDB.get('usuarios', 'todos');
        if (usuariosData && usuariosData.lista) {
            usuarios = usuariosData.lista;
        } else {
            usuarios = [{
                id: Date.now(),
                username: 'admin',
                password: 'admin123',
                nombre: 'Administrador',
                rol: 'admin'
            }];
            await window.firebaseDB.set('usuarios', 'todos', { lista: usuarios });
        }

        // === CONFIGURACIÓN ===
        const config = await window.firebaseDB.get('configuracion', 'general');
        if (config) {
            document.getElementById('tarifaHora').value = config.tarifaHora || 5.00;
            document.getElementById('tarifaExtra5Min').value = config.tarifaExtra5Min || 0.50;
        }

        // === SESIÓN ACTIVA ===
        if (verificarExpiracionSesion()) {
            const sesion = localStorage.getItem('sesion');
            if (sesion) {
                const { usuarioId } = JSON.parse(sesion);
                usuarioActual = usuarios.find(u => u.id === usuarioId);
                if (usuarioActual) {
                    mostrarPantallaPrincipal();
                }
            }
        }

        // === VENTAS ===
        const ventasData = await window.firebaseDB.get('ventas', 'todas');
        ventas = ventasData?.lista || [];

        // === PRODUCTOS ===
        const productosData = await window.firebaseDB.get('productos', 'todos');
        productos = productosData?.lista || [];

        // === ERRORES ===
        const erroresData = await window.firebaseDB.get('errores', 'todos');
        erroresReportados = erroresData?.lista || [];

        // === CIERRES ===
        const cierresData = await window.firebaseDB.get('cierres', 'historial');
        cierres = cierresData?.lista || [];

        if (cierres.length > 0) {
            ultimoCierre = cierres[cierres.length - 1].timestamp;
        }

        // === CONSUMOS DUEÑO ===
        const consumosDuenoData = await window.firebaseDB.get('consumos', 'dueno');
        consumosDueno = consumosDuenoData?.lista || [];

        // === MESAS ===
        const mesasData = await window.firebaseDB.get('mesas', 'billar');
        if (mesasData && mesasData.lista) {
            mesas = mesasData.lista;
        } else {
            mesas = [
                { id: 1, ocupada: false, inicio: null, tiempoTranscurrido: 0, consumos: [] },
                { id: 2, ocupada: false, inicio: null, tiempoTranscurrido: 0, consumos: [] },
                { id: 3, ocupada: false, inicio: null, tiempoTranscurrido: 0, consumos: [] },
                { id: 4, ocupada: false, inicio: null, tiempoTranscurrido: 0, consumos: [] }
            ];
            await window.firebaseDB.set('mesas', 'billar', { lista: mesas });
        }

        // === MESAS CONSUMO ===
        const mesasConsumoData = await window.firebaseDB.get('mesas', 'consumo');
        mesasConsumo = mesasConsumoData?.lista || [
            { id: 1, ocupada: false, consumos: [], total: 0 },
            { id: 2, ocupada: false, consumos: [], total: 0 }
        ];

        debugLog('firebase', '✅ Todos los datos cargados correctamente');

    } catch (error) {
        console.error('Error cargando datos:', error);
        mostrarError('Error al cargar datos desde Firebase');
    }
}

// ========== FUNCIONES DE GUARDADO ==========
async function guardarUsuarios() {
    await window.firebaseDB.set('usuarios', 'todos', { lista: usuarios });
}

async function guardarVentas() {
    await window.firebaseDB.set('ventas', 'todas', { lista: ventas });
}

async function guardarProductos() {
    await window.firebaseDB.set('productos', 'todos', { lista: productos });
}

async function guardarErrores() {
    await window.firebaseDB.set('errores', 'todos', { lista: erroresReportados });
}

async function guardarCierres() {
    await window.firebaseDB.set('cierres', 'historial', { lista: cierres });
}

async function guardarConsumosDueno() {
    await window.firebaseDB.set('consumos', 'dueno', { lista: consumosDueno });
}

async function guardarMesas() {
    await window.firebaseDB.set('mesas', 'billar', { lista: mesas });
}

async function guardarMesasConsumo() {
    await window.firebaseDB.set('mesas', 'consumo', { lista: mesasConsumo });
}

async function guardarConfiguracion() {
    const config = {
        tarifaHora: parseFloat(document.getElementById('tarifaHora').value) || 5.00,
        tarifaExtra5Min: parseFloat(document.getElementById('tarifaExtra5Min').value) || 0.50
    };
    await window.firebaseDB.set('configuracion', 'general', config);
    
    // Actualizar el cálculo de todas las mesas activas
    mesas.forEach(mesa => {
        if (mesa.ocupada) actualizarTimer(mesa.id);
    });
    
    alert('✅ Configuración guardada correctamente');
}

// Alias para que funcione desde el HTML
window.crearUsuario = window.guardarUsuario;
window.guardarConfiguracion = guardarConfiguracion;

function guardarSesion() {
    if (usuarioActual) {
        localStorage.setItem('sesion', JSON.stringify({ usuarioId: usuarioActual.id }));
        localStorage.setItem('ultimaActividad', Date.now().toString());
    } else {
        localStorage.removeItem('sesion');
        localStorage.removeItem('ultimaActividad');
    }
}

// ========== UTILIDADES ==========
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

// ========== LOGIN / LOGOUT ==========
window.handleLogin = async function() {
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
        // 👇 NUEVO: Autenticar con Firebase Auth
        const email = username.includes('@') ? username : `${username}@billar.app`;
        debugLog('sistema', '🔐 Intentando autenticar con Firebase Auth...', { email });
        
        const userCredential = await window.firebaseAuth.signIn(email, password);
        
        debugLog('sistema', '✅ Autenticación exitosa en Firebase Auth', { uid: userCredential.user.uid });
        
        // Buscar datos del usuario en Firestore
        const usuario = usuarios.find(u => u.username === username);
        
        if (usuario) {
            usuarioActual = usuario;
            usuarioActual.uid = userCredential.user.uid; // 👈 Agregar UID de Firebase
            guardarSesion();
            errorDiv.classList.add('hidden');
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginPassword').value = '';
            debugLog('sistema', '✅ Login exitoso', { usuario: usuario.nombre });
            mostrarPantallaPrincipal();
        } else {
            errorDiv.textContent = 'Usuario no encontrado en la base de datos';
            errorDiv.classList.remove('hidden');
            debugLog('error', '❌ Usuario autenticado pero no encontrado en Firestore', { username });
        }
    } catch (error) {
        console.error('❌ Error en login:', error);
        
        // Mensajes de error más claros
        if (error.code === 'auth/user-not-found') {
            errorDiv.textContent = 'Usuario no existe en el sistema';
        } else if (error.code === 'auth/wrong-password') {
            errorDiv.textContent = 'Contraseña incorrecta';
        } else if (error.code === 'auth/invalid-email') {
            errorDiv.textContent = 'Usuario inválido';
        } else if (error.code === 'auth/invalid-credential') {
            errorDiv.textContent = 'Usuario o contraseña incorrectos';
        } else {
            errorDiv.textContent = 'Error al iniciar sesión. Intenta nuevamente.';
        }
        
        errorDiv.classList.remove('hidden');
        debugLog('error', '❌ Login fallido', { username, error: error.code });
    }

    btnLogin.disabled = false;
    btnLogin.textContent = 'Iniciar Sesión';
};

window.handleLogout = async function() {
    debugLog('sistema', '👋 Cerrando sesión...', { usuario: usuarioActual ? usuarioActual.nombre : null });
    
    try {
        await window.firebaseAuth.signOut();
        debugLog('sistema', '✅ Sesión cerrada en Firebase Auth');
    } catch (error) {
        console.error('❌ Error al cerrar sesión:', error);
    }
    
    usuarioActual = null;
    guardarSesion();
    detenerMonitoreoInactividad();
    
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainScreen').classList.add('hidden');
};

function mostrarPantallaPrincipal() {
    debugLog('sistema', '🔄 Mostrando pantalla principal...', { mesas: mesas.length });
    
    const loginScreen = document.getElementById('loginScreen');
    const mainScreen = document.getElementById('mainScreen');
    
    if (!loginScreen || !mainScreen) {
        debugLog('error', '❌ Elementos de pantalla no encontrados', {
            loginScreen: !!loginScreen,
            mainScreen: !!mainScreen
        });
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
    
    // Función helper para mostrar/ocultar elementos de forma segura
    const toggleElement = (id, show) => {
        const el = document.getElementById(id);
        if (el) {
            if (show) el.classList.remove('hidden');
            else el.classList.add('hidden');
        } else {
            debugLog('error', `⚠️ Elemento no encontrado: ${id}`);
        }
    };
    
    if (usuarioActual.rol === 'admin') {
        toggleElement('btnUsuarios', true);
        toggleElement('btnAgregarMesa', true);
        toggleElement('btnAgregarMesaConsumo', true);
        toggleElement('tabErrores', true);
        toggleElement('btnReportarError', false);
        toggleElement('btnAgregarProducto', true);
        toggleElement('tabConsumoDueno', true);
    } else {
        toggleElement('btnUsuarios', false);
        toggleElement('btnAgregarMesa', false);
        toggleElement('btnAgregarMesaConsumo', false);
        toggleElement('tabErrores', false);
        toggleElement('btnReportarError', true);
        toggleElement('btnAgregarProducto', false);
        toggleElement('tabConsumoDueno', false);
    }
    
    debugLog('sistema', '🔄 Actualizando todas las vistas...', { mesas: mesas.length });
    
    // Verificar que los contenedores existen antes de actualizar
    const mesasContainer = document.getElementById('mesasContainer');
    const mesasConsumoContainer = document.getElementById('mesasConsumoContainer');
    
    if (!mesasContainer) {
        debugLog('error', '❌ CRÍTICO: mesasContainer no existe en el HTML');
    } else {
        debugLog('sistema', '✅ mesasContainer encontrado, actualizando...');
        actualizarMesas();
    }
    
    if (mesasConsumoContainer) {
        actualizarMesasConsumo();
    }
    
    actualizarTablaVentas();
    actualizarInventario();
    calcularTotal();
    
    debugLog('sistema', '✅ Pantalla principal mostrada completamente');
}

// ========== TABS ==========
window.changeTab = function(tab, event) {
    tabActual = tab;
    debugLog('sistema', '📑 Cambiando tab', { tab });
    
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    const tabContent = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (tabContent) tabContent.classList.add('active');
    
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    
    if (tab === 'reportes') {
        generarReporte();
    } else if (tab === 'errores') {
        actualizarErrores();
    } else if (tab === 'inventario') {
        actualizarInventario();
    } else if (tab === 'consumoDueno') {
        actualizarConsumoDueno(); // ← Esta línea es la clave
    }
};

// ========== GESTIÓN DE MESAS ==========
window.agregarMesa = async function() {
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

window.eliminarMesa = async function(id) {
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
        debugLog('error', '⚠️ Contenedor mesasContainer NO ENCONTRADO en el DOM');
        return;
    }
    
    debugLog('sistema', '🔄 Actualizando mesas...', { 
        total: mesas.length,
        contenedorExiste: !!container 
    });
    
    // Solo limpiamos los timers de mesas que ya no existen
    Object.keys(timers).forEach(id => {
        if (!mesas.find(m => m.id === parseInt(id))) {
            clearInterval(timers[id]);
            delete timers[id];
            debugLog('timer', '🗑️ Timer limpiado de mesa eliminada', { id });
        }
    });
    
    container.innerHTML = '';
    
    mesas.forEach(mesa => {
        const mesaDiv = document.createElement('div');
        mesaDiv.id = `mesa-${mesa.id}`;
        mesaDiv.className = `mesa-card ${mesa.ocupada ? 'mesa-ocupada' : 'mesa-disponible'}`;
        
        mesaDiv.innerHTML = `
            ${usuarioActual && usuarioActual.rol === 'admin' ? `<button class="delete-mesa-btn" onclick="eliminarMesa(${mesa.id})">×</button>` : ''}
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
        container.appendChild(mesaDiv);
        
        // Solo reiniciamos el timer si la mesa está ocupada Y no tiene timer activo
        if (mesa.ocupada && mesa.inicio) {
            if (!timers[mesa.id]) {
                mesa.tiempoTranscurrido = Math.floor((Date.now() - mesa.inicio) / 1000);
                actualizarTimer(mesa.id);
                timers[mesa.id] = setInterval(() => actualizarTimer(mesa.id), 1000);
                debugLog('timer', '▶️ Timer iniciado para mesa', { id: mesa.id });
            }
        } else {
            // Si la mesa no está ocupada, limpiamos su timer si existe
            if (timers[mesa.id]) {
                clearInterval(timers[mesa.id]);
                delete timers[mesa.id];
                debugLog('timer', '⏸️ Timer detenido para mesa', { id: mesa.id });
            }
        }
    });
    
    debugLog('sistema', `✅ ${mesas.length} mesas renderizadas en el DOM`, {
        timersActivos: Object.keys(timers).length
    });
}

window.toggleMesa = function(id) {
    const mesa = mesas.find(m => m.id === id);
    if (!mesa) return;
    
    if (mesa.ocupada) finalizarMesa(id);
    else iniciarMesa(id);
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
    const tarifaExtra = parseFloat(document.getElementById('tarifaExtra5Min').value) || 0.50;
    
    const minutosTotales = Math.floor(segundos / 60);
    const horasCompletas = Math.floor(minutosTotales / 60);
    const minutosRestantes = minutosTotales % 60;
    const bloquesExtra = Math.ceil(minutosRestantes / 5);
    
    const costoHoras = horasCompletas * tarifaHora;
    const costoExtra = bloquesExtra * tarifaExtra;
    
    return {
        costo: costoHoras + costoExtra,
        minutos: minutosTotales,
        horas: horasCompletas,
        minutosExtra: minutosRestantes,
        bloques: bloquesExtra
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
    
    alert(`Mesa ${id} finalizada.\nTiempo: ${resultado.minutos} minutos (${horaInicio} - ${horaFin})\nTotal: S/ ${totalFinal.toFixed(2)}`);
    
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
window.showModalVentaManual = function() {
    document.getElementById('modalVentaManual').classList.add('show');
    document.getElementById('ventaDescripcionManual').value = '';
    document.getElementById('ventaMontoManual').value = '';
};

window.closeModalVentaManual = function() {
    document.getElementById('modalVentaManual').classList.remove('show');
};

window.agregarVentaManual = async function() {
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

window.showModalVentaProductos = function() {
    document.getElementById('modalVentaProductos').classList.add('show');
    renderProductosVenta();
};

window.closeModalVentaProductos = function() {
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

window.agregarVentaProducto = async function(productoId) {
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

window.eliminarVenta = async function(id) {
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
    const total = ventas.reduce((sum, v) => sum + v.monto, 0);
    const totalEl = document.getElementById('totalDia');
    if (totalEl) totalEl.textContent = `S/ ${total.toFixed(2)}`;
}

// ========== GESTIÓN DE PRODUCTOS ==========
window.showModalProducto = function(producto = null) {
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

window.closeModalProducto = function() {
    document.getElementById('modalProducto').classList.remove('show');
    productoEditando = null;
};

window.guardarProducto = async function() {
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

window.eliminarProducto = async function(id) {
    if (usuarioActual.rol !== 'admin') return;
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    productos = productos.filter(p => p.id !== id);
    await guardarProductos();
    actualizarInventario();
};

window.showModalStock = function(productoId) {
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

window.closeModalStock = function() {
    document.getElementById('modalStock').classList.remove('show');
    productoEditando = null;
};

window.ajustarStock = async function() {
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
                            <button class="btn-small btn-green" onclick='showModalProducto(${productoJSON})' style="padding: 5px 10px; font-size: 12px;" title="Editar Producto">
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

// ========== REPORTES ==========
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
        infoCierre = `<div style="background: #e3f2fd; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #2196f3;">
            <strong>📊 Ventas desde último cierre:</strong> ${fechaCierre}
        </div>`;
    }
    
    if (ventasActuales.length === 0) {
        detalleTable.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: #999;">No hay ventas para mostrar</td></tr>';
    } else {
        const ventasOrdenadas = [...ventasActuales].reverse();
        const htmlDetalle = infoCierre + '<table style="width: 100%; border-collapse: collapse;"><thead><tr><th style="background: #2d7a4d; color: white; padding: 12px; text-align: left;">Fecha</th><th style="background: #2d7a4d; color: white; padding: 12px; text-align: left;">Descripción</th><th style="background: #2d7a4d; color: white; padding: 12px; text-align: left;">Usuario</th><th style="background: #2d7a4d; color: white; padding: 12px; text-align: right;">Monto</th></tr></thead><tbody>' + 
            ventasOrdenadas.map(v => {
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
        }).join('') + '</tbody></table>';
        
        detalleTable.parentElement.innerHTML = htmlDetalle;
    }
    
    actualizarHistorialCierres();
    
    debugLog('sistema', '✅ Reporte generado correctamente', { 
        totalVentas, 
        cantidadVentas, 
        ventasMesas,
        ventasProductos
    });
}

window.cerrarDia = async function() {
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
        ventas: ventasActuales.map(v => ({...v})),
        ventasMesas: ventasActuales.filter(v => v.tipo === 'Mesa Billar').reduce((sum, v) => sum + v.monto, 0),
        ventasProductos: ventasActuales.filter(v => v.tipo !== 'Mesa Billar').reduce((sum, v) => sum + v.monto, 0),
        consumosDueno: consumosDuenoActuales.map(c => ({...c})),
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
    
    // Agrupar cierres por día
    const cierresPorDia = {};
    cierres.forEach(cierre => {
        const fecha = new Date(cierre.timestamp);
        const diaKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
        
        if (!cierresPorDia[diaKey]) {
            cierresPorDia[diaKey] = {
                fecha: fecha.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                cierres: []
            };
        }
        cierresPorDia[diaKey].cierres.push(cierre);
    });
    
    const diasOrdenados = Object.keys(cierresPorDia).sort().reverse();
    const cierresOrdenados = [...cierres].reverse();
    
    // Generar HTML de botones de días
    let htmlBotonesDias = '';
    diasOrdenados.slice(0, 3).forEach(dia => {
        const info = cierresPorDia[dia];
        const totalDia = info.cierres.reduce((sum, c) => sum + c.total, 0);
        htmlBotonesDias += `
            <button class="btn btn-blue btn-small" onclick="descargarCierrePorDia('${dia}')" style="padding: 8px 15px;">
                📅 ${dia} (${info.cierres.length} ${info.cierres.length === 1 ? 'cierre' : 'cierres'}) - S/ ${totalDia.toFixed(2)}
            </button>
        `;
    });
    
    if (diasOrdenados.length > 3) {
        htmlBotonesDias += `
            <button class="btn btn-teal btn-small" onclick="mostrarTodosDias()" style="padding: 8px 15px;">
                Ver más días...
            </button>
        `;
    }
    
    // Generar HTML de cada cierre
    let htmlCierres = '';
    
    cierresOrdenados.forEach((c, index) => {
        // Generar detalle de ventas
        let htmlVentas = '';
        
        c.ventas.forEach((v, vIndex) => {
            let detalleHTML = '';
            let iconoTipo = '📝';
            
            if (v.tipo === 'Mesa Billar') {
                iconoTipo = '🎱';
                if (v.detalle) {
                    let htmlConsumos = '';
                    if (v.detalle.consumos && v.detalle.consumos.length > 0) {
                        let itemsConsumos = '';
                        v.detalle.consumos.forEach(consumo => {
                            itemsConsumos += `
                                <div style="font-size: 11px; color: #856404; padding: 2px 0;">
                                    • ${consumo.producto} x${consumo.cantidad} (S/ ${consumo.precioUnitario.toFixed(2)} c/u) = <strong>S/ ${consumo.subtotal.toFixed(2)}</strong>
                                </div>
                            `;
                        });
                        
                        htmlConsumos = `
                            <div style="background: #fff3cd; padding: 8px; border-radius: 4px; margin-top: 8px;">
                                <strong style="font-size: 11px; color: #856404;">🛒 CONSUMOS:</strong>
                                <div style="margin-top: 5px;">
                                    ${itemsConsumos}
                                </div>
                                <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid #ffc107; font-size: 12px; font-weight: bold; color: #856404;">
                                    Total Consumos: S/ ${v.detalle.totalConsumos.toFixed(2)}
                                </div>
                            </div>
                        `;
                    }
                    
                    detalleHTML = `
                        <div style="font-size: 13px; color: #333; margin-bottom: 5px;">
                            <strong>${v.tipoDetalle}</strong>
                        </div>
                        <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                            ⏰ ${v.detalle.horaInicio} - ${v.detalle.horaFin} 
                            (${v.detalle.tiempoMinutos} min = ${v.detalle.tiempoHoras}h ${v.detalle.tiempoMinutosExtra}min)
                            <br>💵 Tiempo: S/ ${v.detalle.costoTiempo.toFixed(2)}
                        </div>
                        ${htmlConsumos}
                    `;
                }
            } else if (v.tipo === 'Mesa Consumo') {
                iconoTipo = '🍺';
                if (v.detalle && v.detalle.consumos) {
                    let itemsConsumos = '';
                    v.detalle.consumos.forEach(consumo => {
                        itemsConsumos += `
                            <div style="font-size: 11px; color: #0c5460; padding: 2px 0;">
                                • ${consumo.producto} x${consumo.cantidad} (S/ ${consumo.precioUnitario.toFixed(2)} c/u) = <strong>S/ ${consumo.subtotal.toFixed(2)}</strong>
                            </div>
                        `;
                    });
                    
                    detalleHTML = `
                        <div style="font-size: 13px; color: #333; margin-bottom: 8px;">
                            <strong>${v.tipoDetalle}</strong>
                        </div>
                        <div style="background: #d1ecf1; padding: 8px; border-radius: 4px;">
                            <strong style="font-size: 11px; color: #0c5460;">🛒 CONSUMOS:</strong>
                            <div style="margin-top: 5px;">
                                ${itemsConsumos}
                            </div>
                        </div>
                    `;
                }
            } else if (v.tipo === 'Venta Directa') {
                iconoTipo = '🛒';
                if (v.detalle && v.detalle.consumos) {
                    let itemsConsumos = '';
                    v.detalle.consumos.forEach(consumo => {
                        itemsConsumos += `
                            <div style="font-size: 11px; color: #155724;">
                                ${consumo.producto}: ${consumo.cantidad} × S/ ${consumo.precioUnitario.toFixed(2)} = <strong>S/ ${consumo.subtotal.toFixed(2)}</strong>
                            </div>
                        `;
                    });
                    
                    detalleHTML = `
                        <div style="font-size: 13px; color: #333; margin-bottom: 8px;">
                            <strong>${v.tipoDetalle}</strong>
                        </div>
                        <div style="background: #d4edda; padding: 8px; border-radius: 4px;">
                            ${itemsConsumos}
                        </div>
                    `;
                }
            } else {
                detalleHTML = `<div style="font-size: 13px; color: #666;">${v.tipoDetalle || v.tipo}</div>`;
            }
            
            htmlVentas += `
                <div style="background: ${vIndex % 2 === 0 ? '#f9f9f9' : 'white'}; padding: 12px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #2d7a4d;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <div style="flex: 1;">
                            <div style="font-size: 11px; color: #999; margin-bottom: 5px;">
                                ${iconoTipo} ${v.fecha}
                            </div>
                            ${detalleHTML}
                        </div>
                        <div style="font-size: 16px; font-weight: bold; color: #2d7a4d; margin-left: 15px;">
                            S/ ${v.monto.toFixed(2)}
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Generar HTML del cierre completo
        htmlCierres += `
            <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 10px; overflow: hidden;">
                <div onclick="toggleDetalleCierre('cierre-${c.id}')" style="cursor: pointer; padding: 15px; display: flex; justify-content: space-between; align-items: center; background: ${index === 0 ? '#f8f9fa' : 'white'}; transition: background 0.2s;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <span style="font-size: 20px;">🔒</span>
                            <div>
                                <div style="font-weight: 600; font-size: 15px; color: #2d7a4d;">
                                    Cierre #${c.id}
                                    ${index === 0 ? '<span style="background: #28a745; color: white; font-size: 11px; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">ÚLTIMO</span>' : ''}
                                </div>
                                <div style="font-size: 12px; color: #666; margin-top: 3px;">
                                    📅 ${c.fecha} • 👤 ${c.usuario}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="text-align: right;">
                            <div style="font-size: 22px; font-weight: bold; color: #2d7a4d;">S/ ${c.total.toFixed(2)}</div>
                            <div style="font-size: 12px; color: #666;">${c.cantidadVentas} ${c.cantidadVentas === 1 ? 'venta' : 'ventas'}</div>
                        </div>
                        <div id="icono-${c.id}" style="font-size: 20px; color: #999; transition: transform 0.3s;">▼</div>
                    </div>
                </div>
                
                <div id="cierre-${c.id}" style="display: none; border-top: 1px solid #e0e0e0;">
                    <div style="padding: 15px; background: #f8f9fa;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div style="background: white; padding: 12px; border-radius: 6px; border-left: 3px solid #2d7a4d;">
                                <div style="font-size: 11px; color: #666; margin-bottom: 4px;">💰 Ventas Mesas</div>
                                <div style="font-size: 18px; font-weight: bold; color: #2d7a4d;">S/ ${c.ventasMesas.toFixed(2)}</div>
                            </div>
                            <div style="background: white; padding: 12px; border-radius: 6px; border-left: 3px solid #007bff;">
                                <div style="font-size: 11px; color: #666; margin-bottom: 4px;">🛒 Ventas Productos</div>
                                <div style="font-size: 18px; font-weight: bold; color: #007bff;">S/ ${c.ventasProductos.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="padding: 15px; max-height: 400px; overflow-y: auto;">
                        <h4 style="margin: 0 0 15px 0; color: #333; font-size: 14px;">📋 Detalle de Ventas</h4>
                        ${htmlVentas}
                    </div>
                    
                    <div style="padding: 15px; background: #f8f9fa; border-top: 1px solid #e0e0e0;">
                        ${usuarioActual.rol === 'admin' ? `
                            <button class="btn btn-blue" onclick="descargarCierrePDF(${c.id})" style="width: 48%; padding: 12px; margin-right: 4%;">
                                📄 Descargar PDF
                            </button>
                            <button class="btn btn-red" onclick="eliminarCierre(${c.id})" style="width: 48%; padding: 12px;">
                                🗑️ Eliminar Cierre
                            </button>
                        ` : `
                            <button class="btn btn-blue" onclick="descargarCierrePDF(${c.id})" style="width: 100%; padding: 12px;">
                                📄 Descargar PDF
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    });
    
    // Ensamblar HTML final
    container.innerHTML = `
        <div style="margin-bottom: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196f3;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                    <strong style="font-size: 16px; color: #1565c0;">📊 Descargas Agrupadas por Día</strong>
                    <div style="font-size: 13px; color: #1976d2; margin-top: 5px;">
                        Descarga todos los cierres de un día en un solo PDF
                    </div>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    ${htmlBotonesDias}
                </div>
            </div>
        </div>
        
        ${htmlCierres}
    `;
}
window.toggleDetalleCierre = function(elementId) {
    const detalle = document.getElementById(elementId);
    const cierreId = elementId.replace('cierre-', '');
    const icono = document.getElementById(`icono-${cierreId}`);
    
    if (detalle.style.display === 'none') {
        detalle.style.display = 'block';
        icono.style.transform = 'rotate(180deg)';
    } else {
        detalle.style.display = 'none';
        icono.style.transform = 'rotate(0deg)';
    }
};

window.descargarCierrePDF = function(cierreId) {
    const cierre = cierres.find(c => c.id === cierreId);
    if (!cierre) {
        alert('❌ No se encontró el cierre');
        return;
    }
    
    // Validar que existan los datos necesarios
    const totalConsumosDueno = (cierre.totalConsumosDueno !== undefined && cierre.totalConsumosDueno !== null) 
        ? cierre.totalConsumosDueno 
        : 0;
    
    const consumosDueno = cierre.consumosDueno || [];
    
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
                .info-cierre {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 25px;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                }
                .info-item {
                    background: white;
                    padding: 12px;
                    border-radius: 5px;
                    border-left: 3px solid #2d7a4d;
                }
                .info-item label {
                    display: block;
                    color: #666;
                    font-size: 11px;
                    margin-bottom: 5px;
                }
                .info-item .valor {
                    font-size: 18px;
                    font-weight: bold;
                    color: #2d7a4d;
                }
                h2 {
                    color: #2d7a4d;
                    font-size: 16px;
                    margin: 25px 0 15px 0;
                    border-bottom: 2px solid #e0e0e0;
                    padding-bottom: 8px;
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
                .venta-titulo {
                    font-weight: bold;
                    font-size: 14px;
                    color: #333;
                }
                .venta-monto {
                    font-size: 18px;
                    font-weight: bold;
                    color: #2d7a4d;
                }
                .venta-fecha {
                    font-size: 11px;
                    color: #999;
                    margin-bottom: 8px;
                }
                .consumos-box {
                    background: #fff3cd;
                    padding: 10px;
                    border-radius: 4px;
                    margin-top: 10px;
                }
                .consumo-item {
                    font-size: 11px;
                    color: #856404;
                    padding: 3px 0;
                    display: flex;
                    justify-content: space-between;
                }
                .consumos-total {
                    margin-top: 8px;
                    padding-top: 8px;
                    border-top: 1px solid #ffc107;
                    font-weight: bold;
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
                    background: #1f5436;
                }
            </style>
        </head>
        <body>
            <div class="no-print">
                <button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
            </div>
            
            <div class="header">
                <h1>🔒 CIERRE DE CAJA</h1>
                <p style="color: #666; margin-top: 5px;">Cierre #${cierre.id}</p>
            </div>
            
            <div class="info-cierre">
                <div class="info-grid">
                    <div class="info-item">
                        <label>📅 Fecha y Hora</label>
                        <div class="valor" style="font-size: 14px;">${cierre.fecha}</div>
                    </div>
                    <div class="info-item">
                        <label>👤 Usuario</label>
                        <div class="valor" style="font-size: 14px;">${cierre.usuario}</div>
                    </div>
                    <div class="info-item">
                        <label>💰 Total del Cierre</label>
                        <div class="valor">S/ ${cierre.total.toFixed(2)}</div>
                    </div>
                    <div class="info-item">
                        <label>📊 Transacciones</label>
                        <div class="valor">${cierre.cantidadVentas}</div>
                    </div>
                    <div class="info-item">
                        <label>🎱 Ventas Mesas</label>
                        <div class="valor" style="font-size: 16px;">S/ ${cierre.ventasMesas.toFixed(2)}</div>
                    </div>
                    <div class="info-item">
                        <label>🛒 Ventas Productos</label>
                        <div class="valor" style="font-size: 16px;">S/ ${cierre.ventasProductos.toFixed(2)}</div>
                    </div>
                    <div class="info-item">
                        <label>🍽️ Consumo Dueño (No Cobrado)</label>
                        <div class="valor" style="font-size: 16px; color: #ff9800;">S/ ${totalConsumosDueno.toFixed(2)}</div>
                    </div>
                </div>
            </div>
            
            <h2>📋 Detalle de Ventas</h2>
            
            ${cierre.ventas.map((v, index) => {
                let iconoTipo = '📝';
                let contenidoVenta = '';
                
                if (v.tipo === 'Mesa Billar') {
                    iconoTipo = '🎱';
                    if (v.detalle) {
                        contenidoVenta = `
                            <div style="margin-top: 8px;">
                                <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                                    ⏰ ${v.detalle.horaInicio} - ${v.detalle.horaFin} 
                                    (${v.detalle.tiempoMinutos} min = ${v.detalle.tiempoHoras}h ${v.detalle.tiempoMinutosExtra}min)
                                </div>
                                <div style="font-size: 12px; color: #666;">
                                    💵 Costo por tiempo: S/ ${v.detalle.costoTiempo.toFixed(2)}
                                </div>
                            </div>
                            ${v.detalle.consumos && v.detalle.consumos.length > 0 ? `
                                <div class="consumos-box">
                                    <div style="font-weight: bold; margin-bottom: 8px; color: #856404; font-size: 12px;">🛒 Consumos:</div>
                                    ${v.detalle.consumos.map(c => `
                                        <div class="consumo-item">
                                            <span>• ${c.producto} x${c.cantidad} (S/ ${c.precioUnitario.toFixed(2)} c/u)</span>
                                            <span>S/ ${c.subtotal.toFixed(2)}</span>
                                        </div>
                                    `).join('')}
                                    <div class="consumos-total">
                                        Total Consumos: S/ ${v.detalle.totalConsumos.toFixed(2)}
                                    </div>
                                </div>
                            ` : ''}
                        `;
                    }
                } else if (v.tipo === 'Mesa Consumo') {
                    iconoTipo = '🍺';
                    if (v.detalle && v.detalle.consumos) {
                        contenidoVenta = `
                            <div class="consumos-box" style="background: #d1ecf1; margin-top: 8px;">
                                <div style="font-weight: bold; margin-bottom: 8px; color: #0c5460; font-size: 12px;">🛒 Consumos:</div>
                                ${v.detalle.consumos.map(c => `
                                    <div class="consumo-item" style="color: #0c5460;">
                                        <span>• ${c.producto} x${c.cantidad} (S/ ${c.precioUnitario.toFixed(2)} c/u)</span>
                                        <span>S/ ${c.subtotal.toFixed(2)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    }
                } else if (v.tipo === 'Venta Directa') {
                    iconoTipo = '🛒';
                    if (v.detalle && v.detalle.consumos) {
                        contenidoVenta = `
                            <div style="margin-top: 8px; font-size: 12px; color: #666;">
                                ${v.detalle.consumos.map(c => `
                                    <div style="padding: 3px 0;">
                                        ${c.producto}: ${c.cantidad} × S/ ${c.precioUnitario.toFixed(2)} = <strong>S/ ${c.subtotal.toFixed(2)}</strong>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    }
                }
                
                return `
                    <div class="venta-item">
                        <div class="venta-fecha">${iconoTipo} ${v.fecha}</div>
                        <div class="venta-header">
                            <div class="venta-titulo">${v.tipoDetalle || v.tipo}</div>
                            <div class="venta-monto">S/ ${v.monto.toFixed(2)}</div>
                        </div>
                        ${contenidoVenta}
                    </div>
                `;
            }).join('')}
            
            ${consumosDueno.length > 0 ? `
                <h2>🍽️ Consumo del Dueño (No Cobrado)</h2>
                ${consumosDueno.map((c, index) => `
                    <div class="venta-item" style="border-left: 4px solid #ff9800;">
                        <div class="venta-fecha">🍽️ ${c.fecha}</div>
                        <div class="venta-header">
                            <div class="venta-titulo">Consumo Personal</div>
                            <div class="venta-monto" style="color: #ff9800;">S/ ${c.total.toFixed(2)}</div>
                        </div>
                        <div style="margin-top: 8px; font-size: 12px; color: #666;">
                            ${c.productos.map(p => `
                                <div style="padding: 3px 0;">
                                    • ${p.nombre} x${p.cantidad} (S/ ${p.precio.toFixed(2)} c/u) = S/ ${(p.precio * p.cantidad).toFixed(2)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            ` : ''}
            
            <div class="footer">
                <p>Sistema de Gestión de Billar • Cierre generado automáticamente</p>
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

window.descargarReportePDF = function() {
    const ventasActuales = ultimoCierre 
        ? ventas.filter(v => v.id > ultimoCierre)
        : ventas;
    
    if (ventasActuales.length === 0) {
        alert('⚠️ No hay ventas para generar el reporte');
        return;
    }
    
    const totalVentas = ventasActuales.reduce((sum, v) => sum + v.monto, 0);
    const ventasMesas = ventasActuales.filter(v => v.tipo === 'Mesa Billar').reduce((sum, v) => sum + v.monto, 0);
    const ventasProductos = ventasActuales.filter(v => v.tipo !== 'Mesa Billar').reduce((sum, v) => sum + v.monto, 0);
    
    const consumosDuenoActuales = ultimoCierre 
        ? consumosDueno.filter(c => c.id > ultimoCierre)
        : consumosDueno;
    const totalConsumosDueno = consumosDuenoActuales.reduce((sum, c) => sum + c.total, 0);
    
    const ventanaImpresion = window.open('', '_blank', 'width=800,height=600');
    
    ventanaImpresion.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Ventas</title>
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
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 30px;
                }
                .info-item {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 5px;
                    border-left: 4px solid #2d7a4d;
                }
                .info-item label {
                    display: block;
                    color: #666;
                    font-size: 12px;
                    margin-bottom: 5px;
                }
                .info-item .valor {
                    font-size: 20px;
                    font-weight: bold;
                    color: #2d7a4d;
                }
                h2 {
                    color: #2d7a4d;
                    font-size: 18px;
                    margin: 25px 0 15px 0;
                    border-bottom: 2px solid #e0e0e0;
                    padding-bottom: 8px;
                }
                .venta-item {
                    background: #f9f9f9;
                    padding: 12px;
                    border-radius: 6px;
                    margin-bottom: 10px;
                    border-left: 3px solid #2d7a4d;
                    page-break-inside: avoid;
                    font-size: 13px;
                }
                .venta-header {
                    display: flex;
                    justify-content: space-between;
                    font-weight: bold;
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
                    background: #1f5436;
                }
            </style>
        </head>
        <body>
            <div class="no-print">
                <button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
            </div>
            
            <div class="header">
                <h1>📊 REPORTE DE VENTAS</h1>
                <p style="color: #666; margin-top: 5px;">Generado: ${new Date().toLocaleString('es-PE')}</p>
            </div>
            
            <div class="info-grid">
                <div class="info-item">
                    <label>💰 Total de Ventas</label>
                    <div class="valor">S/ ${totalVentas.toFixed(2)}</div>
                </div>
                <div class="info-item">
                    <label>📊 Cantidad de Transacciones</label>
                    <div class="valor">${ventasActuales.length}</div>
                </div>
                <div class="info-item">
                    <label>🎱 Ventas de Mesas</label>
                    <div class="valor">S/ ${ventasMesas.toFixed(2)}</div>
                </div>
                <div class="info-item">
                    <label>🛒 Ventas de Productos</label>
                    <div class="valor">S/ ${ventasProductos.toFixed(2)}</div>
                </div>
                <div class="info-item">
                    <label>🍽️ Consumo Dueño (No Cobrado)</label>
                    <div class="valor" style="color: #ff9800;">S/ ${totalConsumosDueno.toFixed(2)}</div>
                </div>
            </div>
            
            <h2>📋 Detalle de Ventas</h2>
            
            ${ventasActuales.reverse().map(v => {
                let descripcion = v.tipoDetalle || v.tipo;
                if (v.detalle && v.detalle.consumos) {
                    descripcion += ' - ' + v.detalle.consumos.map(c => 
                        `${c.producto} x${c.cantidad}`
                    ).join(', ');
                }
                
                return `
                    <div class="venta-item">
                        <div class="venta-header">
                            <span>${v.fecha} - ${descripcion}</span>
                            <span style="color: #2d7a4d;">S/ ${v.monto.toFixed(2)}</span>
                        </div>
                        <div style="color: #666; font-size: 11px; margin-top: 3px;">
                            Usuario: ${v.usuario}
                        </div>
                    </div>
                `;
            }).join('')}
            
            ${consumosDuenoActuales.length > 0 ? `
                <h2>🍽️ Consumo del Dueño (No Cobrado)</h2>
                ${consumosDuenoActuales.map(c => `
                    <div class="venta-item" style="border-left-color: #ff9800;">
                        <div class="venta-header">
                            <span>${c.fecha}</span>
                            <span style="color: #ff9800;">S/ ${c.total.toFixed(2)}</span>
                        </div>
                        <div style="color: #666; font-size: 11px; margin-top: 3px;">
                            ${c.productos.map(p => `${p.nombre} x${p.cantidad}`).join(', ')}
                        </div>
                    </div>
                `).join('')}
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
    
    debugLog('sistema', '📄 PDF de reporte generado');
};

window.descargarReporteExcel = function() {
    alert('📊 Función de descarga Excel próximamente. Por ahora usa el PDF o el cierre de caja que genera CSV.');
};

window.eliminarCierre = async function(cierreId) {
    if (usuarioActual.rol !== 'admin') {
        mostrarError('Solo los administradores pueden eliminar cierres');
        return;
    }
    
    const cierre = cierres.find(c => c.id === cierreId);
    if (!cierre) return;
    
    const confirmar = confirm(
        `⚠️ ¿Eliminar este cierre?\n\n` +
        `📅 Fecha: ${cierre.fecha}\n` +
        `💰 Total: S/ ${cierre.total.toFixed(2)}\n` +
        `📊 Ventas: ${cierre.cantidadVentas}\n\n` +
        `⚠️ ADVERTENCIA: Esta acción NO se puede deshacer.\n` +
        `Se recomienda descargar el PDF antes de eliminar.`
    );
    
    if (!confirmar) return;
    
    const descargo = confirm(
        `¿Ya descargaste el PDF de este cierre?\n\n` +
        `Si no lo has hecho, haz clic en "Cancelar" y descárgalo primero.`
    );
    
    if (!descargo) {
        alert('👍 Puedes descargar el PDF haciendo clic en el botón "📄 Descargar PDF"');
        return;
    }
    
    cierres = cierres.filter(c => c.id !== cierreId);
    
    if (cierres.length > 0) {
        ultimoCierre = cierres[cierres.length - 1].timestamp;
    } else {
        ultimoCierre = null;
    }
    
    await guardarCierres();
    
    alert('✅ Cierre eliminado correctamente');
    
    actualizarHistorialCierres();
    generarReporte();
    
    debugLog('sistema', '🗑️ Cierre eliminado', { cierreId });
};

window.descargarCierrePorDia = function(diaKey) {
    const cierresDelDia = cierres.filter(cierre => {
        const fecha = new Date(cierre.timestamp);
        const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
        return key === diaKey;
    });
    
    if (cierresDelDia.length === 0) {
        alert('❌ No hay cierres para este día');
        return;
    }
    
    const totalDia = cierresDelDia.reduce((sum, c) => sum + c.total, 0);
    const totalVentas = cierresDelDia.reduce((sum, c) => sum + c.cantidadVentas, 0);
    const totalConsumosDueno = cierresDelDia.reduce((sum, c) => (c.totalConsumosDueno || 0) + sum, 0);
    const fechaFormateada = new Date(cierresDelDia[0].timestamp).toLocaleDateString('es-PE', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const ventanaImpresion = window.open('', '_blank', 'width=800,height=600');
    
    ventanaImpresion.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Cierres del ${diaKey}</title>
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
                .info-resumen {
                    background: #e8f5e9;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                    border-left: 4px solid #4caf50;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 15px;
                    margin-top: 15px;
                }
                .info-item {
                    background: white;
                    padding: 12px;
                    border-radius: 5px;
                    border-left: 3px solid #4caf50;
                }
                .info-item label {
                    display: block;
                    color: #666;
                    font-size: 11px;
                    margin-bottom: 5px;
                }
                .info-item .valor {
                    font-size: 18px;
                    font-weight: bold;
                    color: #2d7a4d;
                }
                h2 {
                    color: #2d7a4d;
                    font-size: 18px;
                    margin: 25px 0 15px 0;
                    border-bottom: 2px solid #e0e0e0;
                    padding-bottom: 8px;
                }
                .cierre-bloque {
                    background: #f9f9f9;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    border-left: 4px solid #2196f3;
                    page-break-inside: avoid;
                }
                .cierre-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #e0e0e0;
                }
                .venta-item {
                    background: white;
                    padding: 10px;
                    border-radius: 4px;
                    margin-bottom: 8px;
                    border-left: 2px solid #2d7a4d;
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
                    background: #1f5436;
                }
            </style>
        </head>
        <body>
            <div class="no-print">
                <button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
            </div>
            
            <div class="header">
                <h1>📊 CIERRES DEL DÍA</h1>
                <p style="color: #666; margin-top: 5px; text-transform: capitalize;">${fechaFormateada}</p>
                <p style="color: #999; margin-top: 5px; font-size: 13px;">${cierresDelDia.length} ${cierresDelDia.length === 1 ? 'cierre registrado' : 'cierres registrados'}</p>
            </div>
            
            <div class="info-resumen">
                <h3 style="color: #2d7a4d; margin-bottom: 15px;">💰 Resumen del Día</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Total del Día</label>
                        <div class="valor">S/ ${totalDia.toFixed(2)}</div>
                    </div>
                    <div class="info-item">
                        <label>Total de Ventas</label>
                        <div class="valor">${totalVentas}</div>
                    </div>
                    <div class="info-item">
                        <label>Consumo Dueño</label>
                        <div class="valor" style="color: #ff9800;">S/ ${totalConsumosDueno.toFixed(2)}</div>
                    </div>
                </div>
            </div>
            
            ${cierresDelDia.map((cierre, index) => {
                const totalConsumosCierre = cierre.totalConsumosDueno || 0;
                return `
                    <div class="cierre-bloque">
                        <div class="cierre-header">
                            <div>
                                <h3 style="color: #2196f3; margin-bottom: 5px;">
                                    🔒 Cierre #${cierre.id}
                                    ${index === 0 ? '<span style="background: #4caf50; color: white; font-size: 11px; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">ÚLTIMO</span>' : ''}
                                </h3>
                                <div style="font-size: 13px; color: #666;">
                                    ${cierre.fecha} • ${cierre.usuario}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 24px; font-weight: bold; color: #2d7a4d;">S/ ${cierre.total.toFixed(2)}</div>
                                <div style="font-size: 12px; color: #666;">${cierre.cantidadVentas} ${cierre.cantidadVentas === 1 ? 'venta' : 'ventas'}</div>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                            <div style="background: white; padding: 10px; border-radius: 4px;">
                                <div style="font-size: 11px; color: #666;">🎱 Ventas Mesas</div>
                                <div style="font-size: 16px; font-weight: bold; color: #2d7a4d;">S/ ${cierre.ventasMesas.toFixed(2)}</div>
                            </div>
                            <div style="background: white; padding: 10px; border-radius: 4px;">
                                <div style="font-size: 11px; color: #666;">🛒 Ventas Productos</div>
                                <div style="font-size: 16px; font-weight: bold; color: #007bff;">S/ ${cierre.ventasProductos.toFixed(2)}</div>
                            </div>
                        </div>
                        
                        <h4 style="color: #333; font-size: 14px; margin-bottom: 10px;">Detalle de Ventas:</h4>
                        ${cierre.ventas.slice(0, 5).map(v => {
                            let desc = v.tipoDetalle || v.tipo;
                            if (v.detalle && v.detalle.consumos) {
                                desc += ' - ' + v.detalle.consumos.map(c => `${c.producto} x${c.cantidad}`).join(', ');
                            }
                            return `
                                <div class="venta-item">
                                    <div style="display: flex; justify-content: space-between;">
                                        <span>${desc}</span>
                                        <strong style="color: #2d7a4d;">S/ ${v.monto.toFixed(2)}</strong>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        ${cierre.ventas.length > 5 ? `<div style="text-align: center; color: #999; font-size: 12px; margin-top: 10px;">... y ${cierre.ventas.length - 5} ventas más</div>` : ''}
                    </div>
                `;
            }).join('')}
            
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
    
    debugLog('sistema', '📄 PDF de cierres por día generado', { dia: diaKey, cantidad: cierresDelDia.length });
};

window.mostrarTodosDias = function() {
    alert('📅 Función en desarrollo: Selector de fechas para descargar cierres de cualquier día.');
};

// ========== ERRORES ==========
window.showModalError = function() {
    document.getElementById('modalError').classList.add('show');
    document.getElementById('errorMensaje').value = '';
};

window.closeModalError = function() {
    document.getElementById('modalError').classList.remove('show');
};

window.reportarError = async function() {
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

window.toggleEstadoError = async function(id) {
    const error = erroresReportados.find(e => e.id === id);
    if (!error) return;
    
    error.estado = error.estado === 'pendiente' ? 'resuelto' : 'pendiente';
    await guardarErrores();
    actualizarErrores();
};

window.eliminarError = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este reporte?')) return;
    
    erroresReportados = erroresReportados.filter(e => e.id !== id);
    await guardarErrores();
    actualizarErrores();
};

function actualizarErrores() {
    const container = document.getElementById('erroresContainer');
    if (!container) {
        debugLog('error', '⚠️ Contenedor de errores no encontrado');
        return;
    }
    
    if (erroresReportados.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 50px; color: #999;"><p style="font-size: 48px; margin: 0;">✅</p><p style="margin-top: 10px;">No hay errores reportados</p></div>';
        return;
    }
    
    const erroresOrdenados = [...erroresReportados].reverse();
    
    container.innerHTML = erroresOrdenados.map(e => `
        <div class="error-card ${e.estado === 'resuelto' ? 'error-resuelto' : ''}">
            <div class="error-header">
                <span class="badge ${e.estado === 'pendiente' ? 'badge-warning' : 'badge-success'}">
                    ${e.estado === 'pendiente' ? '⏳ Pendiente' : '✅ Resuelto'}
                </span>
                <span style="font-size: 13px; color: #666;">${e.fecha}</span>
            </div>
            <div class="error-body">
                <p><strong>Descripción:</strong> ${e.descripcion}</p>
                <p style="margin-top: 8px; color: #666;"><strong>Reportado por:</strong> ${e.usuario}</p>
            </div>
            <div class="error-actions">
                <button class="btn-small btn-blue" onclick="toggleEstadoError(${e.id})">
                    ${e.estado === 'pendiente' ? '✓ Marcar Resuelto' : '↻ Reabrir'}
                </button>
                <button class="btn-small btn-red" onclick="eliminarError(${e.id})">
                    🗑️ Eliminar
                </button>
            </div>
        </div>
    `).join('');
    
    debugLog('sistema', '⚠️ Errores actualizados', { total: erroresReportados.length });
}

// ========== USUARIOS ==========
window.toggleUsuarios = function() {
    const panel = document.getElementById('usuariosPanel');
    
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        actualizarUsuarios();
    } else {
        panel.classList.add('hidden');
    }
};

window.showModalUsuario = function(usuario = null) {
    if (usuarioActual.rol !== 'admin') return;
    
    usuarioEditando = usuario;
    const modal = document.getElementById('modalUsuario');
    const title = document.getElementById('usuarioModalTitle');
    
    if (usuario) {
        title.textContent = 'Editar Usuario';
        document.getElementById('nuevoNombre').value = usuario.nombre;
        document.getElementById('nuevoUsername').value = usuario.username;
        document.getElementById('nuevoPassword').value = '';
        document.getElementById('nuevoRol').value = usuario.rol;
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

window.closeModalUsuario = function() {
    document.getElementById('modalUsuario').classList.remove('show');
    usuarioEditando = null;
};

window.guardarUsuario = async function() {
    const nombre = document.getElementById('nuevoNombre').value.trim();
    const username = document.getElementById('nuevoUsername').value.trim();
    const password = document.getElementById('nuevoPassword').value;
    const rol = document.getElementById('nuevoRol').value;
    const errorDiv = document.getElementById('usuarioError');
    
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
    
    if (usuarioEditando) {
        usuarioEditando.nombre = nombre;
        usuarioEditando.username = username;
        if (password) {
            usuarioEditando.password = password;
        }
        usuarioEditando.rol = rol;
    } else {
        usuarios.push({
            id: Date.now(),
            username,
            password,
            nombre,
            rol
        });
    }
    
    await guardarUsuarios();
    actualizarUsuarios();
    window.closeModalUsuario();
};

window.eliminarUsuario = async function(id) {
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
        const usuarioJSON = JSON.stringify(u).replace(/"/g, '&quot;');
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
                    <button class="btn-small btn-green" onclick='showModalUsuario(${usuarioJSON})' style="margin-right: 5px;">✏️</button>
                    ${usuarioActual.id !== u.id ? `<button class="btn-small btn-red" onclick="eliminarUsuario(${u.id})">🗑️</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
    
    debugLog('sistema', '👥 Tabla de usuarios actualizada', { total: usuarios.length });
}

// ========== MESAS DE CONSUMO ==========
window.agregarMesaConsumo = async function() {
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

window.eliminarMesaConsumo = async function(id) {
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

window.toggleMesaConsumo = function(id) {
    const mesa = mesasConsumo.find(m => m.id === id);
    if (!mesa) return;
    
    if (mesa.ocupada) finalizarMesaConsumo(id);
    else iniciarMesaConsumo(id);
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
    
    alert(`Mesa ${id} finalizada.\nTotal: S/ ${mesa.total.toFixed(2)}`);
    
    actualizarMesasConsumo();
    actualizarTablaVentas();
    calcularTotal();
}

// ========== CONSUMOS ==========
window.abrirModalConsumo = function(mesaId, tipo) {
    mesaConsumoActual = mesaId;
    tipoMesaActual = tipo;
    
    document.getElementById('modalConsumo').classList.add('show');
    document.getElementById('consumoModalTitle').textContent = `Consumo - ${tipo === 'billar' ? 'Mesa de Billar' : 'Mesa de Consumo'} ${mesaId}`;
    renderProductosConsumo();
    actualizarListaConsumos();
};

window.closeModalConsumo = function() {
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

window.agregarConsumo = async function(productoId) {
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

window.eliminarConsumo = async function(productoId) {
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
    
    // Usar los IDs correctos del HTML
    const container = document.getElementById('cuentaActualLista');
    const totalEl = document.getElementById('totalCuentaActual');
    
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

// ========== CONSUMO DEL DUEÑO ==========
window.showModalConsumoDueno = function() {
    document.getElementById('modalConsumoDueno').classList.add('show');
    renderProductosConsumoDueno();
    actualizarCarritoConsumoDueno();
};

window.closeModalConsumoDueno = function() {
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

window.agregarProductoConsumoDueno = function(productoId) {
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

window.quitarProductoConsumoDueno = function(productoId) {
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

window.guardarConsumoDueno = async function() {
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
    
    if (btnGuardar) {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar Consumo';
    }
};

function actualizarConsumoDueno() {
    const container = document.getElementById('consumoDuenoContainer');
    if (!container) return;
    
    const consumosActuales = ultimoCierre 
        ? consumosDueno.filter(c => c.id > ultimoCierre)
        : consumosDueno;
    
    if (consumosActuales.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #999;">
                <p style="font-size: 48px; margin: 0;">🍽️</p>
                <p style="margin-top: 10px;">No hay consumos registrados desde el último cierre</p>
                <button class="btn btn-primary" onclick="showModalConsumoDueno()" style="margin-top: 20px; padding: 12px 30px;">
                    ➕ Registrar Primer Consumo
                </button>
            </div>
        `;
        return;
    }
    
    const consumosOrdenados = [...consumosActuales].reverse();
    const totalGeneral = consumosOrdenados.reduce((sum, c) => sum + c.total, 0);
    
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div style="background: #fff3cd; padding: 15px 20px; border-radius: 8px; flex: 1; margin-right: 15px; border-left: 4px solid #ff9800;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 16px; color: #856404;">📊 Total Consumido (No Cobrado)</strong>
                        <div style="font-size: 13px; color: #856404; margin-top: 5px;">
                            ${consumosOrdenados.length} ${consumosOrdenados.length === 1 ? 'registro' : 'registros'}
                        </div>
                    </div>
                    <div style="font-size: 28px; font-weight: bold; color: #ff9800;">
                        S/ ${totalGeneral.toFixed(2)}
                    </div>
                </div>
            </div>
            <button class="btn btn-blue" onclick="descargarConsumoDuenoPDF()" style="padding: 15px 25px; white-space: nowrap;">
                📄 Descargar PDF
            </button>
        </div>
        
        ${consumosOrdenados.map((c, index) => `
            <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 12px; border-left: 4px solid #ff9800;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div style="flex: 1;">
                        <div style="font-size: 13px; color: #999; margin-bottom: 8px;">
                            🍽️ ${c.fecha}
                        </div>
                        <div style="background: #fff3cd; padding: 10px; border-radius: 6px;">
                            <strong style="font-size: 12px; color: #856404;">Productos:</strong>
                            <div style="margin-top: 8px;">
                                ${c.productos.map(p => `
                                    <div style="font-size: 12px; color: #856404; padding: 3px 0; display: flex; justify-content: space-between;">
                                        <span>• ${p.nombre} x${p.cantidad}</span>
                                        <span><strong>S/ ${(p.precio * p.cantidad).toFixed(2)}</strong></span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div style="margin-left: 20px;">
                        <div style="font-size: 22px; font-weight: bold; color: #ff9800;">
                            S/ ${c.total.toFixed(2)}
                        </div>
                    </div>
                </div>
                ${usuarioActual.rol === 'admin' ? `
                    <button class="btn btn-red btn-small" onclick="eliminarConsumoDueno(${c.id})" style="width: 100%;">
                        🗑️ Eliminar Registro
                    </button>
                ` : ''}
            </div>
        `).join('')}
    `;
}

window.descargarConsumoDuenoPDF = function() {
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

window.eliminarConsumoDueno = async function(consumoId) {
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
    // ========== VERIFICAR SESIÓN AUTOMÁTICA CON FIREBASE AUTH ==========
if (window.firebaseAuth) {
    window.firebaseAuth.onAuthChange((user) => {
        if (user && !usuarioActual) {
            debugLog('sistema', '🔄 Usuario autenticado detectado, restaurando sesión...', { uid: user.uid });
            
            // El usuario está autenticado, cargar sus datos
            const username = user.email.replace('@billar.app', '');
            const usuario = usuarios.find(u => u.username === username);
            
            if (usuario) {
                usuarioActual = usuario;
                usuarioActual.uid = user.uid;
                
                // Solo mostrar pantalla si no estamos en proceso de login
                if (document.getElementById('mainScreen').classList.contains('hidden')) {
                    mostrarPantallaPrincipal();
                }
            }
        } else if (!user && usuarioActual) {
            debugLog('sistema', '🔓 Sesión cerrada detectada');
            usuarioActual = null;
        }
    });
    
    debugLog('sistema', '✅ Listener de autenticación configurado');
}
};
