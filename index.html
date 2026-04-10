<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Gestión de Billar</title>
    <!-- Asumo que styles.css y los archivos JS existen en el entorno -->
    <link rel="stylesheet" href="styles.css">
</head>

<body>
    <div id="loginScreen" class="login-screen">
        <div class="login-box">
            <div class="login-icon">🎱</div>
            <h1>Sistema de Billar</h1>
            <p style="text-align: center; color: #666; margin-bottom: 30px;">Inicia sesión para continuar</p>

            <div id="loginError" class="error-msg hidden"></div>

            <div class="input-group">
                <label>Usuario</label>
                <input type="text" id="loginUsername" placeholder="Ingresa tu usuario" autocomplete="username">
            </div>

            <div class="input-group">
                <label>Contraseña</label>
                <input type="password" id="loginPassword" placeholder="Ingresa tu contraseña"
                    autocomplete="current-password">
            </div>

            <button class="btn btn-primary" style="width: 100%;" id="btnLogin" onclick="handleLogin()">
                Iniciar Sesión
            </button>
        </div>
    </div>

    <div id="mainScreen" class="container hidden">
        <div class="header">
            <div class="header-top">
                <div>
                    <h1>🎱 Sistema de Gestión de Billar</h1>
                    <div class="user-info">
                        Bienvenido, <strong id="userName"></strong>
                        <span class="user-badge" id="userRole"></span>
                        <span style="margin-left: 10px; color: #28a745; font-size: 12px;">● Conectado</span>
                    </div>
                </div>
                <div class="header-buttons">
                    <button id="btnUsuarios" class="btn-small btn-blue hidden" onclick="toggleUsuarios()">
                        👥 Usuarios
                    </button>
                    <button class="btn-small btn-red" onclick="handleLogout()">
                        🚪 Salir
                    </button>
                </div>
            </div>

            <div id="usuariosPanel" class="usuarios-panel hidden">
                <div class="section-header">
                    <h3>Gestión de Usuarios</h3>
                    <button class="btn-small btn-green" onclick="showModalUsuario()">
                        ➕ Crear Usuario
                    </button>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Nombre</th>
                                <th>Rol</th>
                                <th style="text-align: center;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="usuariosTable"></tbody>
                    </table>
                </div>
            </div>

            <div class="config-grid">
                <div class="config-box" style="background: #cfe2ff;">
                    <label>Tarifa por Hora Completa (S/)</label>
                    <input type="number" id="tarifaHora" value="5.00" step="0.50" min="0">
                </div>
                <div class="config-box" style="background: #fff3cd;">
                    <label for="tarifaExtra5Min">Tarifa cada 10 min extra (S/)</label>
                    <input type="number" id="tarifaExtra5Min" step="0.01" min="0" value="1.00">
                </div>
                <div class="config-box" style="display: flex; align-items: flex-end;">
                    <button class="btn btn-blue" onclick="guardarConfiguracion()" style="width: 100%; padding: 10px;">
                        💾 Guardar Configuración
                    </button>
                </div>
                <div class="config-box total-box">
                    <label>Total del Día</label>
                    <div class="total-amount" id="totalDia">S/ 0.00</div>
                </div>
            </div>
        </div>

        <div class="tabs">
            <button class="tab active" onclick="changeTab('mesas', event)" data-tab="mesas">
                🎱 Mesas
            </button>
            <button class="tab" onclick="changeTab('ventas', event)" data-tab="ventas">
                💰 Ventas
            </button>
            <button class="tab" onclick="changeTab('inventario', event)" data-tab="inventario">
                📦 Inventario
            </button>
            <button class="tab" onclick="changeTab('reportes', event)" data-tab="reportes">
                📊 Reportes
            </button>
            <button id="btnTabErrores" class="tab hidden" onclick="changeTab('errores', event)" data-tab="errores">
                ⚠️ Errores
            </button>
            <button id="btnTabDashboard" class="tab hidden" onclick="changeTab('dashboard', event)"
                data-tab="dashboard">
                📈 Dashboard
            </button>
            <button id="btnTabCaja" class="tab hidden" onclick="changeTab('caja', event)" data-tab="caja">
                💸 Caja/Gastos
            </button>
            <button id="btnTabMensual" class="tab hidden" onclick="changeTab('mensual', event)" data-tab="mensual">
                📅 Mensual
            </button>
            <button id="btnTabConsumoDueno" class="tab hidden" onclick="changeTab('consumoDueno', event)"
                data-tab="consumoDueno">
                🍽️ Consumo Dueño
            </button>
        </div>

        <div id="tabMesas" class="tab-content active">
            <div class="section-box" style="margin-bottom: 30px;">
                <div class="section-header">
                    <h2>🎱 Mesas de Billar</h2>
                    <button id="btnAgregarMesa" class="btn-small btn-green hidden" onclick="agregarMesa()">
                        ➕ Agregar Mesa
                    </button>
                </div>
                <div id="mesasContainer" class="mesas-grid"></div>
            </div>

            <div class="section-divider">
                <span>🍺 ZONA DE CONSUMO</span>
            </div>

            <div class="section-box">
                <div class="section-header">
                    <h2>🍺 Mesas de Consumo (Tomar/Fumar)</h2>
                    <button id="btnAgregarMesaConsumo" class="btn-small btn-green hidden"
                        onclick="agregarMesaConsumo()">
                        ➕ Agregar Mesa
                    </button>
                </div>
                <div id="mesasConsumoContainer" class="mesas-grid"></div>
            </div>
        </div>

        <div id="tabVentas" class="tab-content">
            <div class="ventas-section">
                <div class="section-header">
                    <h2>Registro de Ventas</h2>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn-small btn-blue" onclick="showModalVentaManual()">
                            ➕ Venta Manual
                        </button>
                        <button class="btn-small btn-green" onclick="showModalVentaProductos()">
                            🛒 Vender Productos
                        </button>
                        <button id="btnEliminarVentas" class="btn-small btn-red hidden"
                            onclick="showModalEliminarVentas()">
                            🗑️ Eliminar Ventas
                        </button>
                        <button id="btnReportarError" class="btn-small btn-orange hidden" onclick="showModalError()">
                            ⚠️ Reportar Error
                        </button>
                    </div>
                </div>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Descripción</th>
                                <th>Usuario</th>
                                <th style="text-align: right;">Monto</th>
                                <th style="text-align: center;">Pago</th>
                                <th style="text-align: center;">Acción</th>
                            </tr>
                        </thead>
                        <tbody id="ventasTable"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="tabInventario" class="tab-content">
            <div class="section-box">
                <div class="section-header">
                    <h2>Inventario de Productos</h2>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <select id="filtroOrdenInventario" onchange="cambiarOrdenInventario(this.value)"
                            style="padding: 5px; border-radius: 5px; border: 1px solid #ccc; cursor: pointer;">
                            <option value="default">Orden por Defecto</option>
                            <option value="masVendidos">🔥 Más Vendidos</option>
                            <option value="menosStock">📉 Menos Stock</option>
                            <option value="categoria">📂 Por Categoría</option>
                        </select>
                        <button id="btnAgregarProducto" class="btn-small btn-green hidden"
                            onclick="showModalProducto()">
                            ➕ Agregar Producto
                        </button>
                    </div>
                </div>
                <div id="inventarioGrid" class="inventario-grid"></div>
            </div>

            <div id="sectionLotesAgotados" class="section-box"
                style="margin-top: 30px; background: #fdf2f2; border: 1px solid #fecaca;">
                <div class="section-header">
                    <h2 style="color: #991b1b;">📉 Historial de Lotes Agotados</h2>
                    <small style="color: #666;">Reportes de ganancia total por cada producto que llegó a cero</small>
                </div>
                <div id="lotesAgotadosContainer" class="table-responsive">
                    <p style="text-align: center; color: #991b1b; padding: 20px;">No hay reportes de lotes agotados aún
                    </p>
                </div>
            </div>
        </div>

        <div id="tabReportes" class="tab-content">
            <div class="section-box">
                <h2 style="margin-bottom: 20px;">Reportes y Estadísticas</h2>

                <div class="reporte-grid">
                    <div class="reporte-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <h3>Total Ventas</h3>
                        <div class="valor" id="reporteTotalVentas">S/ 0.00</div>
                    </div>
                    <div class="reporte-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                        <h3>Ventas Mesas</h3>
                        <div class="valor" id="reporteVentasMesas">S/ 0.00</div>
                    </div>
                    <div class="reporte-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                        <h3>Ventas Productos</h3>
                        <div class="valor" id="reporteVentasProductos">S/ 0.00</div>
                    </div>
                    <div class="reporte-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                        <h3>Transacciones</h3>
                        <div class="valor" id="reporteTransacciones">0</div>
                    </div>
                    <div class="reporte-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                        <h3>Consumo Dueño</h3>
                        <div class="valor" id="reporteConsumoDueno" style="font-size: 14px;">S/ 0.00</div>
                    </div>
                    <!-- Desglose por método de pago -->
                    <div class="reporte-card" style="background: linear-gradient(135deg, #134e5e 0%, #71b280 100%);">
                        <h3>💵 Total Efectivo</h3>
                        <div class="valor" id="reporteTotalEfectivo">S/ 0.00</div>
                        <span style="font-size: 11px; opacity: 0.85;">Ventas pagadas en efectivo</span>
                    </div>
                    <div class="reporte-card" style="background: linear-gradient(135deg, #4c0070 0%, #ad00ff 100%);">
                        <h3>📱 Total Yape</h3>
                        <div class="valor" id="reporteTotalYape">S/ 0.00</div>
                        <span style="font-size: 11px; opacity: 0.85;">Ventas pagadas por Yape/Plin</span>
                    </div>
                </div>

                <div style="margin: 20px 0; text-align: center;">
                    <button class="btn btn-primary" onclick="cerrarDia()" style="padding: 15px 40px; font-size: 16px;">
                        🔒 Cerrar Turno/Día
                    </button>
                    <p style="margin-top: 10px; color: #666; font-size: 13px;">
                        Genera un reporte del período actual y archiva las ventas
                    </p>
                </div>

                <h3 style="margin: 30px 0 15px 0;">Detalle de Ventas</h3>

                <div class="table-responsive">
                    <div id="reporteDetalleContainer">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Descripción</th>
                                    <th>Usuario</th>
                                    <th style="text-align: right;">Monto</th>
                                    <th style="text-align: center;">Pago</th>
                                </tr>
                            </thead>
                            <tbody id="reporteDetalleTable"></tbody>
                        </table>
                    </div>
                </div>

                <div style="margin-top: 30px;">
                    <h3 style="color: #2d7a4d; margin-bottom: 15px;">📁 Historial de Cierres</h3>
                    <div id="historialCierresContainer"></div>
                </div>
            </div>
        </div>

        <div id="tabDashboard" class="tab-content">
            <div class="section-box">
                <div class="section-header">
                    <h2>📈 Análisis Financiero Real (Admin)</h2>
                    <small style="color: #666;">Cifras acumuladas históricas basadas en stock y ventas</small>
                </div>

                <div class="financial-summary-grid">
                    <div class="financial-card" style="border-top: 5px solid #2563eb; background: #eff6ff;">
                        <small style="color: #1e40af; font-weight: bold;">💰 Dinero Total en Caja</small>
                        <div class="valor" id="dashDineroCaja" style="color: #1e40af;">S/ 0.00</div>
                        <span class="detalle">Saldo Local + Chica Actual</span>
                    </div>
                    <div class="financial-card" style="border-top: 5px solid #10b981;">
                        <small>Ganancia Cobrada (Ventas)</small>
                        <div class="valor" id="dashGananciaBruta">S/ 0.00</div>
                        <span class="detalle">Utilidad real ya percibida</span>
                    </div>
                    <div class="financial-card" style="border-top: 5px solid #065f46;">
                        <small>Ganancia por Cobrar (Stock)</small>
                        <div class="valor" id="dashGananciaPotencial">S/ 0.00</div>
                        <span class="detalle">Margen total en estante</span>
                    </div>
                    <div class="financial-card" style="border-top: 5px solid #3b82f6;">
                        <small>Utilidad Neta Estimada</small>
                        <div class="valor" id="dashUtilidadNeta">S/ 0.00</div>
                        <span class="detalle">Cobrada + Extras - Gastos</span>
                    </div>
                    <div class="financial-card" style="border-top: 5px solid #f59e0b;">
                        <small>Inversión en Stock</small>
                        <div class="valor" id="dashInversionStock">S/ 0.00</div>
                        <span class="detalle">Valor costo del inventario</span>
                    </div>
                    <div class="financial-card" style="border-top: 5px solid #8b5cf6;">
                        <small>Margen Promedio</small>
                        <div class="valor" id="dashMargenPromedio">0%</div>
                        <span class="detalle">Rendimiento por venta</span>
                    </div>
                </div>

                <div id="dashAlertasContainer" style="margin-top: 20px;"></div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                    <div class="section-box" style="background: white; padding: 15px;">
                        <h3>📊 Rentabilidad por Categoría</h3>
                        <div id="dashCategoriasContainer"></div>
                    </div>
                    <div class="section-box" style="background: white; padding: 15px;">
                        <h3>🏆 Top Productos Rentables</h3>
                        <div id="dashTopProductos"></div>
                    </div>
                </div>

                <div class="section-box"
                    style="margin-top: 20px; background: white; padding: 15px; border-top: 5px solid #10b981;">
                    <div class="section-header">
                        <h3 style="color: #065f46;">🛒 Rentabilidad en Tiempo Real (Todos los Productos)</h3>
                        <small style="color: #666;">Progreso de ganancia acumulada del stock actual</small>
                    </div>
                    <div id="sectionRentabilidadReal" class="table-responsive"></div>
                </div>
            </div>
        </div>

        <div id="tabCaja" class="tab-content">
            <div class="section-box">
                <div class="section-header">
                    <h2>💸 Movimientos de Caja y Gastos</h2>
                    <button class="btn-small btn-red" onclick="showModalMovimiento('egreso')">
                        ➖ Registrar Gasto
                    </button>
                    <button class="btn-small btn-orange" onclick="showModalMovimiento('retiro')">
                        💸 Retiro de Caja
                    </button>
                    <button class="btn-small btn-purple" onclick="showModalMovimiento('reposicion')">
                        📦 Reposición Stock
                    </button>
                    <button class="btn-small btn-green" onclick="showModalMovimiento('ingreso')">
                        ➕ Ingreso Extra
                    </button>
                    <button class="btn-small btn-blue" onclick="showModalTransferencia()" style="background: #2563eb;">
                        🔄 Transferencia
                    </button>
                    <button class="btn-small btn-purple" onclick="showModalTransferenciaYape()"
                        style="background: #742284; color: white;">
                        📱 Transferencia Yape
                    </button>
                    <button id="btnAjusteChica" class="btn-small btn-gray hidden" onclick="showModalAjusteCaja('chica')"
                        title="Ajustar Saldo Caja Chica">
                        ⚙️ Ajuste Chica
                    </button>
                    <button id="btnAjusteLocal" class="btn-small btn-gray hidden" onclick="showModalAjusteCaja('local')"
                        title="Ajustar Saldo Caja Local" style="background: #4b5563; color: white;">
                        ⚙️ Ajuste Local
                    </button>
                    <button id="btnAjusteYape" class="btn-small btn-gray hidden" onclick="showModalAjusteCaja('yape')"
                        title="Ajustar Saldo Yape" style="background: #742284; color: white;">
                        📱 Ajuste Yape
                    </button>
                    <button id="btnLimpiarMovimientos" class="btn-small btn-gray hidden"
                        onclick="limpiarHistorialMovimientos()"
                        title="Borra todos los movimientos de caja sin afectar las ventas"
                        style="background: #374151; color: white;">
                        🧹 Limpiar Historial
                    </button>
                </div>

                <div class="caja-balance-strip" style="grid-template-columns: repeat(5, 1fr);">
                    <div class="balance-item">
                        <span>🏠 Caja Local:</span>
                        <strong id="balanceCajaLocal" style="color: #10b981;">S/ 0.00</strong>
                    </div>
                    <div class="balance-item">
                        <span>👛 Caja Chica:</span>
                        <strong id="balanceCajaChica" style="color: #3b82f6;">S/ 0.00</strong>
                    </div>
                    <div class="balance-item">
                        <span>📱 Total Yape:</span>
                        <strong id="balanceYape" style="color: #742284;">S/ 0.00</strong>
                    </div>
                    <div class="balance-item">
                        <span>📉 Gastos del Mes:</span>
                        <strong id="cajaEgresos" style="color: #ef4444;">S/ 0.00</strong>
                    </div>
                    <div class="balance-item">
                        <span>💰 Total Gral:</span>
                        <strong id="cajaBalance" style="color: #6366f1;">S/ 0.00</strong>
                    </div>
                </div>

                <div style="margin-top: 20px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <label style="font-size: 14px; color: #666;">Filtrar por Tipo:</label>
                    <select id="filtroMovimientos"
                        onchange="actualizarTablaMovimientos(this.value, document.getElementById('filtroFecha').value)"
                        style="width: auto; padding: 5px 15px;">
                        <option value="todos">Todos los movimientos</option>
                        <option value="egreso">Gastos Operativos</option>
                        <option value="retiro">Retiros de Caja</option>
                        <option value="reposicion">Reposición Stock</option>
                        <option value="ingreso">Ingresos Extra</option>
                    </select>

                    <label style="font-size: 14px; color: #666; margin-left: 10px;">Periodo:</label>
                    <select id="filtroFecha"
                        onchange="actualizarTablaMovimientos(document.getElementById('filtroMovimientos').value, this.value)"
                        style="width: auto; padding: 5px 15px;">
                        <option value="todo">Todo el historial</option>
                        <option value="hoy">Hoy</option>
                        <option value="semana">Última Semana</option>
                    </select>
                </div>

                <div class="table-responsive" style="margin-top: 20px;">
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Caja</th>
                                <th>Tipo</th>
                                <th>Descripción</th>
                                <th>Monto</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tablaMovimientos"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- ========== TAB REPORTE MENSUAL ========== -->
        <div id="tabMensual" class="tab-content">
            <div class="section-box">
                <div class="section-header">
                    <h2>📅 Reporte Mensual</h2>
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <select id="filtroAnioMensual" onchange="generarReporteMensual()"
                            style="padding: 6px 12px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px;"></select>
                        <button class="btn-small btn-green" onclick="generarReporteMensual()">🔄 Actualizar</button>
                    </div>
                </div>

                <!-- Tarjetas de resumen anual -->
                <div id="resumenAnualContainer"
                    style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 15px; margin-bottom: 25px;">
                </div>

                <!-- Tabla comparativa por mes -->
                <h3 style="color: #2d7a4d; margin-bottom: 15px; font-size: 16px;">📊 Comparativo por Mes</h3>
                <div class="table-responsive">
                    <table id="tablaMensual" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: #f0fdf4;">
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #2d7a4d;">Mes</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #2d7a4d;">Ventas
                                    Totales</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #2d7a4d;">💵
                                    Efectivo</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #2d7a4d;">📱 Yape
                                </th>
                                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #2d7a4d;">Gastos
                                </th>
                                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #2d7a4d;">Margen
                                </th>
                                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #2d7a4d;">Utilidad
                                    Neta</th>
                                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #2d7a4d;">
                                    Transacc.</th>
                                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #2d7a4d;">PDF
                                </th>
                            </tr>
                        </thead>
                        <tbody id="tablaMensualBody">
                            <tr>
                                <td colspan="9" style="text-align:center; padding: 30px; color: #999;">Cargando datos...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Gráfico de barras simple -->
                <h3 style="color: #2d7a4d; margin: 25px 0 15px 0; font-size: 16px;">📈 Evolución de Ventas</h3>
                <div id="graficaMensualContainer"
                    style="background: #f8f9fa; border-radius: 10px; padding: 20px; min-height: 180px;"></div>
            </div>
        </div>
        <!-- FIN TAB MENSUAL -->

        <div id="tabErrores" class="tab-content">
            <div class="section-box">
                <div class="section-header">
                    <h2>Errores Reportados</h2>
                </div>
                <div id="erroresContainer"></div>
            </div>
        </div>

        <div id="consumoDuenoTab" class="tab-content"> <!-- Cambiar de tabConsumoDueno a consumoDuenoTab -->
            <div class="section-box">
                <div class="section-header">
                    <h2>🍽️ Consumo del Dueño</h2>
                    <button class="btn-small btn-primary" onclick="showModalConsumoDueno()">
                        ➕ Registrar Consumo
                    </button>
                </div>
                <p style="color: #666; margin-bottom: 20px;">
                    ℹ️ Aquí se registran los consumos personales que NO se cobran, pero se descuentan del stock
                </p>
                <div id="consumoDuenoContainer" style="display: block !important;"></div>
            </div>
        </div>
        <!-- LOADING OVERLAY -->
        <div id="loadingOverlay" class="loading-overlay hidden">
            <div class="loading-spinner"></div>
            <p style="margin-top: 20px; color: white;">Cargando...</p>
        </div>

        <!-- MODALES -->
        <div id="modalUsuario" class="modal">
            <div class="modal-content">
                <div class="modal-header" id="usuarioModalTitle">Crear Usuario</div>
                <div id="usuarioError" class="error-msg hidden"></div>
                <div class="input-group">
                    <label>Nombre Completo</label>
                    <input type="text" id="nuevoNombre" autocomplete="name">
                </div>
                <div class="input-group">
                    <label>Usuario</label>
                    <input type="text" id="nuevoUsername" autocomplete="username">
                </div>
                <div class="input-group">
                    <label>Contraseña</label>
                    <input type="password" id="nuevoPassword" autocomplete="new-password"
                        placeholder="Dejar en blanco para mantener la actual (al editar)">
                </div>
                <div class="input-group">
                    <label>Rol</label>
                    <select id="nuevoRol">
                        <option value="empleado">Empleado</option>
                        <option value="encargado">Encargado de Caja</option>
                        <option value="admin">Administrador</option>
                    </select>
                </div>
                <div class="modal-buttons">
                    <button class="btn btn-green btn-full" onclick="guardarUsuario()">Guardar</button>
                    <button class="btn btn-gray btn-full" onclick="closeModalUsuario()">Cancelar</button>
                </div>
            </div>
        </div>

        <!-- Modal para Venta de Tiempo/Consumo de Mesa (Faltante) -->
        <div id="modalConsumo" class="modal">
            <div class="modal-content" style="max-width: 900px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0;" id="consumoModalTitle">Consumo - Mesa XX</h2>
                    <button class="close-btn" onclick="closeModalConsumo()">×</button>
                </div>

                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                    <!-- Productos disponibles -->
                    <div>
                        <h3 style="margin: 0 0 15px 0;">Productos Disponibles</h3>
                        <div style="margin-bottom: 15px;">
                            <input type="text" id="buscarConsumoProducto" placeholder="🔍 Buscar producto..." oninput="renderProductosConsumo()" style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid #ccc; font-size: 14px;">
                        </div>
                        <div id="productosConsumoGrid"
                            style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; max-height: 500px; overflow-y: auto;">
                            <!-- Productos se renderizarán aquí -->
                        </div>
                    </div>

                    <!-- Lista de Consumos de la Mesa -->
                    <div style="background: #e9f0f9; padding: 15px; border-radius: 8px;">
                        <h3 style="margin: 0 0 15px 0;">🍺 Consumos de la Mesa</h3>
                        <div id="listaConsumos" style="margin-bottom: 20px; max-height: 350px; overflow-y: auto;">
                            <!-- Consumos de la mesa (producto, cantidad, eliminar) se renderizarán aquí -->
                        </div>
                        <div style="border-top: 2px solid #b3cde3; padding-top: 15px; margin-top: 15px;">
                            <div
                                style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <strong style="font-size: 18px;">Total Consumo:</strong>
                                <strong id="totalConsumo" style="font-size: 24px; color: #007bff;">S/ 0.00</strong>
                            </div>
                            <button id="btnCobroParcial" class="btn btn-green" onclick="showModalCobroParcial()"
                                style="width: 100%; padding: 12px; margin-bottom: 10px;">
                                💵 Cobrar Parcial
                            </button>
                            <button id="btnCerrarMesa" class="btn btn-blue" onclick="cerrarMesaCompleto()"
                                style="width: 100%; padding: 12px;">
                                💰 Cerrar Mesa y Cobrar Todo (Total: S/ 0.00)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Fin Modal Consumo Faltante -->


        <div id="modalVentaManual" class="modal">
            <div class="modal-content">
                <div class="modal-header">Venta Manual</div>
                <div class="input-group">
                    <label>Descripción</label>
                    <input type="text" id="ventaDescripcionManual" placeholder="Ej: Alquiler mesa pool">
                </div>
                <div class="input-group">
                    <label>Monto (S/)</label>
                    <input type="number" id="ventaMontoManual" step="0.01" min="0" placeholder="0.00">
                </div>
                <div class="input-group">
                    <label>Método de Pago</label>
                    <select id="metodoPagoManual">
                        <option value="Efectivo">💵 Efectivo</option>
                        <option value="Yape">📱 Yape/Plin</option>
                    </select>
                </div>
                <div class="modal-buttons">
                    <button class="btn btn-green btn-full" onclick="agregarVentaManual()" id="btnGuardarVentaManual">
                        Guardar
                    </button>
                    <button class="btn btn-gray btn-full" onclick="closeModalVentaManual()">Cancelar</button>
                </div>
            </div>
        </div>

        <div id="modalVentaProductos" class="modal">
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">Vender Productos</div>
                <div style="margin-bottom: 15px;">
                    <input type="text" id="buscarVentaProducto" placeholder="🔍 Buscar producto..." oninput="renderProductosVenta()" style="width: 100%; padding: 10px; border-radius: 5px; border: 1px solid #ccc; font-size: 16px;">
                </div>
                <div id="productosVentaContainer" class="productos-venta-grid"></div>

                <div
                    style="margin-top: 15px; padding: 12px; background: #f3f4f6; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #e5e7eb;">
                    <span style="font-weight: 600; font-size: 14px;">Método de Pago (Venta Rápida):</span>
                    <select id="metodoPagoDirecto"
                        style="padding: 5px 10px; border-radius: 6px; border: 1px solid #ccc;">
                        <option value="Efectivo">💵 Efectivo</option>
                        <option value="Yape">📱 Yape/Plin</option>
                    </select>
                </div>

                <div class="modal-buttons" style="margin-top: 20px;">
                    <button class="btn btn-gray btn-full" onclick="closeModalVentaProductos()">Cerrar</button>
                </div>
            </div>
        </div>

        <div id="modalMovimiento" class="modal">
            <div class="modal-content">
                <div class="modal-header" id="movimientoModalTitle">Registrar Gasto</div>
                <div id="movimientoError" class="error-msg hidden"></div>

                <div class="input-group">
                    <label>Tipo de Movimiento</label>
                    <select id="movimientoTipo">
                        <option value="egreso">Gasto Operativo (Egreso)</option>
                        <option value="retiro">Retiro de Efectivo</option>
                        <option value="reposicion">Reposición de Stock</option>
                        <option value="ingreso">Ingreso Extra</option>
                    </select>
                </div>

                <div class="input-group">
                    <label>Descripción / Concepto</label>
                    <input type="text" id="movimientoDescripcion" placeholder="Ej: Pago de luz / Compra snacks">
                </div>

                <div class="input-group">
                    <label>Monto (S/)</label>
                    <input type="number" id="movimientoMonto" step="0.01" min="0" placeholder="0.00">
                </div>

                <div class="input-group">
                    <label>¿En qué caja impacta?</label>
                    <select id="movimientoCaja">
                        <option value="local">🏠 Caja Local</option>
                        <option value="chica">👛 Caja Chica</option>
                        <option value="yape">📱 Yape</option>
                    </select>
                </div>

                <div class="modal-buttons">
                    <button class="btn btn-red btn-full" id="btnGuardarMovimiento" onclick="guardarMovimiento()">
                        Confirmar
                    </button>
                    <button class="btn btn-gray btn-full" onclick="closeModalMovimiento()">Cancelar</button>
                </div>
            </div>
        </div>

        <!-- ✅ NUEVO: Modal Transferencia -->
        <div id="modalTransferencia" class="modal">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">🔄 Transferir Fondos (Caja -> Caja Chica)</div>
                <p style="font-size: 14px; color: #666; margin-bottom: 20px;">Mueve dinero de la Caja Local a la Caja
                    Chica.</p>

                <div id="transferenciaError" class="error-msg hidden"></div>

                <div class="input-group">
                    <label>Monto a transferir (S/)</label>
                    <input type="number" id="transferenciaMonto" step="0.01" min="0" placeholder="0.00">
                </div>

                <div class="modal-buttons">
                    <button class="btn btn-blue btn-full" onclick="guardarTransferencia()">
                        Confirmar Transferencia
                    </button>
                    <button class="btn btn-gray btn-full" onclick="closeModalTransferencia()">Cancelar</button>
                </div>
            </div>
        </div>

        <!-- ✅ NUEVO: Modal Transferencia Yape -->
        <div id="modalTransferenciaYape" class="modal">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header" style="color: #742284;">📱 Transferir Yape a Caja</div>
                <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
                    Registra el ingreso de dinero desde Yape hacia una de las cajas físicas.
                </p>

                <div id="transferenciaYapeError" class="error-msg hidden"></div>

                <div class="input-group">
                    <label>Monto a transferir (S/)</label>
                    <input type="number" id="transferenciaYapeMonto" step="0.01" min="0" placeholder="0.00">
                </div>

                <div class="input-group">
                    <label>Destino</label>
                    <select id="transferenciaYapeDestino">
                        <option value="local">🏠 Caja Local</option>
                        <option value="chica">👛 Caja Chica</option>
                    </select>
                </div>

                <div class="modal-buttons">
                    <button class="btn btn-purple btn-full" onclick="guardarTransferenciaYape()"
                        style="background: #742284;">
                        Confirmar Transferencia
                    </button>
                    <button class="btn btn-gray btn-full" onclick="closeModalTransferenciaYape()">Cancelar</button>
                </div>
            </div>
        </div>

        <!-- ✅ NUEVO: Modal Eliminar Ventas por Rango -->
        <div id="modalEliminarVentas" class="modal">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header" style="color: #dc3545;">🗑️ Eliminar Ventas</div>
                <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
                    Selecciona el rango de fechas para eliminar ventas. <br>
                    <strong>¡Esta acción no se puede deshacer!</strong>
                </p>

                <div id="eliminarVentasError" class="error-msg hidden"></div>

                <div class="input-group">
                    <label>Fecha Inicio</label>
                    <input type="date" id="fechaInicioEliminar">
                </div>

                <div class="input-group">
                    <label>Fecha Fin</label>
                    <input type="date" id="fechaFinEliminar">
                </div>

                <div class="modal-buttons">
                    <button class="btn btn-red btn-full" onclick="eliminarVentasPorRango()">
                        🗑️ Eliminar Definitivamente
                    </button>
                    <button class="btn btn-gray btn-full" onclick="closeModalEliminarVentas()">Cancelar</button>
                </div>
            </div>
        </div>

        <!-- ✅ NUEVO: Modal Ajuste Caja (GENÉRICO) -->
        <div id="modalAjusteCaja" class="modal">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header" id="ajusteTitulo">⚙️ Ajustar Saldo Caja</div>
                <p style="font-size: 14px; color: #666; margin-bottom: 20px;">Utiliza esto para establecer el saldo
                    inicial o corregir el monto físico en la Caja.</p>

                <div class="info-grid"
                    style="grid-template-columns: 1fr; background: #f8f9fa; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                    <div class="info-item">
                        <span class="info-label">Saldo Actual en Sistema:</span>
                        <strong id="ajusteMontoActual" style="font-size: 18px; color: #3b82f6;">S/ 0.00</strong>
                    </div>
                </div>

                <div id="ajusteError" class="error-msg hidden"></div>

                <div class="input-group">
                    <label>Saldo Real / Nuevo Saldo (S/)</label>
                    <input type="number" id="ajusteMontoNuevo" step="0.01" min="0" placeholder="Ej: 500.00">
                </div>

                <div class="modal-buttons">
                    <button class="btn btn-blue btn-full" onclick="guardarAjusteCaja()">
                        Guardar Ajuste
                    </button>
                    <button class="btn btn-gray btn-full" onclick="closeModalAjusteCaja()">Cancelar</button>
                </div>
            </div>
        </div>

        <div id="modalProducto" class="modal">
            <div class="modal-content">
                <div class="modal-header" id="productoModalTitle">Agregar Producto</div>
                <div id="productoError" class="error-msg hidden"></div>
                <div class="input-group">
                    <label>Nombre</label>
                    <input type="text" id="productoNombre" placeholder="Ej: Cerveza Pilsen">
                </div>

                <!-- Nueva sección: Categoría -->
                <div class="input-group">
                    <label>Categoría</label>
                    <select id="productoCategoria">
                        <option value="Golosinas">🍬 Golosinas</option>
                        <option value="Gaseosas">🥤 Gaseosas</option>
                        <option value="Licores">🍺 Licores</option>
                        <option value="Otros">📦 Otros</option>
                    </select>
                </div>

                <!-- Precios: Costo y Venta -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="input-group">
                        <label>💰 Precio de Costo (S/)</label>
                        <input type="number" id="productoPrecioCosto" step="0.01" min="0" placeholder="0.00"
                            oninput="calcularMargenProducto()">
                    </div>
                    <div class="input-group">
                        <label>💵 Precio de Venta (S/)</label>
                        <input type="number" id="productoPrecio" step="0.01" min="0" placeholder="0.00"
                            oninput="calcularMargenProducto()">
                    </div>
                </div>

                <!-- Indicador de Margen de Ganancia -->
                <div id="margenIndicador" class="hidden"
                    style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
                    <div style="font-size: 12px; opacity: 0.9; margin-bottom: 3px;">📊 Margen de Ganancia</div>
                    <div style="font-size: 20px; font-weight: bold;">
                        <span id="margenPorcentaje">0%</span>
                        <span style="font-size: 14px; margin-left: 10px;">
                            (S/ <span id="margenMonto">0.00</span> por unidad)
                        </span>
                    </div>
                </div>

                <!-- Stock -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="input-group">
                        <label>📦 Stock Inicial</label>
                        <input type="number" id="productoStock" min="0" placeholder="0">
                    </div>
                    <div class="input-group">
                        <label>⚠️ Stock Mínimo (Alerta)</label>
                        <input type="number" id="productoStockMin" min="0" placeholder="Ej: 5">
                    </div>
                    <div class="input-group"
                        style="background: #fdf2f2; padding: 10px; border-radius: 6px; border: 1px solid #fecaca;">
                        <label style="color: #991b1b;">Tamaño de Lote (Reporte Automático)</label>
                        <input type="number" id="productoTamanoLote" min="0"
                            placeholder="Ej: 12 (Caja) o 0 para desactivar">
                        <small style="display: block; color: #666; margin-top: 5px;">
                            Si pones 12, el sistema reportará un "Lote Vendido" cada vez que vendas 12 unidades
                            acumuladas.
                        </small>
                    </div>
                </div>

                <!-- Ganancia Total Esperada -->
                <div id="gananciaTotalIndicador" class="hidden"
                    style="background: #f0f9ff; border: 2px dashed #3b82f6; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #1e40af; font-weight: 500;">🎯 Ganancia Total Esperada del Lote:</span>
                        <span style="color: #1e40af; font-size: 18px; font-weight: bold;">S/ <span
                                id="gananciaTotalEsperada">0.00</span></span>
                    </div>
                </div>

                <div class="modal-buttons">
                    <button class="btn btn-green btn-full" onclick="guardarProducto()">Guardar</button>
                    <button class="btn btn-gray btn-full" onclick="closeModalProducto()">Cancelar</button>
                </div>
            </div>
        </div>

        <div id="modalStock" class="modal">
            <div class="modal-content">
                <div class="modal-header">Ajustar Stock</div>
                <h3 id="stockProductoNombre" style="margin-bottom: 15px; color: #666;"></h3>
                <div class="input-group">
                    <label>Stock Actual: <strong id="stockActual">0</strong></label>
                </div>
                <div class="input-group">
                    <label>Ajuste (+/-)</label>
                    <input type="number" id="stockAjuste" placeholder="+10 para agregar, -5 para quitar">
                </div>
                <div class="modal-buttons">
                    <button class="btn btn-green btn-full" onclick="ajustarStock()">Guardar</button>
                    <button class="btn btn-gray btn-full" onclick="closeModalStock()">Cancelar</button>
                </div>
            </div>
        </div>

        <div id="modalError" class="modal">
            <div class="modal-content">
                <div class="modal-header">Reportar Error</div>
                <div class="input-group">
                    <label>Describe el error</label>
                    <textarea id="errorMensaje"
                        placeholder="Describe qué sucedió... Ej: La mesa 2 no calculó bien el tiempo"
                        rows="5"></textarea>
                </div>
                <div class="modal-buttons">
                    <button class="btn btn-orange btn-full" onclick="reportarError()">Enviar</button>
                    <button class="btn btn-gray btn-full" onclick="closeModalError()">Cancelar</button>
                </div>
            </div>
        </div>

        <!-- Modal Consumo Dueño -->
        <div id="modalConsumoDueno" class="modal">
            <div class="modal-content" style="max-width: 900px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0;">🍽️ Registrar Consumo del Dueño</h2>
                    <button class="close-btn" onclick="closeModalConsumoDueno()">×</button>
                </div>

                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                    <!-- Productos disponibles -->
                    <div>
                        <h3 style="margin: 0 0 15px 0;">Productos Disponibles</h3>
                        <div id="productosConsumoDuenoGrid"
                            style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; max-height: 500px; overflow-y: auto;">
                        </div>
                    </div>

                    <!-- Carrito -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <h3 style="margin: 0 0 15px 0;">🛒 Carrito</h3>
                        <div id="carritoConsumoDuenoContainer"
                            style="margin-bottom: 20px; max-height: 350px; overflow-y: auto;"></div>
                        <div style="border-top: 2px solid #dee2e6; padding-top: 15px; margin-top: 15px;">
                            <div
                                style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <strong style="font-size: 18px;">Total:</strong>
                                <strong id="totalConsumoDueno" style="font-size: 24px; color: #ff9800;">S/ 0.00</strong>
                            </div>
                            <button id="btnGuardarConsumoDueno" class="btn btn-primary" onclick="guardarConsumoDueno()"
                                style="width: 100%; padding: 12px;" disabled>
                                💾 Guardar Consumo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Cobro Parcial -->
        <div id="modalCobroParcial" class="modal">
            <div class="modal-content" style="max-width: 700px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0;">💵 Cobro Parcial</h2>
                    <button class="close-btn" onclick="closeModalCobroParcial()">×</button>
                </div>

                <p style="color: #666; margin-bottom: 20px;">
                    Selecciona la cantidad de cada producto que deseas cobrar. Los productos restantes quedarán en la
                    mesa.
                </p>

                <div id="itemsCobroParcialContainer" style="max-height: 400px; overflow-y: auto; margin-bottom: 20px;">
                    <!-- Items se renderizan aquí -->
                </div>

                <div style="border-top: 2px solid #ddd; padding-top: 15px; margin-top: 15px;">
                    <div
                        style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <strong style="font-size: 18px;">Total a Cobrar:</strong>
                        <strong id="totalCobroParcial" style="font-size: 28px; color: #10b981;">S/ 0.00</strong>
                    </div>



                    <div class="modal-buttons">
                        <button class="btn btn-green btn-full" onclick="procesarCobroParcial()"
                            id="btnConfirmarCobroParcial">
                            ✅ Confirmar Cobro
                        </button>
                        <button class="btn btn-gray btn-full" onclick="closeModalCobroParcial()">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
        <!-- ✅ MODAL CONFIRMACIÓN DE PAGO UNIVERSAL -->
        <div id="modalConfirmacionPago" class="modal">
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <div class="modal-header">
                    <h2 id="pagoTitulo" style="margin: 0; font-size: 20px;">Confirmar Pago</h2>
                </div>
                <div style="padding: 20px;">
                    <div style="font-size: 14px; color: #666; margin-bottom: 5px;" id="pagoDetalle">Resumen de cobro
                    </div>
                    <div style="font-size: 32px; font-weight: bold; color: #10b981; margin-bottom: 25px;"
                        id="pagoMonto">S/ 0.00</div>

                    <label
                        style="display: block; text-align: left; margin-bottom: 12px; font-weight: 600; font-size: 14px; color: #374151;">Selecciona
                        Método de Pago:</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <label class="metodo-pago-opt">
                            <input type="radio" name="metodoPagoConf" value="Efectivo" checked
                                onchange="togglePagoMixto()">
                            <div class="opt-box" style="font-size: 13px;">💵 Efectivo</div>
                        </label>
                        <label class="metodo-pago-opt">
                            <input type="radio" name="metodoPagoConf" value="Yape" onchange="togglePagoMixto()">
                            <div class="opt-box" style="font-size: 13px;">📱 Yape/Plin</div>
                        </label>
                        <label class="metodo-pago-opt">
                            <input type="radio" name="metodoPagoConf" value="Mixto" onchange="togglePagoMixto()">
                            <div class="opt-box" style="font-size: 13px;">🔀 Mixto</div>
                        </label>
                    </div>

                    <div id="pagoMixtoInputs" class="hidden" style="margin-bottom: 25px; text-align: left;">
                        <div style="display: flex; gap: 10px;">
                            <div class="input-group" style="flex: 1; margin-bottom: 0;">
                                <label style="font-size: 12px;">💵 Efectivo S/</label>
                                <input type="number" id="pagoMixtoEfectivo" step="0.01" min="0" placeholder="0.00"
                                    oninput="calcularPagoMixtoYape()" style="font-weight: bold; color: #10b981;">
                            </div>
                            <div class="input-group" style="flex: 1; margin-bottom: 0;">
                                <label style="font-size: 12px;">📱 Yape S/</label>
                                <input type="number" id="pagoMixtoYape" step="0.01" min="0" placeholder="0.00" readonly
                                    style="background: #f3f4f6; font-weight: bold; color: #742284;">
                            </div>
                        </div>
                        <small style="color: #666; font-size: 11px;">Ingresa el efectivo, el Yape se calcula
                            automáticamente.</small>
                    </div>

                    <div style="display: flex; gap: 10px; padding-top: 10px;">
                        <button class="btn btn-gray" onclick="closeModalConfirmacionPago()"
                            style="flex: 1;">Atrás</button>
                        <button id="btnConfirmarPagoFinal" class="btn btn-green"
                            style="flex: 2; font-size: 16px; font-weight: bold;">
                            ✅ Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <script type="module" src="firebase-config.js"></script>
        <script src="app.js"></script>
</body>

</html>
