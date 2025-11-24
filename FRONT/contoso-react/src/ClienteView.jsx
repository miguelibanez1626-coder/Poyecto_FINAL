import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingBag, LogOut, User, Star, TrendingUp, ShoppingCart, X, Package, Clock, Calendar, ChevronRight } from 'lucide-react';

const API_URL = "http://127.0.0.1:8000";

function ClienteView({ token, user, onLogout }) {
    // Estados de Datos
    const [productos, setProductos] = useState([]);
    const [destacados, setDestacados] = useState([]);
    const [misCompras, setMisCompras] = useState([]); // <--- NUEVO ESTADO
    
    // Estados de Interfaz
    const [activeTab, setActiveTab] = useState("Tienda"); // Controla qué pantalla se ve
    const [carrito, setCarrito] = useState([]);
    const [showCart, setShowCart] = useState(false);
    const [filtro, setFiltro] = useState("Todos");
    const [loading, setLoading] = useState(true);

    // Cargar datos iniciales
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resProd, resDest] = await Promise.all([
                    axios.get(`${API_URL}/productos`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_URL}/destacados`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setProductos(resProd.data);
                setDestacados(resDest.data);
            } catch (error) {
                console.error("Error cargando tienda", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token]);

    // Función para cargar el historial (solo cuando el usuario hace click en la pestaña)
    const cargarHistorial = async () => {
        setActiveTab("MisCompras");
        try {
            const response = await axios.get(`${API_URL}/mis-compras`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMisCompras(response.data);
        } catch (error) {
            console.error("Error cargando historial", error);
        }
    };

    // Helpers
    const agregarAlCarrito = (prod) => setCarrito([...carrito, prod]);
    const totalCarrito = carrito.reduce((acc, item) => acc + (item.UnitPrice || 0), 0);
    const categorias = ["Todos", ...new Set(productos.map(p => p.Category))];
    const productosFiltrados = filtro === "Todos" ? productos : productos.filter(p => p.Category === filtro);

    return (
        <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }} className="pb-5">
            
            {/* --- NAVBAR --- */}
            <nav className="navbar sticky-top navbar-expand-lg navbar-light bg-white shadow-sm px-4 py-3">
                <div className="container-fluid">
                    <div className="d-flex align-items-center text-primary fw-bold fs-4 cursor-pointer" onClick={() => setActiveTab("Tienda")} style={{cursor: 'pointer'}}>
                        <ShoppingBag className="me-2" strokeWidth={2.5} /> Contoso<span className="text-dark">Store</span>
                    </div>
                    
                    <div className="d-flex align-items-center gap-4">
                        {/* Botones de Navegación */}
                        <div className="d-none d-md-flex gap-3 me-3">
                            <button onClick={() => setActiveTab("Tienda")} className={`btn btn-sm fw-bold rounded-pill px-3 ${activeTab === "Tienda" ? 'btn-dark' : 'btn-light text-muted'}`}>Tienda</button>
                            <button onClick={cargarHistorial} className={`btn btn-sm fw-bold rounded-pill px-3 ${activeTab === "MisCompras" ? 'btn-dark' : 'btn-light text-muted'}`}>Mis Pedidos</button>
                        </div>

                        {/* Carrito */}
                        <div className="position-relative cursor-pointer" style={{cursor: 'pointer'}} onClick={() => setShowCart(!showCart)}>
                            <ShoppingCart className="text-dark" />
                            {carrito.length > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light">{carrito.length}</span>}
                        </div>
                        
                        {/* Usuario */}
                        <div className="border-start ps-4 d-flex align-items-center gap-3">
                            <div className="d-flex align-items-center text-muted small fw-medium">
                                <User size={18} className="me-2 text-primary"/> {user.name}
                            </div>
                            <button onClick={onLogout} className="btn btn-light btn-sm text-danger fw-bold d-flex align-items-center hover-danger">
                                <LogOut size={16} className="me-1"/> Salir
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* --- CARRITO (Overlay) --- */}
            {showCart && (
                <div className="card position-fixed shadow-lg border-0" style={{top: '80px', right: '20px', width: '350px', zIndex: 1050}}>
                    <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center pt-3">
                        <h5 className="fw-bold mb-0">Tu Carrito</h5>
                        <button className="btn btn-sm btn-light rounded-circle" onClick={() => setShowCart(false)}><X size={18}/></button>
                    </div>
                    <div className="card-body" style={{maxHeight: '400px', overflowY: 'auto'}}>
                        {carrito.length === 0 ? <p className="text-center text-muted py-4">Tu carrito está vacío 😢</p> : (
                            carrito.map((item, index) => (
                                <div key={index} className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                                    <div><h6 className="mb-0 small fw-bold text-truncate" style={{maxWidth: '180px'}}>{item.ProductName}</h6><small className="text-muted">${item.UnitPrice?.toFixed(2)}</small></div>
                                    <span className="text-success fw-bold small">x1</span>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="card-footer bg-light border-0 p-3">
                        <div className="d-flex justify-content-between fw-bold mb-3"><span>Total:</span><span className="text-primary fs-5">${totalCarrito.toFixed(2)}</span></div>
                        <button className="btn btn-dark w-100 py-2 fw-bold" onClick={() => alert(`¡Gracias por tu compra de $${totalCarrito.toFixed(2)}!`)}>Pagar Ahora</button>
                    </div>
                </div>
            )}

            {/* --- CONTENIDO PRINCIPAL --- */}
            <div className="container py-5">
                
                {/* VISTA 1: TIENDA (CATÁLOGO) */}
                {activeTab === "Tienda" && (
                    <div className="fade-in">
                        {/* Trending */}
                        {!loading && destacados.length > 0 && (
                            <div className="mb-5">
                                <div className="d-flex align-items-center mb-4">
                                    <div className="p-2 bg-warning bg-opacity-25 rounded-circle me-3 text-warning"><TrendingUp size={24} /></div>
                                    <div><h3 className="fw-bold text-dark mb-0">Tendencias</h3><small className="text-muted">Lo más vendido</small></div>
                                </div>
                                <div className="row g-4">
                                    {destacados.map((prod) => (
                                        <div className="col-md-3" key={prod.ProductKey}>
                                            <div className="card h-100 border-0 shadow-sm text-white" style={{background: 'linear-gradient(135deg, #2D3748 0%, #1A202C 100%)', borderRadius: '16px'}}>
                                                <div className="card-body position-relative">
                                                    <div className="position-absolute top-0 end-0 bg-danger text-white px-3 py-1 small fw-bold" style={{borderBottomLeftRadius: '12px'}}>HOT</div>
                                                    <div className="mb-3 opacity-50"><Star fill="gold" color="gold" size={16}/> <Star fill="gold" color="gold" size={16}/> <Star fill="gold" color="gold" size={16}/> <Star fill="gold" color="gold" size={16}/></div>
                                                    <h5 className="card-title fw-bold mb-1 text-truncate">{prod.ProductName}</h5>
                                                    <p className="small opacity-75 mb-4">{prod.Brand}</p>
                                                    <div className="d-flex justify-content-between align-items-end">
                                                        <h4 className="mb-0 text-warning fw-bold">${prod.UnitPrice?.toFixed(0)}</h4>
                                                        <button onClick={() => agregarAlCarrito(prod)} className="btn btn-light btn-sm rounded-pill fw-bold px-3">Agregar</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <hr className="my-5 opacity-10"/>

                        {/* Catálogo */}
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4">
                            <h3 className="fw-bold text-dark mb-3 mb-md-0">Explora el Catálogo</h3>
                            <div className="d-flex gap-2 overflow-auto py-2" style={{maxWidth: '100%', whiteSpace: 'nowrap'}}>
                                {categorias.map(cat => (
                                    <button key={cat} onClick={() => setFiltro(cat)} className={`btn btn-sm px-3 rounded-pill fw-bold transition-all ${filtro === cat ? 'btn-primary' : 'btn-outline-secondary border-0 bg-white'}`}>{cat}</button>
                                ))}
                            </div>
                        </div>
                        
                        {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : (
                            <div className="row g-4">
                                {productosFiltrados.map((prod) => (
                                    <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={prod.ProductKey}>
                                        <div className="card h-100 border-0 shadow-sm hover-card" style={{borderRadius: '12px', transition: 'transform 0.2s'}}>
                                            <div className="card-body d-flex flex-column p-4">
                                                <div className="d-flex justify-content-between align-items-start mb-3">
                                                    <span className="badge bg-light text-primary border border-primary border-opacity-10">{prod.Category}</span>
                                                    <small className="text-muted">{prod.Brand}</small>
                                                </div>
                                                <h6 className="card-title fw-bold text-dark mb-2 line-clamp-2" style={{minHeight: '40px'}}>{prod.ProductName}</h6>
                                                <p className="text-muted small mb-4 text-truncate">{prod.Subcategory}</p>
                                                <div className="mt-auto d-flex justify-content-between align-items-center">
                                                    <div><small className="text-muted d-block" style={{fontSize: '0.7rem'}}>Precio</small><span className="fw-bold fs-5 text-dark">${prod.UnitPrice?.toFixed(2)}</span></div>
                                                    <button onClick={() => agregarAlCarrito(prod)} className="btn btn-outline-primary btn-sm rounded-circle p-2"><ShoppingCart size={18}/></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* VISTA 2: MIS COMPRAS (HISTORIAL) */}
                {activeTab === "MisCompras" && (
                    <div className="fade-in" style={{maxWidth: '800px', margin: '0 auto'}}>
                        <div className="d-flex align-items-center mb-4">
                            <div className="p-2 bg-primary bg-opacity-10 rounded-circle me-3 text-primary"><Package size={28} /></div>
                            <div><h3 className="fw-bold text-dark mb-0">Historial de Pedidos</h3><small className="text-muted">Tus compras anteriores en Contoso</small></div>
                        </div>

                        {misCompras.length === 0 ? (
                            <div className="text-center py-5 text-muted bg-white rounded shadow-sm">
                                <Package size={48} className="mb-3 opacity-25"/>
                                <p>No tienes compras registradas aún.</p>
                                <button onClick={() => setActiveTab("Tienda")} className="btn btn-primary mt-2">Ir a Comprar</button>
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-3">
                                {misCompras.map((orden) => (
                                    <div className="card border-0 shadow-sm p-3" key={orden.OrderKey} style={{borderRadius: '12px'}}>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="bg-light p-3 rounded text-muted"><ShoppingBag size={20}/></div>
                                                <div>
                                                    <h6 className="fw-bold mb-0">Pedido #{orden.OrderKey}</h6>
                                                    <div className="d-flex gap-3 small text-muted mt-1">
                                                        <span className="d-flex align-items-center"><Calendar size={12} className="me-1"/> {orden.Fecha}</span>
                                                        <span className="d-flex align-items-center"><Package size={12} className="me-1"/> {orden.CantidadItems} items</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-end">
                                                <h5 className="fw-bold text-dark mb-0">${orden.Total.toLocaleString()}</h5>
                                                <small className="text-success fw-bold d-flex align-items-center justify-content-end"><div className="bg-success rounded-circle me-1" style={{width: 8, height: 8}}></div> Completado</small>
                                            </div>
                                            <div className="d-none d-md-block border-start ps-3 ms-3">
                                                 <button className="btn btn-light btn-sm rounded-circle"><ChevronRight size={18} className="text-muted"/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>

            <style>{`
                .hover-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; }
                .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                .fade-in { animation: fadeIn 0.4s ease-in-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .cursor-pointer { cursor: pointer; }
            `}</style>
        </div>
    );
}

export default ClienteView;