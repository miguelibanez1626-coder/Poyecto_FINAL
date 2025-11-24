import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';
import { 
    Home, LineChart, Users, Settings, LogOut, 
    DollarSign, ShoppingCart, Percent, Search, Bell, Download, Globe, BarChart,
    Save, RefreshCw, Shield, X, CheckCircle, AlertTriangle, Info, Trash2
} from 'lucide-react';

// --- IMPORTAMOS LOS COMPONENTES DE VISTAS ---
import Login from './Login'; 
import ClienteView from './ClienteView'; 

const API_URL = "http://127.0.0.1:8000";

const COLORS = {
    bgLight: '#F4F7FC', cardLight: '#FFFFFF', textDark: '#2D3748', textMuted: '#718096',
    accentOrange: '#F6AD55', accentBlue: '#4299E1', accentGreen: '#38A169',
    danger: '#E53E3E', warning: '#DD6B20'
};

// --- HOOK DE DATOS (AHORA CON REFRESH TRIGGER) ---
function useDashboardData(rangoFecha, token, role, refreshTrigger) {
    const [data, setData] = useState({
        kpis: null, financiero: [], ultimasOrdenes: [], rentabilidad: [], geoClientes: [], topClientes: [],
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!token || role !== 'admin') return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const config = { 
                    params: { dias: rangoFecha },
                    headers: { Authorization: `Bearer ${token}` } 
                };
                // Pequeño delay artificial para que se note la recarga (UX)
                await new Promise(r => setTimeout(r, 600)); 

                const [resKpis, resFin, resRent, resCli, resGeo, resOrd] = await Promise.all([
                    axios.get(`${API_URL}/kpis`, config),
                    axios.get(`${API_URL}/analisis-financiero`, config),
                    axios.get(`${API_URL}/admin/rentabilidad-categoria`, config),
                    axios.get(`${API_URL}/top-clientes`, config),
                    axios.get(`${API_URL}/admin/geo-clientes`, config), 
                    axios.get(`${API_URL}/ultimas-ordenes`, config),
                ]);
                setData({
                    kpis: resKpis.data, financiero: resFin.data, rentabilidad: resRent.data,
                    topClientes: resCli.data, geoClientes: resGeo.data, ultimasOrdenes: resOrd.data,
                });
            } catch (err) {
                console.error("Error fetching data:", err);
                if (err.response && err.response.status === 401) {
                    setError("Tu sesión ha expirado.");
                } else {
                    setError("Error de conexión con el servidor.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [rangoFecha, token, role, refreshTrigger]); // Se ejecuta cuando cambia el trigger

    return { data, loading, error };
}

// --- COMPONENTE PRINCIPAL APP ---
function App() {
    // 1. GESTIÓN DE SESIÓN
    const [user, setUser] = useState(() => {
        const savedToken = localStorage.getItem('token');
        return savedToken ? {
            token: savedToken,
            role: localStorage.getItem('role'),
            name: localStorage.getItem('name')
        } : null;
    });

    // Estados del Dashboard
    const [rangoFecha, setRangoFecha] = useState("ALL"); 
    const [activeTab, setActiveTab] = useState("Dashboard");
    const [refreshTrigger, setRefreshTrigger] = useState(0); // Estado para forzar recarga

    // Estados de Notificaciones (NUEVO)
    const [showNotif, setShowNotif] = useState(false);
    const [notifications, setNotifications] = useState([
        { id: 1, title: "Stock Crítico", msg: "Quedan 5 unidades de 'Proseware Laptop'", type: "warning", time: "Hace 2 min" },
        { id: 2, title: "Venta Grande", msg: "Fabrikam Inc. realizó un pedido de $15,000", type: "success", time: "Hace 15 min" },
        { id: 3, title: "Actualización", msg: "Mantenimiento programado para el domingo", type: "info", time: "Hace 2 horas" }
    ]);

    // Estados de Configuración
    const [config, setConfig] = useState({
        metaVentas: 500000000,
        notificaciones: true,
        modoMantenimiento: false
    });

    // Llamada al hook con el nuevo trigger
    const { data, loading, error } = useDashboardData(rangoFecha, user?.token, user?.role, refreshTrigger);

    // --- FUNCIONES ---
    const handleLogin = (userData) => {
        localStorage.setItem('token', userData.token);
        localStorage.setItem('role', userData.role);
        localStorage.setItem('name', userData.name);
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.clear();
        setUser(null);
        window.location.href = "/";
    };

    // Nueva función de Refresh Manual
    const handleManualRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    // Funciones de Notificaciones
    const removeNotification = (id) => {
        setNotifications(notifications.filter(n => n.id !== id));
    };
    const clearNotifications = () => setNotifications([]);

    const handleSaveConfig = () => alert("¡Configuración guardada correctamente!");

    // --- LÓGICA DE MAPAS Y EXPORTACIÓN ---
    const mapaData = useMemo(() => {
        if (!data.geoClientes || data.geoClientes.length === 0) return null;
        const paises = {};
        data.geoClientes.forEach(d => {
            if (!paises[d.Pais]) paises[d.Pais] = { id: d.Pais, label: d.Pais, value: 0, parent: "" };
            paises[d.Pais].value += d.TotalClientes;
        });
        let ids = Object.keys(paises);
        let labels = Object.keys(paises);
        let parents = Object.keys(paises).map(() => "");
        let values = Object.values(paises).map(p => p.value);
        data.geoClientes.forEach(d => {
            ids.push(`${d.Pais}-${d.Estado}`);
            labels.push(d.Estado);
            parents.push(d.Pais);
            values.push(d.TotalClientes);
        });
        return { ids, labels, parents, values };
    }, [data.geoClientes]);

    const exportarExcel = () => {
        if (!data.financiero || data.financiero.length === 0) return;
        let csv = "Mes,Ventas,Costos,Ganancia\n" + data.financiero.map(f => `${f.Mes},${f.Ventas},${f.Costos},${f.Ganancia}`).join("\n");
        const link = document.createElement("a");
        link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
        link.download = "reporte_financiero.csv";
        link.click();
    };

    // --- RENDERIZADO ---

    if (!user) return <Login onLoginSuccess={handleLogin} />;
    if (user.role === 'cliente') return <ClienteView token={user.token} user={user} onLogout={handleLogout} />;
    if (error) return <div className="p-5 text-center text-danger"><h4>{error}</h4><button onClick={handleLogout} className="btn btn-primary mt-3">Reiniciar</button></div>;

    const { kpis, financiero, ultimasOrdenes, rentabilidad, topClientes } = data;

    return (
        <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: COLORS.bgLight, color: COLORS.textDark, fontFamily: "'Inter', sans-serif" }}>
            
            {/* SIDEBAR */}
            <div className="d-flex flex-column align-items-center py-4 border-end" 
                 style={{ width: '80px', minHeight: '100vh', position: 'fixed', zIndex: 1000, backgroundColor: COLORS.cardLight, borderColor: 'rgba(0,0,0,0.05)' }}>
                <div className="mb-5 pt-2">
                    <img src="https://i.pravatar.cc/300?img=11" alt="Admin" className="rounded-circle border border-2 shadow-sm" 
                         style={{width: '50px', height: '50px', objectFit: 'cover', borderColor: COLORS.accentOrange}}/>
                </div>
                <div className="mt-auto d-flex flex-column gap-4 pb-4">
                     <div onClick={() => setActiveTab("Configuracion")} style={{cursor:'pointer'}} title="Configuración">
                        <NavIconSidebar icon={<Settings/>} active={activeTab === "Configuracion"} /> 
                     </div>
                     <div onClick={handleLogout} style={{cursor:'pointer'}} title="Cerrar Sesión">
                        <NavIconSidebar icon={<LogOut/>} isDanger/>
                     </div>
                </div>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="p-5 flex-grow-1" style={{ marginLeft: '80px', width: 'calc(100% - 80px)' }}>
                <div style={{ maxWidth: '1600px', margin: '0 auto' }}>

                    {/* HEADER MEJORADO */}
                    <div className="d-flex justify-content-between align-items-end mb-5 pb-3 border-bottom" style={{borderColor: 'rgba(0,0,0,0.1)'}}>
                        <div>
                            <small className="text-uppercase mb-2 d-block fw-bold" style={{color: COLORS.accentOrange, letterSpacing: '2px', fontSize: '0.7rem'}}>
                                Panel de Control: {user.name}
                            </small>
                            <div className="d-flex gap-2">
                                <NavButton text="Dashboard" icon={<Home/>} active={activeTab === "Dashboard"} onClick={() => setActiveTab("Dashboard")} />
                                <NavButton text="Rentabilidad" icon={<BarChart/>} active={activeTab === "Rentabilidad"} onClick={() => setActiveTab("Rentabilidad")} />
                                <NavButton text="Geo-Analítica" icon={<Globe/>} active={activeTab === "Geo-Analítica"} onClick={() => setActiveTab("Geo-Analítica")} />
                                <NavButton text="Clientes" icon={<Users/>} active={activeTab === "Clientes"} onClick={() => setActiveTab("Clientes")} />
                                <div className="ms-4 d-flex align-items-center small" style={{color: COLORS.textMuted}}>
                                    <span className="me-2">Rango:</span>
                                    {["7d", "30d", "YTD", "ALL"].map(r => (
                                        <button key={r} onClick={() => setRangoFecha(r)}
                                            className={`btn btn-sm py-1 px-2 ms-1 rounded-pill fw-semibold border-0 ${rangoFecha === r ? 'text-white' : ''}`}
                                            style={{ backgroundColor: rangoFecha === r ? COLORS.accentBlue : 'transparent', color: rangoFecha === r ? COLORS.cardLight : COLORS.textMuted }}>
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        {/* ZONA DE ACCIONES (NOTIFICACIONES Y REFRESH) */}
                        <div className="d-flex align-items-center gap-3">
                            
                            {/* 1. BUSCADOR */}
                            <div className="input-group input-group-sm rounded-pill" style={{width: '200px', backgroundColor: COLORS.cardLight, border: `1px solid ${COLORS.bgLight}`}}>
                                 <span className="input-group-text bg-transparent border-0" style={{color: COLORS.textMuted}}><Search/></span>
                                 <input type="text" className="form-control bg-transparent border-0 shadow-none" style={{color: COLORS.textDark}} placeholder="Buscar..."/>
                            </div>

                            {/* 2. BOTÓN REFRESH (NUEVO) */}
                            <button onClick={handleManualRefresh} disabled={loading} 
                                className="btn p-2 rounded-circle bg-white shadow-sm border-0 d-flex align-items-center justify-content-center"
                                title="Actualizar Datos"
                                style={{width: '40px', height: '40px', transition: 'all 0.2s'}}>
                                <RefreshCw size={20} className={loading ? "spin-anim text-primary" : "text-muted"} />
                            </button>

                            {/* 3. NOTIFICACIONES FUNCIONALES (NUEVO) */}
                            <div className="position-relative">
                                <button onClick={() => setShowNotif(!showNotif)} 
                                    className="btn p-2 rounded-circle bg-white shadow-sm border-0 d-flex align-items-center justify-content-center"
                                    style={{width: '40px', height: '40px'}}>
                                    <Bell size={20} style={{color: showNotif ? COLORS.accentBlue : COLORS.textMuted}}/>
                                    {notifications.length > 0 && (
                                        <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light p-1" style={{fontSize: '0.6rem'}}>
                                            {notifications.length}
                                        </span>
                                    )}
                                </button>

                                {/* DROPDOWN NOTIFICACIONES */}
                                {showNotif && (
                                    <div className="card position-absolute shadow-lg border-0 end-0 mt-2 fade-in" style={{width: '320px', zIndex: 1050, borderRadius: '12px'}}>
                                        <div className="card-header bg-white border-bottom pt-3 px-3 d-flex justify-content-between align-items-center">
                                            <h6 className="fw-bold mb-0">Notificaciones</h6>
                                            {notifications.length > 0 && (
                                                <button onClick={clearNotifications} className="btn btn-link btn-sm text-muted text-decoration-none p-0" style={{fontSize:'0.75rem'}}>
                                                    <Trash2 size={14} className="me-1"/>Limpiar
                                                </button>
                                            )}
                                        </div>
                                        <div className="card-body p-0" style={{maxHeight: '300px', overflowY: 'auto'}}>
                                            {notifications.length === 0 ? (
                                                <div className="text-center py-4 text-muted small">No tienes notificaciones nuevas 🎉</div>
                                            ) : (
                                                notifications.map(notif => (
                                                    <div key={notif.id} className="p-3 border-bottom hover-bg-light position-relative">
                                                        <div className="d-flex align-items-start">
                                                            <div className={`mt-1 me-3 p-1 rounded-circle ${notif.type === 'warning' ? 'text-warning bg-warning bg-opacity-10' : notif.type === 'success' ? 'text-success bg-success bg-opacity-10' : 'text-info bg-info bg-opacity-10'}`}>
                                                                {notif.type === 'warning' ? <AlertTriangle size={16}/> : notif.type === 'success' ? <CheckCircle size={16}/> : <Info size={16}/>}
                                                            </div>
                                                            <div className="flex-grow-1">
                                                                <h6 className="mb-1 small fw-bold text-dark">{notif.title}</h6>
                                                                <p className="mb-1 small text-muted lh-sm">{notif.msg}</p>
                                                                <small className="text-secondary" style={{fontSize: '0.65rem'}}>{notif.time}</small>
                                                            </div>
                                                            <button onClick={() => removeNotification(notif.id)} className="btn btn-sm text-muted p-0 ms-2"><X size={14}/></button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- CONTENIDO PRINCIPAL (LOADING STATE) --- */}
                    {loading && activeTab !== "Configuracion" ? (
                        <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{minHeight: '400px'}}>
                            <div className="spinner-border text-primary mb-3" role="status"></div>
                            <span className="text-muted fade-in">Actualizando datos del servidor...</span>
                        </div>
                    ) : (
                        <>
                            {/* --- VISTA CONFIGURACION --- */}
                            {activeTab === "Configuracion" && (
                                <div className="fade-in">
                                    <h3 className="fw-bold text-dark mb-4">Configuración del Sistema</h3>
                                    <div className="row g-4">
                                        {/* ... Tarjetas de configuración (Igual que antes) ... */}
                                        <div className="col-md-6">
                                            <div className="card border-0 shadow-sm p-4 h-100" style={{borderRadius: '12px'}}>
                                                <div className="d-flex align-items-center mb-4">
                                                    <div className="p-3 rounded-circle bg-primary bg-opacity-10 text-primary me-3"><Users size={24}/></div>
                                                    <h5 className="fw-bold mb-0">Perfil de Administrador</h5>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label small text-muted fw-bold">NOMBRE MOSTRADO</label>
                                                    <input type="text" className="form-control bg-light border-0" defaultValue={user.name} />
                                                </div>
                                                <button className="btn btn-outline-primary w-100 mt-3">Actualizar Perfil</button>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="card border-0 shadow-sm p-4 h-100" style={{borderRadius: '12px'}}>
                                                <div className="d-flex align-items-center mb-4">
                                                    <div className="p-3 rounded-circle bg-warning bg-opacity-10 text-warning me-3"><DollarSign size={24}/></div>
                                                    <h5 className="fw-bold mb-0">Metas y Objetivos</h5>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label small text-muted fw-bold">META DE VENTAS MENSUAL ($)</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text border-0 bg-light">$</span>
                                                        <input type="number" className="form-control bg-light border-0" 
                                                            value={config.metaVentas} 
                                                            onChange={(e) => setConfig({...config, metaVentas: e.target.value})} 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <div className="card border-0 shadow-sm p-4" style={{borderRadius: '12px'}}>
                                                <div className="d-flex align-items-center mb-4">
                                                    <div className="p-3 rounded-circle bg-danger bg-opacity-10 text-danger me-3"><Shield size={24}/></div>
                                                    <h5 className="fw-bold mb-0">Acciones del Sistema</h5>
                                                </div>
                                                <div className="d-flex gap-3">
                                                    <button className="btn btn-light border text-muted d-flex align-items-center" onClick={handleManualRefresh}>
                                                        <RefreshCw size={18} className="me-2"/> Recargar Datos
                                                    </button>
                                                    <button className="btn btn-light border text-muted d-flex align-items-center">
                                                        <Save size={18} className="me-2"/> Crear Copia de Seguridad
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="d-flex justify-content-end mt-4">
                                        <button className="btn btn-primary px-5 py-2 fw-bold rounded-pill shadow-sm" onClick={handleSaveConfig}>Guardar Cambios</button>
                                    </div>
                                </div>
                            )}

                            {/* --- VISTAS DASHBOARD --- */}
                            {activeTab === "Dashboard" && (
                                <div className="fade-in">
                                    <div className="row mb-4 g-4">
                                        <KpiCardPremium title="Ingresos Totales" value={kpis?.TotalVentas} icon={<DollarSign/>} isMoney accentColor={COLORS.accentOrange}/>
                                        <KpiCardPremium title="Pedidos Totales" value={kpis?.TotalPedidos} icon={<ShoppingCart/>} accentColor={COLORS.accentBlue}/>
                                        <KpiCardPremium title="Ticket Promedio" value={kpis?.TicketPromedio} icon={<Percent/>} isMoney accentColor={COLORS.accentGreen}/>
                                        <KpiCardPremium title="Cumplimiento Meta" value={(kpis?.TotalVentas / config.metaVentas * 100) || 0} suffix="%" icon={<LineChart/>} accentColor={COLORS.textMuted}/>
                                    </div>
                                    <div className="card border-0 mb-4 shadow-sm" style={{borderRadius: '12px', backgroundColor: COLORS.cardLight}}>
                                        <div className="card-header bg-transparent border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                                            <div><h5 className="fw-bold mb-0" style={{color: COLORS.textDark}}>Flujo de Caja</h5><small style={{color: COLORS.textMuted}}>Ingresos vs Ganancia</small></div>
                                            <button className="btn btn-sm rounded-pill px-3 fw-bold text-white" style={{backgroundColor: COLORS.accentOrange, border: 'none'}} onClick={exportarExcel}><Download className="me-2"/> Exportar</button>
                                        </div>
                                        <div className="card-body px-2 pt-0">
                                            <Plot data={[{ x: financiero?.map(f => f.Mes), y: financiero?.map(f => f.Ventas), type: 'scatter', mode: 'lines', name: 'Ventas', line: {color: COLORS.accentBlue, width: 3} }, { x: financiero?.map(f => f.Mes), y: financiero?.map(f => f.Ganancia), type: 'scatter', mode: 'lines', name: 'Ganancia', line: {color: COLORS.accentOrange, width: 0}, fill: 'tozeroy', fillcolor: 'rgba(246, 173, 85, 0.2)' }]} layout={{ autosize: true, height: 320, paper_bgcolor: COLORS.cardLight, plot_bgcolor: COLORS.cardLight, font: {color: COLORS.textMuted}, margin: {l: 40, r: 10, t: 10, b: 30}, xaxis: {showgrid: true, gridcolor: 'rgba(0,0,0,0.05)'}, yaxis: {gridcolor: 'rgba(0,0,0,0.05)'}, legend: {orientation: 'h', y: 1.1, font: {color: COLORS.textDark}} }} useResizeHandler style={{width: "100%"}} />
                                        </div>
                                    </div>
                                    <div className="row g-4 mb-4">
                                        <ChartCardPremium title="Rentabilidad" subtitle="Por Categoría">
                                            <Plot data={[{ type: "treemap", labels: rentabilidad?.map(r => r.Categoria), parents: rentabilidad?.map(() => ""), values: rentabilidad?.map(r => r.GananciaNeta), textinfo: "label+value", marker: {colorscale: 'RdYlGn'} }]} layout={{ autosize: true, height: 250, paper_bgcolor: COLORS.cardLight, font: {color: COLORS.cardLight}, margin: {l:0, r:0, t:0, b:0} }} useResizeHandler style={{width: "100%"}} />
                                        </ChartCardPremium>
                                        <ChartCardPremium title="Top Clientes" subtitle="Mayores Compradores">
                                            <Plot data={[{ x: topClientes?.map(c => c.TotalComprado), y: topClientes?.map(c => c.Cliente), type: 'bar', orientation: 'h', marker: {color: COLORS.accentBlue} }]} layout={{ autosize: true, height: 250, paper_bgcolor: COLORS.cardLight, plot_bgcolor: COLORS.cardLight, font: {color: COLORS.textMuted}, margin: {l:100, r:10, t:0, b:30}, yaxis: {autorange: 'reversed', showgrid: false, tickfont: {color: COLORS.textDark}}, xaxis: {showgrid: true, gridcolor: 'rgba(0,0,0,0.05)'} }} useResizeHandler style={{width: "100%"}} />
                                        </ChartCardPremium>
                                    </div>
                                </div>
                            )}

                            {activeTab === "Rentabilidad" && (
                                <div className="card border-0 shadow-sm h-100 p-4" style={{borderRadius: '12px', backgroundColor: COLORS.cardLight}}>
                                    <h4 className="fw-bold mb-4" style={{color: COLORS.textDark}}>Análisis Detallado de Rentabilidad</h4>
                                    <div style={{height: '600px'}}>
                                        <Plot data={[{ type: "treemap", labels: rentabilidad?.map(r => r.Categoria), parents: rentabilidad?.map(() => ""), values: rentabilidad?.map(r => r.GananciaNeta), branchvalues: "total", textinfo: "label+value+percent parent", texttemplate: "<b>%{label}</b><br>$%{value:.2s}<br>%{percentParent:.1%} Total", marker: {colorscale: 'RdYlGn'} }]} layout={{ autosize: true, paper_bgcolor: COLORS.cardLight, font: {color: COLORS.cardLight}, margin: {l:0, r:0, t:0, b:0} }} useResizeHandler style={{width: "100%", height: "100%"}} />
                                    </div>
                                </div>
                            )}
                            {activeTab === "Geo-Analítica" && (
                                <div className="card border-0 shadow-sm h-100 p-4" style={{borderRadius: '12px', backgroundColor: COLORS.cardLight}}>
                                    <h4 className="fw-bold mb-4" style={{color: COLORS.textDark}}>Distribución Geográfica</h4>
                                    <div style={{height: '600px'}}>
                                        {mapaData && <Plot data={[{ type: "treemap", ids: mapaData.ids, labels: mapaData.labels, parents: mapaData.parents, values: mapaData.values, branchvalues: "total", textinfo: "label+value", marker: {colorscale: 'Blues'} }]} layout={{ autosize: true, paper_bgcolor: COLORS.cardLight, font: {color: COLORS.cardLight}, margin: {l:0, r:0, t:0, b:0} }} useResizeHandler style={{width: "100%", height: "100%"}} />}
                                    </div>
                                </div>
                            )}
                            {activeTab === "Clientes" && (
                                <div className="card border-0 shadow-sm h-100 p-4" style={{borderRadius: '12px', backgroundColor: COLORS.cardLight}}>
                                    <h4 className="fw-bold mb-4" style={{color: COLORS.textDark}}>Top Clientes B2B</h4>
                                    <div style={{height: '600px'}}>
                                        <Plot data={[{ x: topClientes?.map(c => c.TotalComprado), y: topClientes?.map(c => c.Cliente), type: 'bar', orientation: 'h', marker: {color: COLORS.accentOrange}, text: topClientes?.map(c => `$${c.TotalComprado.toLocaleString()}`), textposition: 'outside', hoverinfo: 'y+text' }]} layout={{ autosize: true, paper_bgcolor: COLORS.cardLight, plot_bgcolor: COLORS.cardLight, font: {color: COLORS.textMuted}, margin: {l:200, r:50, t:20, b:50}, yaxis: {autorange: 'reversed', tickfont: {color: COLORS.textDark}}, xaxis: {gridcolor: 'rgba(0,0,0,0.05)'} }} useResizeHandler style={{width: "100%", height: "100%"}} />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ESTILOS EXTRA PARA ANIMACIÓN DE REFRESH */}
            <style>{`
                .spin-anim { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .hover-bg-light:hover { background-color: #f8f9fa; cursor: pointer; }
                .fade-in { animation: fadeIn 0.4s ease-in-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}

// --- SUB-COMPONENTES ---
function NavButton({ text, icon, active, onClick }) {
    return <button onClick={onClick} className={`btn d-flex align-items-center px-3 py-2 fw-bold transition-all shadow-sm`} style={{ backgroundColor: active ? COLORS.cardLight : COLORS.bgLight, color: active ? COLORS.accentOrange : COLORS.textMuted, border: active ? `2px solid ${COLORS.accentOrange}` : `1px solid ${COLORS.bgLight}`, borderRadius: '8px', fontSize: '0.95rem', transform: active ? 'translateY(-2px)' : 'translateY(0)', boxShadow: active ? '0 4px 10px rgba(246, 173, 85, 0.2)' : '0 2px 4px rgba(0,0,0,0.05)' }}> <span className="me-2">{icon}</span>{text} </button>;
}
function NavIconSidebar({ icon, isDanger, active }) {
    const iconColor = isDanger ? '#FF4D4D' : (active ? COLORS.accentOrange : COLORS.textMuted);
    const borderStyle = active ? `2px solid ${COLORS.accentOrange}` : `1px solid ${COLORS.bgLight}`;
    return <button className={`btn p-3 rounded-circle d-flex align-items-center justify-content-center transition-all shadow-sm`} style={{color: iconColor, border: borderStyle, backgroundColor: COLORS.cardLight, fontSize: '1.2rem'}}> {icon} </button>;
}
function KpiCardPremium({ title, value, suffix="", icon, isMoney, accentColor }) {
    return <div className="col-12 col-sm-6 col-md-3"> <div className="card border-0 shadow-sm h-100 p-4" style={{ borderRadius: '12px', backgroundColor: COLORS.cardLight, borderBottom: `3px solid ${accentColor}` }}> <div className="d-flex justify-content-between align-items-start mb-3"> <h6 className="text-uppercase fw-bold mb-0" style={{fontSize:'0.75rem', color: COLORS.textMuted, letterSpacing: '1px'}}>{title}</h6> <div className="p-2 rounded-lg" style={{backgroundColor: `${accentColor}1A`, color: accentColor, borderRadius: '6px'}}>{icon}</div> </div> <h3 className="fw-bold mb-0" style={{color: COLORS.textDark}}>{isMoney ? '$' : ''}{value?.toLocaleString(undefined, { maximumFractionDigits: 2 })}{suffix}</h3> </div> </div>;
}
function ChartCardPremium({ title, subtitle, children }) {
    return <div className="col-lg-6"> <div className="card border-0 shadow-sm h-100" style={{borderRadius: '12px', backgroundColor: COLORS.cardLight}}> <div className="card-header bg-transparent border-0 pt-4 px-4"> <h6 className="fw-bold mb-0" style={{color: COLORS.textDark}}>{title}</h6> <small style={{color: COLORS.textMuted}}>{subtitle}</small> </div> <div className="card-body p-2">{children}</div> </div> </div>;
}

export default App;