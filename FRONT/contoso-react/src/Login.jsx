import React, { useState } from 'react';
import axios from 'axios';
import { User, Lock, LogIn, AlertCircle, Mail, UserPlus } from 'lucide-react';

const API_URL = "http://127.0.0.1:8000";

function Login({ onLoginSuccess }) {
    const [isRegistering, setIsRegistering] = useState(false);
    
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState(""); 
    const [password, setPassword] = useState("");
    
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);
        setLoading(true);

        try {
            if (isRegistering) {
                await axios.post(`${API_URL}/register`, {
                    firstName: firstName,
                    lastName: lastName,
                    email: username,
                    password: password
                });
                setSuccessMsg("¡Cuenta creada! Ahora inicia sesión.");
                setIsRegistering(false); 
                setPassword(""); 
            } else {
                const params = new URLSearchParams();
                params.append('username', username);
                params.append('password', password);

                const response = await axios.post(`${API_URL}/token`, params, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });
                
                onLoginSuccess({
                    token: response.data.access_token,
                    role: response.data.role,
                    name: response.data.name
                });
            }
        } catch (err) {
            console.error(err);
            if (isRegistering) {
                setError(err.response?.data?.detail || "Error al registrarse.");
            } else {
                setError("Usuario o contraseña incorrectos.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: '#F4F7FC' }}>
            <div className="card border-0 shadow-lg p-4 fade-in" style={{ width: '100%', maxWidth: '420px', borderRadius: '16px' }}>
                
                <div className="text-center mb-4">
                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex p-3 mb-3">
                        {isRegistering ? <UserPlus size={32}/> : <User size={32} />}
                    </div>
                    <h4 className="fw-bold text-dark">{isRegistering ? "Crear Cuenta" : "Bienvenido"}</h4>
                    <p className="text-muted small">{isRegistering ? "Únete a Contoso Store" : "Panel de Control & Tienda"}</p>
                </div>

                {successMsg && <div className="alert alert-success py-2 mb-3 small text-center">{successMsg}</div>}

                <form onSubmit={handleSubmit}>
                    
                    {isRegistering && (
                        <div className="row mb-3 fade-in">
                            <div className="col-6">
                                <label className="form-label small fw-bold text-muted">NOMBRE</label>
                                <input type="text" className="form-control bg-light border-0" placeholder="Ej. Ana" required value={firstName} onChange={e => setFirstName(e.target.value)}/>
                            </div>
                            <div className="col-6">
                                <label className="form-label small fw-bold text-muted">APELLIDO</label>
                                <input type="text" className="form-control bg-light border-0" placeholder="Ej. Pérez" required value={lastName} onChange={e => setLastName(e.target.value)}/>
                            </div>
                        </div>
                    )}

                    <div className="mb-3">
                        {/* ETIQUETA Y TIPO CORREGIDOS */}
                        <label className="form-label small fw-bold text-muted">{isRegistering ? "EMAIL" : "USUARIO O EMAIL"}</label>
                        <div className="input-group">
                            <span className="input-group-text bg-light border-end-0 text-muted"><Mail size={18}/></span>
                            {/* AQUI ESTÁ EL CAMBIO CLAVE: type="text" */}
                            <input 
                                type={isRegistering ? "email" : "text"} 
                                className="form-control bg-light border-start-0 shadow-none" 
                                placeholder={isRegistering ? "tu@email.com" : "admin o tu@email.com"} 
                                value={username} 
                                onChange={(e) => setUsername(e.target.value)} 
                                required 
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="form-label small fw-bold text-muted">CONTRASEÑA</label>
                        <div className="input-group">
                            <span className="input-group-text bg-light border-end-0 text-muted"><Lock size={18}/></span>
                            <input type="password" className="form-control bg-light border-start-0 shadow-none" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                    </div>

                    {error && <div className="alert alert-danger d-flex align-items-center py-2 mb-3 small" role="alert"><AlertCircle size={16} className="me-2" /> {error}</div>}

                    <button type="submit" className="btn btn-primary w-100 py-2 fw-bold d-flex align-items-center justify-content-center rounded-pill" disabled={loading}>
                        {loading ? 'Procesando...' : (isRegistering ? 'Registrarse' : 'Ingresar')}
                    </button>
                </form>
                
                <div className="text-center mt-4 pt-3 border-top">
                    <small className="text-muted d-block mb-2">{isRegistering ? "¿Ya tienes cuenta?" : "¿Eres nuevo aquí?"}</small>
                    <button onClick={() => { setIsRegistering(!isRegistering); setError(null); setSuccessMsg(null); }} className="btn btn-link text-primary fw-bold text-decoration-none p-0">
                        {isRegistering ? "Inicia Sesión" : "Regístrate Gratis"}
                    </button>
                </div>
            </div>
            <style>{`.fade-in { animation: fadeIn 0.3s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}

export default Login;