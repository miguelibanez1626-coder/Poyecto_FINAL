import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';
import { 
    Home, LineChart, Package, Users, Settings, LogOut, 
    DollarSign, ShoppingCart, Percent, Search, Bell, Download, Globe, BarChart
} from 'lucide-react'; // Importaciones de iconos de Lucide

// URL del backend de FastAPI
const API_URL = "http://127.0.0.1:8000";

// --- COLORES CLAROS (TEMA BLANCO) ---
const COLORS = {
    bgLight: '#F4F7FC',      // Off-white/light gray main background
    cardLight: '#FFFFFF',    // Pure white cards and containers
    textDark: '#2D3748',     // Dark charcoal primary text
    textMuted: '#718096',    // Medium gray for secondary/muted text
    accentOrange: '#F6AD55', // Primary Accent (Used for sales/money indicators)
    accentBlue: '#4299E1',   // Secondary Accent (Used for charts/links)
    accentGreen: '#38A169'   // Success Accent
};

// --- CUSTOM HOOK: useDashboardData (SIN CAMBIOS) ---
function useDashboardData(rangoFecha) {
    const [data, setData] = useState({
        kpis: null,
        financiero: [],
        ultimasOrdenes: [],
        rentabilidad: [],
        geoClientes: [],
        topClientes: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const config = { params: { dias: rangoFecha } };
                // Solicitamos solo los endpoints que la UI realmente utiliza
                const [resKpis, resFin, resRent, resCli, resGeo, resOrd] = await Promise.all([
                    axios.get(`${API_URL}/kpis`, config),
                    axios.get(`${API_URL}/analisis-financiero`, config),
                    axios.get(`${API_URL}/admin/rentabilidad-categoria`, config),
                    axios.get(`${API_URL}/top-clientes`, config),
                    axios.get(`${API_URL}/admin/geo-clientes`, config), 
                    axios.get(`${API_URL}/ultimas-ordenes`, config),
                ]);

                setData({
                    kpis: resKpis.data,
                    financiero: resFin.data,
                    rentabilidad: resRent.data,
                    topClientes: resCli.data,
                    geoClientes: resGeo.data,
                    ultimasOrdenes: resOrd.data,
                });
            } catch (err) {
                console.error("Error fetching data:", err);
                setError("No se pudieron cargar los datos del servidor. Asegúrate de que el backend esté corriendo en http://127.0.0.1:8000.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [rangoFecha]);

    return { data, loading, error };
}

// --- COMPONENTE PRINCIPAL ---
function App() {
    // El filtro de fecha se mantiene, aunque no hay UI para cambiarlo en esta versión
    const [rangoFecha, setRangoFecha] = useState("ALL"); 
    const { data, loading, error } = useDashboardData(rangoFecha);
    
    // Estado de Navegación Activa
    const [activeTab, setActiveTab] = useState("Dashboard");

    // Lógica para Treemap GeoClientes (SIN CAMBIOS)
    const mapaData = useMemo(() => {
        if (!data.geoClientes || data.geoClientes.length === 0) return null;
        const paises = {};
        data.geoClientes.forEach(d => {
            // Agrupar por país
            if (!paises[d.Pais]) paises[d.Pais] = { id: d.Pais, label: d.Pais, value: 0, parent: "" };
            paises[d.Pais].value += d.TotalClientes;
        });
        
        let ids = Object.keys(paises);
        let labels = Object.keys(paises);
        let parents = Object.keys(paises).map(() => "");
        let values = Object.values(paises).map(p => p.value);
        
        // Agregar estados/ciudades como hijos de los países
        data.geoClientes.forEach(d => {
            ids.push(`${d.Pais}-${d.Estado}`);
            labels.push(d.Estado);
            parents.push(d.Pais);
            values.push(d.TotalClientes);
        });
        return { ids, labels, parents, values };
    }, [data.geoClientes]);

    // Función de exportar
    const exportarExcel = () => {
        if (!data.financiero || data.financiero.length === 0) return; // Se evita el alert()
        let csv = "Mes,Ventas,Costos,Ganancia\n" + data.financiero.map(f => `${f.Mes},${f.Ventas},${f.Costos},${f.Ganancia}`).join("\n");
        const link = document.createElement("a");
        link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
        link.download = "reporte_financiero.csv";
        link.click();
    };

    // Mensaje de Carga y Error (SIN CAMBIOS)
    if (loading) return (
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: COLORS.bgLight }}>
            <div className="spinner-border text-primary" role="status" style={{color: COLORS.accentBlue}}></div>
            <span className="ms-3" style={{color: COLORS.textMuted}}>Cargando datos...</span>
        </div>
    );

    if (error) return (
        <div className="d-flex flex-column align-items-center justify-content-center p-5" style={{ minHeight: '100vh', backgroundColor: COLORS.bgLight, color: 'red' }}>
            <h4 className="mb-3">¡Error de Conexión!</h4>
            <p className="text-center" style={{color: COLORS.textDark}}>{error}</p>
            <p className="small" style={{color: COLORS.textMuted}}>Recuerda que el backend debe estar corriendo en `http://127.0.0.1:8000`.</p>
        </div>
    );

    const { kpis, financiero, ultimasOrdenes, rentabilidad, topClientes } = data;

    return (
        <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: COLORS.bgLight, color: COLORS.textDark, fontFamily: "'Inter', sans-serif" }}>
            
            {/* --- BARRA LATERAL IZQUIERDA (Sidebar Fija - Vuelve al diseño compacto) --- */}
            <div className="d-flex flex-column align-items-center py-4 border-end" 
                 style={{ width: '80px', minHeight: '100vh', position: 'fixed', zIndex: 1000, backgroundColor: COLORS.cardLight, borderColor: 'rgba(0,0,0,0.05)' }}>
                
                {/* FOTO PERFIL */}
                <div className="mb-5 pt-2">
                    <img src="https://i.pravatar.cc/300?img=11" alt="Admin" className="rounded-circle border border-2 shadow-sm" 
                         style={{width: '50px', height: '50px', objectFit: 'cover', borderColor: COLORS.accentOrange}}/>
                </div>

                {/* BOTONES DE SISTEMA (Config y Salir) */}
                <div className="mt-auto d-flex flex-column gap-4 pb-4">
                     {/* Se usa NavIconSidebar, restaurado a la versión compacta */}
                     <NavIconSidebar icon={<Settings/>} /> 
                     <NavIconSidebar icon={<LogOut/>} isDanger/>
                </div>
            </div>

            {/* --- CONTENIDO PRINCIPAL --- */}
            <div className="p-5 flex-grow-1" style={{ marginLeft: '80px', width: 'calc(100% - 80px)' }}>
                <div style={{ maxWidth: '1600px', margin: '0 auto' }}>

                    {/* HEADER CON NAVEGACIÓN HORIZONTAL (Restaurado) */}
                    <div className="d-flex justify-content-between align-items-end mb-5 pb-3 border-bottom" style={{borderColor: 'rgba(0,0,0,0.1)'}}>
                        <div>
                            <small className="text-uppercase mb-2 d-block fw-bold" style={{color: COLORS.accentOrange, letterSpacing: '2px', fontSize: '0.7rem'}}>Panel de Control Empresarial</small>
                            
                            {/* BOTONES DE NAVEGACIÓN Y FILTRO DE FECHA (Restaurado) */}
                            <div className="d-flex gap-2">
                                <NavButton text="Dashboard" icon={<Home/>} active={activeTab === "Dashboard"} onClick={() => setActiveTab("Dashboard")} />
                                <NavButton text="Rentabilidad" icon={<BarChart/>} active={activeTab === "Rentabilidad"} onClick={() => setActiveTab("Rentabilidad")} />
                                <NavButton text="Geo-Analítica" icon={<Globe/>} active={activeTab === "Geo-Analítica"} onClick={() => setActiveTab("Geo-Analítica")} />
                                <NavButton text="Clientes" icon={<Users/>} active={activeTab === "Clientes"} onClick={() => setActiveTab("Clientes")} />
                                
                                {/* Filtro de Fechas */}
                                <div className="ms-4 d-flex align-items-center small" style={{color: COLORS.textMuted}}>
                                    <span className="me-2">Rango:</span>
                                    {["7d", "30d", "YTD", "ALL"].map(r => (
                                        <button 
                                            key={r}
                                            onClick={() => setRangoFecha(r)}
                                            className={`btn btn-sm py-1 px-2 ms-1 rounded-pill fw-semibold border-0 ${rangoFecha === r ? 'text-white' : ''}`}
                                            style={{
                                                backgroundColor: rangoFecha === r ? COLORS.accentBlue : 'transparent',
                                                color: rangoFecha === r ? COLORS.cardLight : COLORS.textMuted
                                            }}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        {/* Buscador y Notificación (Restaurado) */}
                        <div className="d-flex align-items-center gap-3">
                            <div className="input-group input-group-sm rounded-pill" style={{width: '250px', backgroundColor: COLORS.cardLight, border: `1px solid ${COLORS.bgLight}`}}>
                                 <span className="input-group-text bg-transparent border-0" style={{color: COLORS.textMuted}}><Search/></span>
                                 <input type="text" className="form-control bg-transparent border-0 shadow-none" style={{color: COLORS.textDark}} placeholder="Buscar..."/>
                            </div>
                            <div className="p-2 rounded-circle cursor-pointer position-relative shadow-sm" style={{backgroundColor: COLORS.cardLight, border: `1px solid ${COLORS.bgLight}`}}>
                                <Bell style={{color: COLORS.textMuted}}/>
                                <span className="position-absolute top-0 start-100 translate-middle p-1 rounded-circle" style={{backgroundColor: COLORS.accentOrange}}></span>
                            </div>
                        </div>
                    </div>

                    {/* --- VISTAS DINÁMICAS --- */}
                    <div className="fade-in">
                        {/* VISTA 1: DASHBOARD (RESUMEN) */}
                        {activeTab === "Dashboard" && (
                            <>
                                {/* KPIS - AHORA FORZADOS A ESTAR EN UNA FILA (row g-4) */}
                                <div className="row mb-4 g-4">
                                    <KpiCardPremium title="Ingresos Totales" value={kpis?.TotalVentas} icon={<DollarSign/>} isMoney accentColor={COLORS.accentOrange}/>
                                    <KpiCardPremium title="Pedidos Totales" value={kpis?.TotalPedidos} icon={<ShoppingCart/>} accentColor={COLORS.accentBlue}/>
                                    <KpiCardPremium title="Ticket Promedio" value={kpis?.TicketPromedio} icon={<Percent/>} isMoney accentColor={COLORS.accentGreen}/>
                                    <KpiCardPremium title="Margen Global" value={24.5} suffix="%" icon={<LineChart/>} accentColor={COLORS.textMuted}/>
                                </div>

                                {/* GRÁFICO FINANCIERO */}
                                <div className="card border-0 mb-4 shadow-sm" style={{borderRadius: '12px', backgroundColor: COLORS.cardLight}}>
                                    <div className="card-header bg-transparent border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                                        <div><h5 className="fw-bold mb-0" style={{color: COLORS.textDark}}>Flujo de Caja (2020)</h5><small style={{color: COLORS.textMuted}}>Ingresos vs. Ganancia Neta</small></div>
                                        <button className="btn btn-sm rounded-pill px-3 fw-bold d-flex align-items-center text-white" style={{backgroundColor: COLORS.accentOrange, border: 'none'}} onClick={exportarExcel}><Download className="me-2"/> Exportar</button>
                                    </div>
                                    <div className="card-body px-2 pt-0">
                                        <Plot
                                            data={[
                                                { 
                                                    x: financiero.map(f => f.Mes), 
                                                    y: financiero.map(f => f.Ventas), 
                                                    type: 'scatter', 
                                                    mode: 'lines', 
                                                    name: 'Ventas', 
                                                    line: {color: COLORS.accentBlue, width: 3} 
                                                },
                                                { 
                                                    x: financiero.map(f => f.Mes), 
                                                    y: financiero.map(f => f.Ganancia), 
                                                    type: 'scatter', 
                                                    mode: 'lines', 
                                                    name: 'Ganancia', 
                                                    line: {color: COLORS.accentOrange, width: 0}, 
                                                    fill: 'tozeroy', 
                                                    fillcolor: 'rgba(246, 173, 85, 0.2)' 
                                                }
                                            ]}
                                            layout={{ 
                                                autosize: true, 
                                                height: 320, 
                                                paper_bgcolor: COLORS.cardLight, 
                                                plot_bgcolor: COLORS.cardLight, 
                                                font: {color: COLORS.textMuted}, 
                                                margin: {l: 40, r: 10, t: 10, b: 30}, 
                                                xaxis: {showgrid: true, gridcolor: 'rgba(0,0,0,0.05)'}, 
                                                yaxis: {gridcolor: 'rgba(0,0,0,0.05)'}, 
                                                legend: {orientation: 'h', y: 1.1, font: {color: COLORS.textDark}} 
                                            }}
                                            useResizeHandler 
                                            style={{width: "100%"}}
                                        />
                                    </div>
                                </div>

                                {/* MINI GRÁFICOS RESUMEN */}
                                <div className="row g-4 mb-4">
                                    <ChartCardPremium title="Rentabilidad" subtitle="Por Categoría">
                                        <Plot
                                            data={[{ 
                                                type: "treemap", 
                                                labels: rentabilidad.map(r => r.Categoria), 
                                                parents: rentabilidad.map(() => ""), 
                                                values: rentabilidad.map(r => r.GananciaNeta), 
                                                textinfo: "label+value", 
                                                marker: {colorscale: 'RdYlGn'} 
                                            }]}
                                            layout={{ 
                                                autosize: true, 
                                                height: 250, 
                                                paper_bgcolor: COLORS.cardLight, 
                                                font: {color: COLORS.cardLight}, 
                                                margin: {l:0, r:0, t:0, b:0} 
                                            }}
                                            useResizeHandler 
                                            style={{width: "100%"}}
                                        />
                                    </ChartCardPremium>
                                    <ChartCardPremium title="Top Clientes" subtitle="Mayores Compradores">
                                        <Plot
                                            data={[{ 
                                                x: topClientes.map(c => c.TotalComprado), 
                                                y: topClientes.map(c => c.Cliente), 
                                                type: 'bar', 
                                                orientation: 'h', 
                                                marker: {color: COLORS.accentBlue} 
                                            }]}
                                            layout={{ 
                                                autosize: true, 
                                                height: 250, 
                                                paper_bgcolor: COLORS.cardLight, 
                                                plot_bgcolor: COLORS.cardLight,
                                                font: {color: COLORS.textMuted}, 
                                                margin: {l:100, r:10, t:0, b:30}, 
                                                yaxis: {autorange: 'reversed', showgrid: false, tickfont: {color: COLORS.textDark}}, 
                                                xaxis: {showgrid: true, gridcolor: 'rgba(0,0,0,0.05)'} 
                                            }}
                                            useResizeHandler 
                                            style={{width: "100%"}}
                                        />
                                    </ChartCardPremium>
                                </div>

                                {/* TABLA */}
                                <div className="card border-0 shadow-sm" style={{borderRadius: '12px', backgroundColor: COLORS.cardLight}}>
                                    <div className="card-header bg-transparent border-0 pt-4 px-4">
                                        <h5 className="fw-bold mb-0" style={{color: COLORS.textDark}}>Últimas Transacciones</h5>
                                    </div>
                                    <div className="card-body p-0">
                                        <div className="table-responsive">
                                            {/* Tabla ajustada para Light Theme */}
                                            <table className="table table-striped table-hover align-middle mb-0" style={{backgroundColor: 'transparent', '--bs-table-hover-bg': COLORS.bgLight, color: COLORS.textDark}}>
                                                <thead style={{backgroundColor: COLORS.bgLight, color: COLORS.textMuted}} className="small text-uppercase">
                                                    <tr><th className="ps-4 py-3 border-0">ID</th><th className="border-0">Cliente</th><th className="border-0">Fecha</th><th className="text-end pe-4 border-0">Total</th></tr>
                                                </thead>
                                                <tbody className="border-top-0">
                                                    {ultimasOrdenes.map((orden, index) => (
                                                        <tr key={index} style={{cursor: 'pointer'}}>
                                                            <td className="ps-4 fw-bold" style={{color: COLORS.accentBlue}}>#{orden.OrderKey}</td>
                                                            <td style={{color: COLORS.textDark}}>{orden.Cliente}</td>
                                                            <td style={{color: COLORS.textMuted}}>{orden.Fecha}</td>
                                                            <td className="text-end pe-4 fw-bold" style={{color: COLORS.accentOrange}}>${orden.Total.toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* VISTA 2: RENTABILIDAD (SIN CAMBIOS) */}
                        {activeTab === "Rentabilidad" && (
                            <div className="fade-in h-100">
                                <div className="card border-0 shadow-sm h-100 p-4" style={{borderRadius: '12px', backgroundColor: COLORS.cardLight}}>
                                    <h4 className="fw-bold mb-4" style={{color: COLORS.textDark}}>Análisis Detallado de Rentabilidad por Categoría</h4>
                                    <div style={{height: '600px'}}>
                                        <Plot
                                            data={[{ 
                                                type: "treemap", 
                                                labels: rentabilidad.map(r => r.Categoria), 
                                                parents: rentabilidad.map(() => ""), 
                                                values: rentabilidad.map(r => r.GananciaNeta), 
                                                branchvalues: "total", 
                                                textinfo: "label+value+percent parent", 
                                                texttemplate: "<b>%{label}</b><br>$%{value:.2s}<br>%{percentParent:.1%} Total", 
                                                marker: {colorscale: 'RdYlGn'} 
                                            }]}
                                            layout={{ 
                                                autosize: true, 
                                                paper_bgcolor: COLORS.cardLight, 
                                                font: {color: COLORS.cardLight}, 
                                                margin: {l:0, r:0, t:0, b:0} 
                                            }}
                                            useResizeHandler style={{width: "100%", height: "100%"}}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* VISTA 3: GEO-ANALÍTICA (SIN CAMBIOS) */}
                        {activeTab === "Geo-Analítica" && (
                            <div className="fade-in h-100">
                                <div className="card border-0 shadow-sm h-100 p-4" style={{borderRadius: '12px', backgroundColor: COLORS.cardLight}}>
                                    <h4 className="fw-bold mb-4" style={{color: COLORS.textDark}}>Distribución Geográfica de Clientes por Estado/País</h4>
                                    <div style={{height: '600px'}}>
                                        {mapaData && <Plot
                                            data={[{ 
                                                type: "treemap", 
                                                ids: mapaData.ids, 
                                                labels: mapaData.labels, 
                                                parents: mapaData.parents, 
                                                values: mapaData.values, 
                                                branchvalues: "total", 
                                                textinfo: "label+value", 
                                                marker: {colorscale: 'Blues'} 
                                            }]}
                                            layout={{ 
                                                autosize: true, 
                                                paper_bgcolor: COLORS.cardLight, 
                                                font: {color: COLORS.cardLight}, 
                                                margin: {l:0, r:0, t:0, b:0} 
                                            }}
                                            useResizeHandler style={{width: "100%", height: "100%"}}
                                        />}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* VISTA 4: CLIENTES (SIN CAMBIOS) */}
                        {activeTab === "Clientes" && (
                            <div className="fade-in h-100">
                                <div className="card border-0 shadow-sm h-100 p-4" style={{borderRadius: '12px', backgroundColor: COLORS.cardLight}}>
                                    <h4 className="fw-bold mb-4" style={{color: COLORS.textDark}}>Top Clientes B2B por Volumen de Compra</h4>
                                    <div style={{height: '600px'}}>
                                        <Plot
                                            data={[{ 
                                                x: topClientes.map(c => c.TotalComprado), 
                                                y: topClientes.map(c => c.Cliente), 
                                                type: 'bar', 
                                                orientation: 'h', 
                                                marker: {color: COLORS.accentOrange}, 
                                                text: topClientes.map(c => `$${c.TotalComprado.toLocaleString()}`), 
                                                textposition: 'outside',
                                                hoverinfo: 'y+text'
                                            }]}
                                            layout={{ 
                                                autosize: true, 
                                                paper_bgcolor: COLORS.cardLight, 
                                                plot_bgcolor: COLORS.cardLight, 
                                                font: {color: COLORS.textMuted}, 
                                                margin: {l:200, r:50, t:20, b:50}, 
                                                yaxis: {autorange: 'reversed', tickfont: {color: COLORS.textDark}}, 
                                                xaxis: {gridcolor: 'rgba(0,0,0,0.05)'} 
                                            }}
                                            useResizeHandler style={{width: "100%", height: "100%"}}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div> {/* Fin fade-in */}

                </div>
            </div>
        </div>
    );
}

// --- COMPONENTES UI (RESTAURADOS AL DISEÑO ORIGINAL) ---

// Botón de Navegación (Estilo Pestaña Horizontal)
function NavButton({ text, icon, active, onClick }) {
    return (
        <button 
            onClick={onClick}
            className={`btn d-flex align-items-center px-3 py-2 fw-bold transition-all shadow-sm`}
            style={{
                backgroundColor: active ? COLORS.cardLight : COLORS.bgLight, 
                color: active ? COLORS.accentOrange : COLORS.textMuted,
                border: active ? `2px solid ${COLORS.accentOrange}` : `1px solid ${COLORS.bgLight}`,
                borderRadius: '8px',
                fontSize: '0.95rem',
                transform: active ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: active ? '0 4px 10px rgba(246, 173, 85, 0.2)' : '0 2px 4px rgba(0,0,0,0.05)'
            }}
        >
            <span className="me-2">{icon}</span>
            {text}
        </button>
    );
}

// Icono de Sidebar (Solo para configuración/salir)
function NavIconSidebar({ icon, isDanger }) {
    const iconColor = isDanger ? '#FF4D4D' : COLORS.textMuted;
    return (
        <button 
            className={`btn p-3 rounded-circle d-flex align-items-center justify-content-center transition-all shadow-sm`}
            style={{color: iconColor, border: `1px solid ${COLORS.bgLight}`, backgroundColor: COLORS.cardLight, fontSize: '1.2rem'}}
        >
            {icon}
        </button>
    );
}

// Tarjeta de KPI (Ingresos, Pedidos, etc.) - Usa col-md-3 para 4 en una fila
function KpiCardPremium({ title, value, suffix="", icon, isMoney, accentColor }) {
    return (
        // Clase 'col-md-3' asegura que haya 4 columnas en pantallas medianas/grandes
        <div className="col-12 col-sm-6 col-md-3"> 
            <div className="card border-0 shadow-sm h-100 p-4" style={{ borderRadius: '12px', backgroundColor: COLORS.cardLight, borderBottom: `3px solid ${accentColor}` }}>
                <div className="d-flex justify-content-between align-items-start mb-3">
                    <h6 className="text-uppercase fw-bold mb-0" style={{fontSize:'0.75rem', color: COLORS.textMuted, letterSpacing: '1px'}}>{title}</h6>
                    <div className="p-2 rounded-lg" style={{backgroundColor: `${accentColor}1A`, color: accentColor, borderRadius: '6px'}}>{icon}</div>
                </div>
                <h3 className="fw-bold mb-0" style={{color: COLORS.textDark}}>{isMoney ? '$' : ''}{value?.toLocaleString(undefined, { maximumFractionDigits: 2 })}{suffix}</h3>
            </div>
        </div>
    );
}

function ChartCardPremium({ title, subtitle, children }) {
    return (
        <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100" style={{borderRadius: '12px', backgroundColor: COLORS.cardLight}}>
                <div className="card-header bg-transparent border-0 pt-4 px-4">
                    <h6 className="fw-bold mb-0" style={{color: COLORS.textDark}}>{title}</h6>
                    <small style={{color: COLORS.textMuted}}>{subtitle}</small>
                </div>
                <div className="card-body p-2">{children}</div>
            </div>
        </div>
    );
}

export default App;