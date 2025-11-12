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

// ========== IMPORTAR FIREBASE ==========
import { db } from './firebase-config.js';
import { 
    collection, 
    doc, 
    getDocs, 
    getDoc,
    setDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    query,
    orderBy,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

// ========== FUNCIONES PRINCIPALES ==========

function mostrarError(mensaje) {
    alert('⚠️ ' + mensaje);
    debugLog('error', '🚨 Error mostrado al usuario', mensaje);
}

// LOGIN / LOGOUT
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
        const usuario = usuarios.find(u => u.username === username && u.password === password);
        
        if (usuario) {
            usuarioActual = usuario;
            await guardarSesion();
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
    } catch (error) {
        console.error('Error en login:', error);
        errorDiv.textContent = 'Error al iniciar sesión';
        errorDiv.classList.remove('hidden');
    }

    btnLogin.disabled = false;
    btnLogin.textContent = 'Iniciar Sesión';
};

window.handleLogout = async function() {
    debugLog('sistema', '👋 Cerrando sesión...', { usuario: usuarioActual.nombre });
    
    Object.keys(timers).forEach(id => {
        clearInterval(timers[id]);
    });
    timers = {};
    
    usuarioActual = null;
    await guardarSesion();
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainScreen').classList.add('hidden');
};

function mostrarPantallaPrincipal() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainScreen').classList.remove('hidden');
    
    document.getElementById('userName').textContent = usuarioActual.nombre;
    document.getElementById('userRole').textContent = usuarioActual.rol.toUpperCase();
    
    debugLog('sistema', '🏠 Mostrando pantalla principal', { rol: usuarioActual.rol });
    
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

// TABS
window.changeTab = function(tab, event) {
    tabActual = tab;
    debugLog('sistema', '📑 Cambiando tab', { tab });
    
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    const tabContent = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    
    if (tab === 'reportes') {
        generarReporte();
    } else if (tab === 'errores') {
        actualizarErrores();
    } else if (tab === 'inventario') {
        actualizarInventario();
    }
};

// GESTIÓN DE MESAS
window.agregarMesa = async function() {
    if (usuarioActual.rol !== 'admin') {
        mostrarError('Solo los administradores pueden agregar mesas');
        return;
    }
    
    try {
        const nuevaMesa = {
            ocupada: false,
            inicio: null,
            tiempoTranscurrido: 0,
            consumos: []
        };
        
        const docRef = await addDoc(collection(db, 'mesas'), nuevaMesa);
        nuevaMesa.id = docRef.id;
        mesas.push(nuevaMesa);
        
        actualizarMesas();
        debugLog('firebase', '➕ Mesa agregada', { id: docRef.id });
    } catch (error) {
        console.error('Error agregando mesa:', error);
        mostrarError('Error al agregar la mesa');
    }
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
    
    try {
        await deleteDoc(doc(db, 'mesas', id));
        mesas = mesas.filter(m => m.id !== id);
        
        if (timers[id]) {
            clearInterval(timers[id]);
            delete timers[id];
        }
        
        actualizarMesas();
        debugLog('firebase', '🗑️ Mesa eliminada', { id });
    } catch (error) {
        console.error('Error eliminando mesa:', error);
        mostrarError('Error al eliminar la mesa');
    }
};

window.toggleMesa = function(id) {
    const mesa = mesas.find(m => m.id === id);
    if (!mesa) return;
    
    if (mesa.ocupada) {
        finalizarMesa(id);
    } else {
        iniciarMesa(id);
    }
};

async function iniciarMesa(id) {
    try {
        const mesa = mesas.find(m => m.id === id);
        mesa.ocupada = true;
        mesa.inicio = Date.now();
        mesa.tiempoTranscurrido = 0;
        mesa.consumos = [];
        
        await updateDoc(doc(db, 'mesas', id), {
            ocupada: true,
            inicio: mesa.inicio,
            tiempoTranscurrido: 0,
            consumos: []
        });
        
        debugLog('timer', '▶️ Mesa iniciada', { id });
        actualizarMesas();
    } catch (error) {
        console.error('Error iniciando mesa:', error);
        mostrarError('Error al iniciar la mesa');
    }
}

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
            ${usuarioActual.rol === 'admin' ? `<button class="delete-mesa-btn" onclick="eliminarMesa('${mesa.id}')">×</button>` : ''}
            <h3>Mesa ${mesa.numero || mesas.indexOf(mesa) + 1}</h3>
            <span class="mesa-status ${mesa.ocupada ? 'status-ocupada' : 'status-disponible'}">
                ${mesa.ocupada ? 'OCUPADA' : 'DISPONIBLE'}
            </span>
            <div id="timer-${mesa.id}" class="mesa-timer ${mesa.ocupada ? '' : 'hidden'}">
                <div class="timer-display">00:00:00</div>
                <div class="costo-display">S/ 0.00</div>
            </div>
            <button class="btn ${mesa.ocupada ? 'btn-red' : 'btn-primary'}" onclick="toggleMesa('${mesa.id}')" style="width: 100%; margin-bottom: 8px;">
                ${mesa.ocupada ? '⏹️ Finalizar' : '▶️ Iniciar'}
            </button>
            ${mesa.ocupada ? `<button class="btn btn-blue" onclick="abrirModalConsumo('${mesa.id}', 'billar')" style="width: 100%;">🛒 Consumo</button>` : ''}
        `;
        container.appendChild(mesaDiv);
        
        if (mesa.ocupada && mesa.inicio) {
            mesa.tiempoTranscurrido = Math.floor((Date.now() - mesa.inicio) / 1000);
            actualizarTimer(mesa.id);
            timers[mesa.id] = setInterval(() => actualizarTimer(mesa.id), 1000);
            debugLog('timer', '▶️ Timer reiniciado', { mesa: mesa.id });
        }
    });
}

function calcularCostoTiempo(segundos) {
    const tarifaHoraEl = document.getElementById('tarifaHora');
    const tarifaExtraEl = document.getElementById('tarifaExtra5Min');
    
    const tarifaHora = tarifaHoraEl ? parseFloat(tarifaHoraEl.value) : 5.00;
    const tarifaExtra = tarifaExtraEl ? parseFloat(tarifaExtraEl.value) : 0.50;
    
    if(isNaN(tarifaHora) || tarifaHora <= 0 || isNaN(tarifaExtra) || tarifaExtra < 0) {
        return { costo: 0, error: 'Tarifa inválida' };
    }
    
    const minutosTotales = Math.floor(segundos / 60);
    const horasCompletas = Math.floor(minutosTotales / 60);
    const minutosRestantes = minutosTotales % 60;
    const bloquesExtra = Math.ceil(minutosRestantes / 5);
    
    const costoHoras = horasCompletas * tarifaHora;
    const costoExtra = bloquesExtra * tarifaExtra;
    const costoTotal = costoHoras + costoExtra;
    
    return {
        costo: costoTotal,
        minutos: minutosTotales,
        horas: horasCompletas,
        minutosExtra: minutosRestantes,
        bloques: bloquesExtra
    };
}

async function finalizarMesa(id) {
    const mesa = mesas.find(m => m.id === id);
    if (!mesa || !mesa.ocupada) return;
    
    debugLog('timer', '⏹️ Finalizando mesa', { id });
    
    const resultado = calcularCostoTiempo(mesa.tiempoTranscurrido);
    
    if (resultado.error) {
        mostrarError(resultado.error);
        return;
    }
    
    let totalFinal = resultado.costo;
    
    if (mesa.consumos && mesa.consumos.length > 0) {
        const totalConsumos = mesa.consumos.reduce((sum, c) => sum + (c.precio * c.cantidad), 0);
        totalFinal += totalConsumos;
    }
    
    try {
        const ventaData = {
            tipo: `Mesa ${mesa.numero || mesas.indexOf(mesa) + 1} (${resultado.minutos} min)`,
            monto: totalFinal,
            fecha: new Date().toISOString(),
            usuario: usuarioActual.nombre,
            timestamp: Date.now()
        };
        
        const docRef = await addDoc(collection(db, 'ventas'), ventaData);
        ventaData.id = docRef.id;
        ventas.push(ventaData);
        
        clearInterval(timers[id]);
        delete timers[id];
        
        await updateDoc(doc(db, 'mesas', id), {
            ocupada: false,
            inicio: null,
            tiempoTranscurrido: 0,
            consumos: []
        });
        
        mesa.ocupada = false;
        mesa.inicio = null;
        mesa.tiempoTranscurrido = 0;
        mesa.consumos = [];
        
        let detalleMsg = `Mesa ${mesa.numero || mesas.indexOf(mesa) + 1} finalizada.\nTiempo: ${resultado.minutos} minutos\nTotal: S/ ${totalFinal.toFixed(2)}`;
        alert(detalleMsg);
        
        actualizarMesas();
        actualizarTablaVentas();
        calcularTotal();
    } catch (error) {
        console.error('Error finalizando mesa:', error);
        mostrarError('Error al finalizar la mesa');
    }
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
    const costo = resultado.costo.toFixed(2);
    
    const timerEl = document.querySelector(`#mesa-${id} .timer-display`);
    const costoEl = document.querySelector(`#mesa-${id} .costo-display`);
    
    if (timerEl) timerEl.textContent = tiempoStr;
    if (costoEl) costoEl.textContent = `S/ ${costo}`;
}

// VENTAS
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
    
    try {
        const ventaData = {
            tipo: descripcion,
            monto: monto,
            fecha: new Date().toISOString(),
            usuario: usuarioActual.nombre,
            timestamp: Date.now()
        };
        
        const docRef = await addDoc(collection(db, 'ventas'), ventaData);
        ventaData.id = docRef.id;
        ventas.push(ventaData);
        
        actualizarTablaVentas();
        calcularTotal();
        window.closeModalVentaManual();
        
        debugLog('venta', '✅ Venta manual registrada', { descripcion, monto });
    } catch (error) {
        console.error('Error agregando venta:', error);
        mostrarError('Error al registrar la venta');
    }
    
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
                        <button class="btn btn-green" style="flex: 1;" onclick="agregarVentaProducto('${p.id}')" id="btn-vender-${p.id}">
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
    
    if (!producto) {
        mostrarError('Producto no encontrado.');
        btn.disabled = false;
        btn.textContent = 'Vender';
        return;
    }
    
    if (isNaN(cantidad) || cantidad <= 0) {
        mostrarError('La cantidad debe ser un número positivo.');
        btn.disabled = false;
        btn.textContent = 'Vender';
        return;
    }
    
    if (cantidad > producto.stock) {
        mostrarError(`No hay suficiente stock. Solo quedan ${producto.stock} unidades.`);
        btn.disabled = false;
        btn.textContent = 'Vender';
        return;
    }
    
    const montoTotal = producto.precio * cantidad;
    
    try {
        const ventaData = {
            tipo: `${producto.nombre} x${cantidad}`,
            monto: montoTotal,
            fecha: new Date().toISOString(),
            usuario: usuarioActual.nombre,
            timestamp: Date.now()
        };
        
        const docRef = await addDoc(collection(db, 'ventas'), ventaData);
        ventaData.id = docRef.id;
        ventas.push(ventaData);
        
        producto.stock -= cantidad;
        await updateDoc(doc(db, 'productos', productoId), {
            stock: producto.stock
        });
        
        actualizarTablaVentas();
        calcularTotal();
        renderProductosVenta();
        actualizarInventario();
        
        debugLog('venta', '✅ Venta de producto registrada', { producto: producto.nombre, cantidad, monto: montoTotal });
        
        alert(`Venta de ${cantidad}x ${producto.nombre} por S/ ${montoTotal.toFixed(2)} registrada.`);
    } catch (error) {
        console.error('Error registrando venta:', error);
        mostrarError('Error al registrar la venta');
    }
    
    btn.disabled = false;
    btn.textContent = 'Vender';
};

window.eliminarVenta = async function(id) {
    if (usuarioActual.rol !== 'admin') {
        mostrarError('Solo los administradores pueden eliminar ventas');
        return;
    }
    
    if (!confirm('¿Estás seguro de eliminar esta venta?')) return;
    
    try {
        await deleteDoc(doc(db, 'ventas', id));
        ventas = ventas.filter(v => v.id !== id);
        actualizarTablaVentas();
        calcularTotal();
        debugLog('venta', '🗑️ Venta eliminada', { id });
    } catch (error) {
        console.error('Error eliminando venta:', error);
        mostrarError('Error al eliminar la venta');
    }
};

function actualizarTablaVentas() {
    const tbody = document.getElementById('ventasTable');
    if (!tbody) return;
    
    if (ventas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #999;">No hay ventas registradas</td></tr>';
        return;
    }
    
    const ventasOrdenadas = [...ventas].sort((a, b) => b.timestamp - a.timestamp);
    
    tbody.innerHTML = ventasOrdenadas.map(v => `
        <tr>
            <td style="font-size: 13px;">${new Date(v.fecha).toLocaleString()}</td>
            <td>${v.tipo}</td>
            <td style="font-size: 13px; color: #666;">${v.usuario}</td>
            <td style="text-align: right; font-weight: 600; color: #2d7a4d;">S/ ${v.monto.toFixed(2)}</td>
            <td style="text-align: center;">
                ${usuarioActual.rol === 'admin' ? `<button class="delete-btn" onclick="eliminarVenta('${v.id}')">🗑️</button>` : '-'}
            </td>
        </tr>
    `).join('');
}

function calcularTotal() {
    const total = ventas.reduce((sum, v) => sum + v.monto, 0);
    const totalEl = document.getElementById('totalDia');
    if (totalEl) {
        totalEl.textContent = `S/ ${total.toFixed(2)}`;
    }
}

// PRODUCTOS
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
    if (usuarioActual.rol !== 'admin') {
        mostrarError('Solo los administradores pueden agregar o editar productos');
        return;
    }
    
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
    
    try {
        if (productoEditando) {
            await updateDoc(doc(db, 'productos', productoEditando.id), {
                nombre,
                precio,
                stock,
                stockMin
            });
            
            productoEditando.nombre = nombre;
            productoEditando.precio = precio;
            productoEditando.stock = stock;
            productoEditando.stockMin = stockMin;
        } else {
            const productoData = {
                nombre,
                precio,
                stock,
                stockMin
            };
            
            const docRef = await addDoc(collection(db, 'productos'), productoData);
            productoData.id = docRef.id;
            productos.push(productoData);
        }
        
        actualizarInventario();
        window.closeModalProducto();
    } catch (error) {
        console.error('Error guardando producto:', error);
        mostrarError('Error al guardar el producto');
    }
};

window.eliminarProducto = async function(id) {
    if (usuarioActual.rol !== 'admin') {
        mostrarError('Solo los administradores pueden eliminar productos');
        return;
    }
    
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    try {
        await deleteDoc(doc(db, 'productos', id));
        productos = productos.filter(p => p.id !== id);
        actualizarInventario();
    } catch (error) {
        console.error('Error eliminando producto:', error);
        mostrarError('Error al eliminar el producto');
    }
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
        mostrarError('Por favor ingresa un valor válido (puede ser positivo o negativo)');
        return;
    }
    
    const nuevoStock = productoEditando.stock + ajuste;
    
    if (nuevoStock < 0) {
        mostrarError('El stock no puede ser negativo');
        return;
    }
    
    try {
        await updateDoc(doc(db, 'productos', productoEditando.id), {
            stock: nuevoStock
        });
        
        productoEditando.stock = nuevoStock;
        actualizarInventario();
        window.closeModalStock();
    } catch (error) {
        console.error('Error ajustando stock:', error);
        mostrarError('Error al ajustar el stock');
    }
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
                        <button class="btn-small btn-blue" onclick="showModalStock('${p.id}')" style="padding: 5px 10px; font-size: 12px;">
                            📊
                        </button>
                        ${usuarioActual.rol === 'admin' ? `
                            <button class="btn-small btn-green" onclick='showModalProducto(${productoJSON})' style="padding: 5px 10px; font-size: 12px;">
                                ✏️
                            </button>
                            <button class="btn-small btn-red" onclick="eliminarProducto('${p.id}')" style="padding: 5px 10px; font-size: 12px;">
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

// REPORTES
window.generarReporte = function() {
    const periodo = document.getElementById('reportePeriodo').value;
    const ahora = new Date();
    let ventasFiltradas = [];
    
    if (periodo === 'hoy') {
        ventasFiltradas = ventas.filter(v => {
            const fechaVenta = new Date(v.fecha);
            return fechaVenta.toDateString() === ahora.toDateString();
        });
    } else if (periodo === 'semana') {
        const inicioSemana = new Date(ahora);
        inicioSemana.setDate(ahora.getDate() - (ahora.getDay() === 0 ? 6 : ahora.getDay() - 1));
        inicioSemana.setHours(0, 0, 0, 0);
        
        ventasFiltradas = ventas.filter(v => {
            const fechaVenta = new Date(v.fecha);
            return fechaVenta >= inicioSemana;
        });
    } else if (periodo === 'mes') {
        ventasFiltradas = ventas.filter(v => {
            const fechaVenta = new Date(v.fecha);
            return fechaVenta.getMonth() === ahora.getMonth() && 
                   fechaVenta.getFullYear() === ahora.getFullYear();
        });
    }
    
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + v.monto, 0);
    const ventasMesas = ventasFiltradas.filter(v => v.tipo.startsWith('Mesa')).reduce((sum, v) => sum + v.monto, 0);
    const ventasProductos = totalVentas - ventasMesas;
    
    document.getElementById('reporteTotalVentas').textContent = `S/ ${totalVentas.toFixed(2)}`;
    document.getElementById('reporteVentasMesas').textContent = `S/ ${ventasMesas.toFixed(2)}`;
    document.getElementById('reporteVentasProductos').textContent = `S/ ${ventasProductos.toFixed(2)}`;
    document.getElementById('reporteTransacciones').textContent = ventasFiltradas.length;
    
    const tbody = document.getElementById('reporteDetalleTable');
    if (ventasFiltradas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: #999;">No hay ventas en este período</td></tr>';
    } else {
        const ventasOrdenadas = [...ventasFiltradas].sort((a, b) => b.timestamp - a.timestamp);
        tbody.innerHTML = ventasOrdenadas.map(v => `
            <tr>
                <td style="font-size: 13px;">${new Date(v.fecha).toLocaleString()}</td>
                <td>${v.tipo}</td>
                <td style="font-size: 13px; color: #666;">${v.usuario}</td>
                <td style="text-align: right; font-weight: 600; color: #2d7a4d;">S/ ${v.monto.toFixed(2)}</td>
            </tr>
        `).join('');
    }
};

window.descargarReporteExcel = function() {
    const periodo = document.getElementById('reportePeriodo').value;
    const ahora = new Date();
    let ventasFiltradas = [];
    let nombrePeriodo = '';
    
    if (periodo === 'hoy') {
        ventasFiltradas = ventas.filter(v => {
            const fechaVenta = new Date(v.fecha);
            return fechaVenta.toDateString() === ahora.toDateString();
        });
        nombrePeriodo = `Hoy_${ahora.toLocaleDateString().replace(/\//g, '-')}`;
    } else if (periodo === 'semana') {
        const inicioSemana = new Date(ahora);
        inicioSemana.setDate(ahora.getDate() - (ahora.getDay() === 0 ? 6 : ahora.getDay() - 1));
        inicioSemana.setHours(0, 0, 0, 0);
        
        ventasFiltradas = ventas.filter(v => {
            const fechaVenta = new Date(v.fecha);
            return fechaVenta >= inicioSemana;
        });
        nombrePeriodo = `Semana_${inicioSemana.toLocaleDateString().replace(/\//g, '-')}`;
    } else if (periodo === 'mes') {
        ventasFiltradas = ventas.filter(v => {
            const fechaVenta = new Date(v.fecha);
            return fechaVenta.getMonth() === ahora.getMonth() && 
                   fechaVenta.getFullYear() === ahora.getFullYear();
        });
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        nombrePeriodo = `${meses[ahora.getMonth()]}_${ahora.getFullYear()}`;
    }
    
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + v.monto, 0);
    const ventasMesas = ventasFiltradas.filter(v => v.tipo.startsWith('Mesa')).reduce((sum, v) => sum + v.monto, 0);
    const ventasProductos = totalVentas - ventasMesas;
    
    let csv = 'REPORTE DE VENTAS - ' + nombrePeriodo + '\n\n';
    csv += 'RESUMEN\n';
    csv += 'Total Ventas,S/ ' + totalVentas.toFixed(2) + '\n';
    csv += 'Ventas Mesas,S/ ' + ventasMesas.toFixed(2) + '\n';
    csv += 'Ventas Productos,S/ ' + ventasProductos.toFixed(2) + '\n';
    csv += 'Transacciones,' + ventasFiltradas.length + '\n\n';
    
    csv += 'DETALLE DE VENTAS\n';
    csv += 'Fecha,Descripción,Usuario,Monto\n';
    
    ventasFiltradas.forEach(v => {
        csv += `"${new Date(v.fecha).toLocaleString()}","${v.tipo}","${v.usuario}",${v.monto.toFixed(2)}\n`;
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_Billar_${nombrePeriodo}.csv`;
    link.click();
    
    debugLog('sistema', '📥 Reporte Excel descargado', { periodo, ventas: ventasFiltradas.length });
};

window.descargarReportePDF = function() {
    const periodo = document.getElementById('reportePeriodo').value;
    const ahora = new Date();
    let ventasFiltradas = [];
    let nombrePeriodo = '';
    
    if (periodo === 'hoy') {
        ventasFiltradas = ventas.filter(v => {
            const fechaVenta = new Date(v.fecha);
            return fechaVenta.toDateString() === ahora.toDateString();
        });
        nombrePeriodo = `Hoy - ${ahora.toLocaleDateString()}`;
    } else if (periodo === 'semana') {
        const inicioSemana = new Date(ahora);
        inicioSemana.setDate(ahora.getDate() - (ahora.getDay() === 0 ? 6 : ahora.getDay() - 1));
        inicioSemana.setHours(0, 0, 0, 0);
        
        ventasFiltradas = ventas.filter(v => {
            const fechaVenta = new Date(v.fecha);
            return fechaVenta >= inicioSemana;
        });
        nombrePeriodo = `Semana del ${inicioSemana.toLocaleDateString()}`;
    } else if (periodo === 'mes') {
        ventasFiltradas = ventas.filter(v => {
            const fechaVenta = new Date(v.fecha);
            return fechaVenta.getMonth() === ahora.getMonth() && 
                   fechaVenta.getFullYear() === ahora.getFullYear();
        });
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        nombrePeriodo = `${meses[ahora.getMonth()]} ${ahora.getFullYear()}`;
    }
    
    const totalVentas = ventasFiltradas.reduce((sum, v) => sum + v.monto, 0);
    const ventasMesas = ventasFiltradas.filter(v => v.tipo.startsWith('Mesa')).reduce((sum, v) => sum + v.monto, 0);
    const ventasProductos = totalVentas - ventasMesas;
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reporte ${nombrePeriodo}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .header h1 { color: #1a4d2e; margin: 0; }
                .header p { color: #666; margin: 5px 0; }
                .resumen { background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px; }
                .resumen-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ddd; }
                .resumen-item:last-child { border-bottom: none; font-weight: bold; font-size: 18px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #1a4d2e; color: white; padding: 12px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                tr:hover { background: #f8f9fa; }
                .total { text-align: right; font-weight: bold; color: #2d7a4d; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🎱 REPORTE DE VENTAS</h1>
                <p>${nombrePeriodo}</p>
                <p>Generado el ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="resumen">
                <h2>Resumen</h2>
                <div class="resumen-item">
                    <span>Ventas de Mesas:</span>
                    <span>S/ ${ventasMesas.toFixed(2)}</span>
                </div>
                <div class="resumen-item">
                    <span>Ventas de Productos:</span>
                    <span>S/ ${ventasProductos.toFixed(2)}</span>
                </div>
                <div class="resumen-item">
                    <span>Total de Transacciones:</span>
                    <span>${ventasFiltradas.length}</span>
                </div>
                <div class="resumen-item">
                    <span>TOTAL:</span>
                    <span>S/ ${totalVentas.toFixed(2)}</span>
                </div>
            </div>
            
            <h2>Detalle de Ventas</h2>
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Descripción</th>
                        <th>Usuario</th>
                        <th style="text-align: right;">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    ${ventasFiltradas.map(v => `
                        <tr>
                            <td>${new Date(v.fecha).toLocaleString()}</td>
                            <td>${v.tipo}</td>
                            <td>${v.usuario}</td>
                            <td class="total">S/ ${v.monto.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;
    
    try {
        const ventana = window.open('', '_blank');
        if (!ventana) {
            alert('❌ El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.');
            return;
        }
        
        ventana.document.write(html);
        ventana.document.close();
        
        setTimeout(() => {
            ventana.print();
        }, 500);
        
        debugLog('sistema', '📄 Reporte PDF generado', { periodo, ventas: ventasFiltradas.length });
    } catch (error) {
        console.error('Error generando PDF:', error);
        alert('Error al generar el PDF');
    }
};

// ERRORES
window.showModalError = function() {
    document.getElementById('modalError').classList.add('show');
    document.getElementById('errorMensaje').value = '';
};

window.closeModalError = function() {
    document.getElementById('modalError').classList.remove('show');
};

window.reportarError = async function() {
    const mensaje = document.getElementById('errorMensaje').value.trim();
    
    if (!mensaje) {
        mostrarError('Por favor describe el error');
        return;
    }
    
    try {
        const errorData = {
            mensaje,
            usuario: usuarioActual.nombre,
            fecha: new Date().toISOString(),
            resuelto: false,
            timestamp: Date.now()
        };
        
        const docRef = await addDoc(collection(db, 'errores'), errorData);
        errorData.id = docRef.id;
        erroresReportados.push(errorData);
        
        window.closeModalError();
        alert('Error reportado correctamente. El administrador lo revisará.');
    } catch (error) {
        console.error('Error reportando error:', error);
        mostrarError('Error al reportar el error');
    }
};

window.marcarErrorResuelto = async function(id) {
    try {
        await updateDoc(doc(db, 'errores', id), {
            resuelto: true
        });
        
        const error = erroresReportados.find(e => e.id === id);
        if (error) {
            error.resuelto = true;
        }
        
        actualizarErrores();
    } catch (error) {
        console.error('Error marcando error como resuelto:', error);
        mostrarError('Error al actualizar el estado');
    }
};

window.eliminarError = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este reporte?')) return;
    
    try {
        await deleteDoc(doc(db, 'errores', id));
        erroresReportados = erroresReportados.filter(e => e.id !== id);
        actualizarErrores();
    } catch (error) {
        console.error('Error eliminando error:', error);
        mostrarError('Error al eliminar el reporte');
    }
};

function actualizarErrores() {
    const container = document.getElementById('erroresContainer');
    if (!container) return;
    
    if (erroresReportados.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">No hay errores reportados</p>';
        return;
    }
    
    const erroresOrdenados = [...erroresReportados].sort((a, b) => b.timestamp - a.timestamp);
    
    container.innerHTML = erroresOrdenados.map(e => `
        <div class="error-item ${e.resuelto ? 'resuelto' : ''}">
            <div class="error-header">
                <div>
                    <div class="error-usuario">👤 ${e.usuario}</div>
                    <div class="error-fecha">${new Date(e.fecha).toLocaleString()}</div>
                </div>
                <div>
                    ${e.resuelto ? '<span style="color: #28a745; font-weight: 600;">✓ Resuelto</span>' : ''}
                </div>
            </div>
            <div class="error-mensaje">${e.mensaje}</div>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                ${!e.resuelto ? `<button class="btn-small btn-green" onclick="marcarErrorResuelto('${e.id}')">✓ Marcar Resuelto</button>` : ''}
                <button class="btn-small btn-red" onclick="eliminarError('${e.id}')">🗑️ Eliminar</button>
            </div>
        </div>
    `).join('');
}

// USUARIOS
window.toggleUsuarios = function() {
    if (usuarioActual.rol !== 'admin') {
        mostrarError('Solo los administradores tienen acceso a la gestión de usuarios.');
        return;
    }
    
    const panel = document.getElementById('usuariosPanel');
    panel.classList.toggle('hidden');
    
    if (!panel.classList.contains('hidden')) {
        actualizarTablaUsuarios();
    }
};

window.showModalUsuarioId = function(id) {
    const usuario = usuarios.find(u => u.id === id);
    if (usuario) {
        window.showModalUsuario(usuario);
    }
};

window.showModalUsuario = function(usuario = null) {
    if (usuarioActual.rol !== 'admin') {
        mostrarError('Solo los administradores pueden gestionar usuarios');
        return;
    }

    usuarioEditando = usuario;
    const modal = document.getElementById('modalUsuario');
    const title = document.getElementById('usuarioModalTitle');
    
    document.getElementById('usuarioError').classList.add('hidden');
    
    if (usuario) {
        title.textContent = 'Editar Usuario';
        document.getElementById('nuevoNombre').value = usuario.nombre;
        document.getElementById('nuevoUsername').value = usuario.username;
        document.getElementById('nuevoPassword').value = '';
        document.getElementById('nuevoRol').value = usuario.rol;
    } else {
        title.textContent = 'Crear Nuevo Usuario';
        document.getElementById('nuevoNombre').value = '';
        document.getElementById('nuevoUsername').value = '';
        document.getElementById('nuevoPassword').value = '';
        document.getElementById('nuevoRol').value = 'empleado';
    }
    
    modal.classList.add('show');
};

window.closeModalUsuario = function() {
    document.getElementById('modalUsuario').classList.remove('show');
    usuarioEditando = null;
};

window.crearUsuario = async function() {
    if (usuarioActual.rol !== 'admin') {
        mostrarError('Solo los administradores pueden gestionar usuarios');
        return;
    }
    
    const nombre = document.getElementById('nuevoNombre').value.trim();
    const username = document.getElementById('nuevoUsername').value.trim();
    let password = document.getElementById('nuevoPassword').value;
    const rol = document.getElementById('nuevoRol').value;
    const errorDiv = document.getElementById('usuarioError');
    
    if (!nombre || !username) {
        errorDiv.textContent = 'El nombre y el nombre de usuario son obligatorios';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        if (usuarioEditando) {
            const usernameExistente = usuarios.find(u => u.username === username && u.id !== usuarioEditando.id);
            if (usernameExistente) {
                errorDiv.textContent = 'El nombre de usuario ya existe en otra cuenta';
                errorDiv.classList.remove('hidden');
                return;
            }

            const updateData = {
                nombre,
                username,
                rol
            };
            
            if (password !== "") {
                updateData.password = password;
            }
            
            await updateDoc(doc(db, 'usuarios', usuarioEditando.id), updateData);
            
            usuarioEditando.nombre = nombre;
            usuarioEditando.username = username;
            usuarioEditando.rol = rol;
            if (password !== "") {
                usuarioEditando.password = password;
            }

            if (usuarioActual.id === usuarioEditando.id) {
                usuarioActual.nombre = nombre;
                usuarioActual.username = username;
                usuarioActual.rol = rol;
                if (password !== "") {
                    usuarioActual.password = password;
                }
                document.getElementById('userName').textContent = nombre;
                document.getElementById('userRole').textContent = rol.toUpperCase();
            }

        } else {
            if (!password) {
                errorDiv.textContent = 'La contraseña es obligatoria para un nuevo usuario';
                errorDiv.classList.remove('hidden');
                return;
            }

            if (usuarios.find(u => u.username === username)) {
                errorDiv.textContent = 'El nombre de usuario ya existe';
                errorDiv.classList.remove('hidden');
                return;
            }
            
            const usuarioData = {
                username,
                password,
                nombre,
                rol
            };
            
            const docRef = await addDoc(collection(db, 'usuarios'), usuarioData);
            usuarioData.id = docRef.id;
            usuarios.push(usuarioData);
        }
        
        actualizarTablaUsuarios();
        window.closeModalUsuario();
    } catch (error) {
        console.error('Error guardando usuario:', error);
        mostrarError('Error al guardar el usuario');
    }
};

window.eliminarUsuario = async function(id) {
    if (usuarioActual.rol !== 'admin') {
        mostrarError('Solo los administradores pueden eliminar usuarios');
        return;
    }
    
    if (id === usuarioActual.id) {
        mostrarError('No puedes eliminar tu propio usuario');
        return;
    }
    
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    try {
        await deleteDoc(doc(db, 'usuarios', id));
        usuarios = usuarios.filter(u => u.id !== id);
        actualizarTablaUsuarios();
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        mostrarError('Error al eliminar el usuario');
    }
};

function actualizarTablaUsuarios() {
    const tbody = document.getElementById('usuariosTable');
    if (!tbody) return;
    
    tbody.innerHTML = usuarios.map(u => {
        return `
            <tr>
                <td>${u.username}</td>
                <td>${u.nombre}</td>
                <td>
                    <span class="role-badge role-${u.rol}">${u.rol.toUpperCase()}</span>
                </td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 5px; justify-content: center;">
                        <button class="btn-small btn-blue" onclick="showModalUsuarioId('${u.id}')" style="padding: 5px 10px; font-size: 12px;">
                            ✏️
                        </button>
                        ${u.id !== usuarioActual.id ? `
                            <button class="btn-small btn-red" onclick="eliminarUsuario('${u.id}')" style="padding: 5px 10px; font-size: 12px;">
                                🗑️
                            </button>
                        ` : '<span style="color: #999; font-size: 12px;">-</span>'}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// MESAS DE CONSUMO
window.agregarMesaConsumo = async function() {
    if (usuarioActual.rol !== 'admin') {
        mostrarError('Solo los administradores pueden agregar mesas');
        return;
    }
    
    try {
        const mesaData = {
            ocupada: false,
            consumos: [],
            total: 0
        };
        
        const docRef = await addDoc(collection(db, 'mesas_consumo'), mesaData);
        mesaData.id = docRef.id;
        mesasConsumo.push(mesaData);
        
        actualizarMesasConsumo();
    } catch (error) {
        console.error('Error agregando mesa de consumo:', error);
        mostrarError('Error al agregar la mesa');
    }
};

window.eliminarMesaConsumo = async function(id) {
    if (usuarioActual.rol !== 'admin') {
        mostrarError('Solo los administradores pueden eliminar mesas');
        return;
    }
    
    const mesa = mesasConsumo.find(m => m.id === id);
    if (mesa && mesa.ocupada) {
        mostrarError('No puedes eliminar una mesa ocupada. Ciérrala primero.');
        return;
    }
    
    if (!confirm('¿Estás seguro de eliminar esta mesa de consumo?')) return;
    
    try {
        await deleteDoc(doc(db, 'mesas_consumo', id));
        mesasConsumo = mesasConsumo.filter(m => m.id !== id);
        actualizarMesasConsumo();
        debugLog('sistema', '🗑️ Mesa de consumo eliminada', { id });
    } catch (error) {
        console.error('Error eliminando mesa de consumo:', error);
        mostrarError('Error al eliminar la mesa');
    }
};

// ...existing code...
function actualizarMesasConsumo() {
    const container = document.getElementById('mesasConsumoContainer');
    if (!container) return;
    
    container.innerHTML = mesasConsumo.map((mesa, index) => {
        const total = (mesa.consumos || []).reduce((sum, c) => sum + (c.precio * c.cantidad), 0);
        mesa.total = total;
        const consumosHtml = (mesa.consumos || []).map((c, i) => `
            <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; padding:6px 0; border-bottom:1px solid #eee;">
                <div style="flex:1;">
                    <div style="font-weight:600;">${c.nombre}</div>
                    <div style="font-size:12px; color:#666;">${c.cantidad} x S/ ${c.precio.toFixed(2)}</div>
                </div>
                <div style="text-align:right; min-width:120px;">
                    <div style="font-weight:700; color:#2d7a4d;">S/ ${(c.precio * c.cantidad).toFixed(2)}</div>
                    ${usuarioActual.rol === 'admin' || usuarioActual.rol === 'empleado' ? `<button class="btn-small btn-red" onclick="eliminarConsumoMesa('${mesa.id}', ${i})" style="margin-top:6px;">🗑️</button>` : ''}
                </div>
            </div>
        `).join('');
        
        return `
            <div class="mesa-card" style="border-color: #6f42c1; background: ${mesa.ocupada ? '#e7d4f7' : '#f8f9fa'}; position: relative;">
                ${usuarioActual.rol === 'admin' ? `<button class="delete-mesa-btn" onclick="eliminarMesaConsumo('${mesa.id}')">×</button>` : ''}
                <h3>🍺 Mesa ${index + 1}</h3>
                <span class="mesa-status" style="background: ${mesa.ocupada ? '#6f42c1' : '#6c757d'};">
                    ${mesa.ocupada ? 'OCUPADA' : 'DISPONIBLE'}
                </span>
                
                <div style="background: white; padding: 12px; border-radius: 8px; margin-top: 10px;">
                    ${consumosHtml || '<div style="text-align:center; color:#999; padding:10px;">Sin consumos</div>'}
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                        <div style="font-weight:700;">Total</div>
                        <div style="font-weight:700; color:#2d7a4d;">S/ ${total.toFixed(2)}</div>
                    </div>
                </div>
                
                <div style="display:flex; gap:8px; margin-top:10px;">
                    <button class="btn btn-blue" onclick="abrirModalConsumo('${mesa.id}', 'consumo')" style="flex:1;">
                        🛒 Agregar Consumo
                    </button>
                    ${mesa.ocupada ? `<button class="btn btn-red" onclick="cerrarMesaConsumo('${mesa.id}')" style="flex:1;">💳 Cobrar / Cerrar</button>` : `<button class="btn btn-primary" onclick="abrirModalConsumo('${mesa.id}', 'consumo')" style="flex:1;">Abrir Mesa</button>`}
                </div>
            </div>
        `;
    }).join('');
}
// ...existing code...
{
    // NUEVAS FUNCIONES PARA MESAS DE CONSUMO
    window.abrirModalConsumo = function(id, tipo) {
        tipoMesaActual = tipo || 'consumo';
        mesaConsumoActual = mesasConsumo.find(m => m.id === id);
        if (!mesaConsumoActual) return;
        
        // Preparar modal
        document.getElementById('modalConsumo').classList.add('show');
        renderConsumosModal();
        debugLog('sistema', '🛒 Abriendo modal consumo', { mesa: id });
    };
    
    window.cerrarModalConsumo = function() {
        document.getElementById('modalConsumo').classList.remove('show');
        mesaConsumoActual = null;
        tipoMesaActual = null;
    };
    
    function renderConsumosModal() {
        const listaEl = document.getElementById('consumosMesaList');
        const selectEl = document.getElementById('consumoProductosSelect');
        const qtyEl = document.getElementById('consumoQty');
        const totalEl = document.getElementById('consumoTotalDisplay');
        if (!listaEl) return;
        
        const consumos = mesaConsumoActual.consumos || [];
        listaEl.innerHTML = consumos.length === 0 ? '<p style="color:#999; text-align:center; padding:12px;">Sin consumos</p>' : consumos.map((c, i) => `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee;">
                <div>
                    <div style="font-weight:600;">${c.nombre}</div>
                    <div style="font-size:12px; color:#666;">${c.cantidad} x S/ ${c.precio.toFixed(2)}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:700; color:#2d7a4d;">S/ ${(c.precio * c.cantidad).toFixed(2)}</div>
                </div>
            </div>
        `).join('');
        
        // Rellenar select de productos si existe
        if (selectEl) {
            selectEl.innerHTML = productos.length === 0 ? '<option value="">No hay productos</option>' : productos.map(p => `<option value="${p.id}">${p.nombre} - S/ ${p.precio.toFixed(2)} (stk ${p.stock})</option>`).join('');
            if (qtyEl) qtyEl.value = 1;
        }
        
        const total = consumos.reduce((s, c) => s + (c.precio * c.cantidad), 0);
        if (totalEl) totalEl.textContent = `S/ ${total.toFixed(2)}`;
    }
    
    window.agregarConsumoMesa = async function(productoId) {
        if (!mesaConsumoActual) return;
        const qtyInput = document.getElementById('consumoQty');
        const cantidad = parseInt(qtyInput ? qtyInput.value : 1);
        const producto = productos.find(p => p.id === productoId);
        
        if (!producto) {
            mostrarError('Producto no encontrado');
            return;
        }
        if (isNaN(cantidad) || cantidad <= 0) {
            mostrarError('Cantidad inválida');
            return;
        }
        if (cantidad > producto.stock) {
            mostrarError(`Stock insuficiente. Quedan ${producto.stock}`);
            return;
        }
        
        try {
            // agregar consumo en memoria
            mesaConsumoActual.ocupada = true;
            mesaConsumoActual.consumos = mesaConsumoActual.consumos || [];
            mesaConsumoActual.consumos.push({
                nombre: producto.nombre,
                precio: producto.precio,
                cantidad
            });
            mesaConsumoActual.total = mesaConsumoActual.consumos.reduce((s, c) => s + (c.precio * c.cantidad), 0);
            
            // actualizar producto stock
            producto.stock -= cantidad;
            await updateDoc(doc(db, 'productos', producto.id), { stock: producto.stock });
            await updateDoc(doc(db, 'mesas_consumo', mesaConsumoActual.id), {
                consumos: mesaConsumoActual.consumos,
                total: mesaConsumoActual.total,
                ocupada: true
            });
            
            renderConsumosModal();
            actualizarMesasConsumo();
            actualizarInventario();
            
            debugLog('venta', '➕ Consumo agregado', { mesa: mesaConsumoActual.id, producto: producto.nombre, cantidad });
        } catch (error) {
            console.error('Error agregando consumo a mesa:', error);
            mostrarError('Error al agregar consumo');
        }
    };
    
    window.agregarConsumoManualMesa = async function() {
        if (!mesaConsumoActual) return;
        const nombre = document.getElementById('consumoManualNombre').value.trim();
        const precio = parseFloat(document.getElementById('consumoManualPrecio').value);
        const cantidad = parseInt(document.getElementById('consumoManualQty').value);
        
        if (!nombre || isNaN(precio) || precio <= 0 || isNaN(cantidad) || cantidad <= 0) {
            mostrarError('Por favor completa los datos del consumo manual correctamente');
            return;
        }
        
        try {
            mesaConsumoActual.ocupada = true;
            mesaConsumoActual.consumos = mesaConsumoActual.consumos || [];
            mesaConsumoActual.consumos.push({ nombre, precio, cantidad });
            mesaConsumoActual.total = mesaConsumoActual.consumos.reduce((s, c) => s + (c.precio * c.cantidad), 0);
            
            await updateDoc(doc(db, 'mesas_consumo', mesaConsumoActual.id), {
                consumos: mesaConsumoActual.consumos,
                total: mesaConsumoActual.total,
                ocupada: true
            });
            
            renderConsumosModal();
            actualizarMesasConsumo();
            
            debugLog('venta', '➕ Consumo manual agregado', { mesa: mesaConsumoActual.id, nombre, precio, cantidad });
        } catch (error) {
            console.error('Error agregando consumo manual:', error);
            mostrarError('Error al agregar consumo manual');
        }
    };
    
    window.eliminarConsumoMesa = async function(mesaId, index) {
        const mesa = mesasConsumo.find(m => m.id === mesaId);
        if (!mesa) return;
        if (!confirm('¿Eliminar este consumo?')) return;
        
        try {
            const eliminado = mesa.consumos.splice(index, 1);
            mesa.total = mesa.consumos.reduce((s, c) => s + (c.precio * c.cantidad), 0);
            // no restablecemos stock automáticamente si el consumo vino de inventario (opcional)
            await updateDoc(doc(db, 'mesas_consumo', mesa.id), {
                consumos: mesa.consumos,
                total: mesa.total
            });
            
            if (mesaConsumoActual && mesaConsumoActual.id === mesa.id) renderConsumosModal();
            actualizarMesasConsumo();
            debugLog('sistema', '🗑️ Consumo eliminado', { mesa: mesa.id, index });
        } catch (error) {
            console.error('Error eliminando consumo:', error);
            mostrarError('Error al eliminar el consumo');
        }
    };
    
    window.cerrarMesaConsumo = async function(id) {
        const mesa = mesasConsumo.find(m => m.id === id);
        if (!mesa || (!mesa.ocupada && (mesa.consumos || []).length === 0)) {
            mostrarError('La mesa no tiene consumos para cobrar');
            return;
        }
        
        if (!confirm('Confirmar cobro y cierre de la mesa?')) return;
        
        try {
            const monto = (mesa.total || 0);
            const ventaData = {
                tipo: `Mesa Consumo ${mesasConsumo.indexOf(mesa) + 1}`,
                monto,
                fecha: new Date().toISOString(),
                usuario: usuarioActual.nombre,
                timestamp: Date.now()
            };
            const docRef = await addDoc(collection(db, 'ventas'), ventaData);
            ventaData.id = docRef.id;
            ventas.push(ventaData);
            
            // resetear mesa
            await updateDoc(doc(db, 'mesas_consumo', mesa.id), {
                ocupada: false,
                consumos: [],
                total: 0
            });
            mesa.ocupada = false;
            mesa.consumos = [];
            mesa.total = 0;
            
            actualizarMesasConsumo();
            actualizarTablaVentas();
            calcularTotal();
            if (mesaConsumoActual && mesaConsumoActual.id === mesa.id) cerrarModalConsumo();
            
            alert(`Mesa cobrada por S/ ${monto.toFixed(2)}`);
            debugLog('venta', '💳 Mesa de consumo cobrada', { mesa: mesa.id, monto });
        } catch (error) {
            console.error('Error cerrando mesa de consumo:', error);
            mostrarError('Error al cerrar la mesa');
        }
    };
}
// ...existing code...
