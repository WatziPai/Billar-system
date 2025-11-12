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
        firebase: 'background: #ffc107; color: black; padding: 2px 5px; border-radius: 3px;'
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

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function() {
    debugLog('sistema', '🚀 Iniciando aplicación...');
    showLoading();
    
    // Esperar a que Firebase esté listo
    await esperarFirebase();
    
    await cargarDatos();
    
    // Enter en login
    const loginPassword = document.getElementById('loginPassword');
    if (loginPassword) {
        loginPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') window.handleLogin();
        });
    }
    
    hideLoading();
    debugLog('sistema', '✅ Aplicación iniciada correctamente');
});

// Esperar a que Firebase esté disponible
function esperarFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = setInterval(() => {
            if (window.firebaseDB && window.firebaseDB.isReady()) {
                clearInterval(checkFirebase);
                debugLog('firebase', '✅ Firebase disponible');
                resolve();
            }
        }, 100);
        
        // Timeout de seguridad
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

// ========== CARGAR DATOS ==========
async function cargarDatos() {
    debugLog('firebase', '📂 Cargando datos desde Firebase...');
    
    try {
        // Cargar usuarios
        const usuariosData = await window.firebaseDB.get('usuarios', 'todos');
        if (usuariosData && usuariosData.lista) {
            usuarios = usuariosData.lista;
            debugLog('firebase', '👥 Usuarios cargados', { total: usuarios.length });
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
        
        // Cargar configuración
        const config = await window.firebaseDB.get('configuracion', 'general');
        if (config) {
            document.getElementById('tarifaHora').value = config.tarifaHora || 5.00;
            document.getElementById('tarifaExtra5Min').value = config.tarifaExtra5Min || 0.50;
        }
        
        // Verificar sesión activa
        const sesion = localStorage.getItem('sesion');
        if (sesion) {
            const { usuarioId } = JSON.parse(sesion);
            usuarioActual = usuarios.find(u => u.id === usuarioId);
            if (usuarioActual) {
                debugLog('sistema', '✅ Sesión activa encontrada', { usuario: usuarioActual.nombre });
                mostrarPantallaPrincipal();
            }
        }
        
        // Cargar ventas
        const ventasData = await window.firebaseDB.get('ventas', 'todas');
        ventas = (ventasData && ventasData.lista) ? ventasData.lista : [];
        
        // Cargar productos
        const productosData = await window.firebaseDB.get('productos', 'todos');
        productos = (productosData && productosData.lista) ? productosData.lista : [];
        
        // Cargar errores
        const erroresData = await window.firebaseDB.get('errores', 'todos');
        erroresReportados = (erroresData && erroresData.lista) ? erroresData.lista : [];
        
        // Cargar mesas
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
        
        // Cargar mesas de consumo
        const mesasConsumoData = await window.firebaseDB.get('mesas', 'consumo');
        if (mesasConsumoData && mesasConsumoData.lista) {
            mesasConsumo = mesasConsumoData.lista;
        } else {
            mesasConsumo = [
                { id: 1, ocupada: false, consumos: [], total: 0 },
                { id: 2, ocupada: false, consumos: [], total: 0 }
            ];
            await window.firebaseDB.set('mesas', 'consumo', { lista: mesasConsumo });
        }
        
        debugLog('firebase', '✅ Todos los datos cargados');
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

async function guardarMesas() {
    await window.firebaseDB.set('mesas', 'billar', { lista: mesas });
}

async function guardarMesasConsumo() {
    await window.firebaseDB.set('mesas', 'consumo', { lista: mesasConsumo });
}

async function guardarConfiguracion() {
    const config = {
        tarifaHora: document.getElementById('tarifaHora').value,
        tarifaExtra5Min: document.getElementById('tarifaExtra5Min').value
    };
    await window.firebaseDB.set('configuracion', 'general', config);
    mesas.forEach(mesa => {
        if (mesa.ocupada) actualizarTimer(mesa.id);
    });
}

function guardarSesion() {
    if (usuarioActual) {
        localStorage.setItem('sesion', JSON.stringify({ usuarioId: usuarioActual.id }));
    } else {
        localStorage.removeItem('sesion');
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

    const usuario = usuarios.find(u => u.username === username && u.password === password);
    
    if (usuario) {
        usuarioActual = usuario;
        guardarSesion();
        errorDiv.classList.add('hidden');
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        debugLog('sistema', '✅ Login exitoso', { usuario: usuario.nombre });
        mostrarPantallaPrincipal();
    } else {
        errorDiv.textContent = 'Usuario o contraseña incorrectos';
        errorDiv.classList.remove('hidden');
        debugLog('error', '❌ Login fallido', { username });
    }

    btnLogin.disabled = false;
    btnLogin.textContent = 'Iniciar Sesión';
};

window.handleLogout = function() {
    debugLog('sistema', '👋 Cerrando sesión...', { usuario: usuarioActual ? usuarioActual.nombre : null });
    
    Object.keys(timers).forEach(id => clearInterval(timers[id]));
    timers = {};
    
    usuarioActual = null;
    guardarSesion();
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainScreen').classList.add('hidden');
};

function mostrarPantallaPrincipal() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainScreen').classList.remove('hidden');
    
    document.getElementById('userName').textContent = usuarioActual.nombre;
    document.getElementById('userRole').textContent = usuarioActual.rol.toUpperCase();
    
    if (usuarioActual.rol === 'admin') {
        document.getElementById('btnUsuarios').classList.remove('hidden');
        document.getElementById('btnAgregarMesa').classList.remove('hidden');
        document.getElementById('btnAgregarMesaConsumo').classList.remove('hidden');
        document.getElementById('tabErrores').classList.remove('hidden');
        document.getElementById('btnReportarError').classList.add('hidden');
        document.getElementById('btnAgregarProducto').classList.remove('hidden');
    } else {
        document.getElementById('btnUsuarios').classList.add('hidden');
        document.getElementById('btnAgregarMesa').classList.add('hidden');
        document.getElementById('btnAgregarMesaConsumo').classList.add('hidden');
        document.getElementById('tabErrores').classList.add('hidden');
        document.getElementById('btnReportarError').classList.remove('hidden');
        document.getElementById('btnAgregarProducto').classList.add('hidden');
    }
    
    actualizarMesas();
    actualizarMesasConsumo();
    actualizarTablaVentas();
    actualizarInventario();
    calcularTotal();
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
    
    if (tab === 'reportes') generarReporte();
    else if (tab === 'errores') actualizarErrores();
    else if (tab === 'inventario') actualizarInventario();
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
    if (!container) return;
    
    container.innerHTML = '';
    Object.keys(timers).forEach(id => {
        clearInterval(timers[id]);
        delete timers[id];
    });
    
    mesas.forEach(mesa => {
        const mesaDiv = document.createElement('div');
        mesaDiv.id = `mesa-${mesa.id}`;
        mesaDiv.className = `mesa-card ${mesa.ocupada ? 'mesa-ocupada' : 'mesa-disponible'}`;
        
        mesaDiv.innerHTML = `
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
        container.appendChild(mesaDiv);
        
        if (mesa.ocupada && mesa.inicio) {
            mesa.tiempoTranscurrido = Math.floor((Date.now() - mesa.inicio) / 1000);
            actualizarTimer(mesa.id);
            timers[mesa.id] = setInterval(() => actualizarTimer(mesa.id), 1000);
        }
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
    
    const resultado = calcularCostoTiempo(mesa.tiempoTranscurrido);
    let totalFinal = resultado.costo;
    
    if (mesa.consumos && mesa.consumos.length > 0) {
        totalFinal += mesa.consumos.reduce((sum, c) => sum + (c.precio * c.cantidad), 0);
    }
    
    const venta = {
        id: Date.now(),
        tipo: `Mesa ${mesa.id} (${resultado.minutos} min)`,
        monto: totalFinal,
        fecha: new Date().toLocaleString(),
        usuario: usuarioActual.nombre
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
    
    alert(`Mesa ${id} finalizada.\nTiempo: ${resultado.minutos} minutos\nTotal: S/ ${totalFinal.toFixed(2)}`);
    
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
        tipo: descripcion,
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
        tipo: `${producto.nombre} x${cantidad}`,
        monto: montoTotal,
        fecha: new Date().toLocaleString(),
        usuario: usuarioActual.nombre
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
            <td>${v.tipo}</td>
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
                        <button class="btn-small btn-blue" onclick="showModalStock(${p.id})" style="padding: 5px 10px; font-size: 12px;">
                            📊
                        </button>
                        ${usuarioActual.rol === 'admin' ? `
                            <button class="btn-small btn-green" onclick='showModalProducto(${productoJSON})' style="padding: 5px 10px; font-size: 12px;">
                                ✏️
                            </button>
                            <button class="btn-small btn-red" onclick="eliminarProducto(${p.id})" style="padding: 5px 10px; font-size: 12px;">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </div>
                ${stockBajo ? '<div style="margin-top: 10px; padding: 8px; background: #fff3cd; border-radius: 5px; font-size: 12px; color: #856404;">⚠️ Stock bajo</div>' : ''}
            </div>
        `;
    }).join('');
}

