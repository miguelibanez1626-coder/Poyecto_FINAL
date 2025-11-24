import React, { useState } from 'react';
import axios from 'axios';
import { User, Lock, LogIn, AlertCircle } from 'lucide-react';

// URL de tu API
const API_URL = "http://127.0.0.1:8000";

function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // FastAPI espera 'application/x-www-form-urlencoded'
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);

        try {
            const response = await axios.post(`${API_URL}/token`, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            onLoginSuccess({
                token: response.data.access_token,
                role: response.data.role,
                name: response.data.name
            });
            
            // Si funciona, guardamos el token usando la función que recibimos del App
            setToken(response.data.access_token);
            
        } catch (err) {
            console.error(err);
            setError("Credenciales incorrectas o error de servidor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: '#F4F7FC' }}>
            <div className="card border-0 shadow-lg p-4" style={{ width: '100%', maxWidth: '400px', borderRadius: '16px' }}>
                <div className="text-center mb-4">
                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex p-3 mb-3">
                        <User size={32} />
                    </div>
                    <h4 className="fw-bold text-dark">Bienvenido</h4>
                    <p className="text-muted small">Panel de Control Empresarial</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label small fw-bold text-muted">USUARIO</label>
                        <div className="input-group">
                            <span className="input-group-text bg-light border-end-0 text-muted"><User size={18}/></span>
                            <input 
                                type="text" 
                                className="form-control bg-light border-start-0 shadow-none" 
                                placeholder="Ej. admin"
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
                            <input 
                                type="password" 
                                className="form-control bg-light border-start-0 shadow-none" 
                                placeholder="••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-danger d-flex align-items-center py-2 mb-3 small" role="alert">
                            <AlertCircle size={16} className="me-2" />
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="btn btn-primary w-100 py-2 fw-bold d-flex align-items-center justify-content-center"
                        style={{ borderRadius: '8px', backgroundColor: '#4299E1', border: 'none' }}
                        disabled={loading}
                    >
                        {loading ? 'Cargando...' : <><LogIn size={18} className="me-2" /> Ingresar</>}
                    </button>
                </form>
                
                <div className="text-center mt-4">
                    <small className="text-muted">Contoso Admin System v1.0</small>
                </div>
            </div>
        </div>
    );
}

export default Login;