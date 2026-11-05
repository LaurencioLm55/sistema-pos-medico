import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import SalesHistory from './pages/SalesHistory';
import Login from './pages/Login';
import api from './api/axios';

function App() {
  // Estado para saber si estamos autenticados
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Al cargar la app, revisar si hay un token guardado
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
  };

  if (loading) return null; // O un spinner de carga

  // Si NO está autenticado, mostramos SOLO el Login
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Si SÍ está autenticado, mostramos el sistema completo
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-100">
        <Sidebar onLogout={handleLogout} />

        {/* min-w-0 evita que el contenido ensanche la página; el scroll queda dentro de esta zona */}
        <div className="flex-1 min-w-0 overflow-auto">
          <Routes>
            <Route path="/" element={<POS />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/sales" element={<SalesHistory />} />
            {/* Si intentan ir a una ruta loca, volver al POS */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;