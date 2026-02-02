import { useState } from 'react';
import api from '../api/axios';

interface Props {
  onLoginSuccess: () => void; // Función para avisar a App.tsx que ya entramos
}

export default function Login({ onLoginSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      
      // Guardar el token en el navegador
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      // Configurar Axios para usar este token en el futuro
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      
      onLoginSuccess();
    } catch (err) {
      setError('Email o contraseña incorrectos');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          {/* LOGO DEL CLIENTE */}
          <img 
            src="/logo.png" 
            alt="Logo Empresa" 
            className="h-64 mx-auto mb-4 object-contain" 
          />
          
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
            <input 
              type="email" 
              required
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
            <input 
              type="password" 
              required
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
          >
            INGRESAR
          </button>
        </form>
        
        <div className="mt-4 text-center text-xs text-gray-400">
          ¿Olvidaste tu contraseña? Contacta al administrador.
        </div>
      </div>
    </div>
  );
}