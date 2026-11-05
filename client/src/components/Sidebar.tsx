import { Link, useLocation } from 'react-router-dom';

export default function Sidebar({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();

  const menuItems = [
    { path: '/', name: '🏪 Punto de Venta (POS)', icon: '🛒' },
    { path: '/inventory', name: '📦 Inventario', icon: '📋' },
    { path: '/sales', name: '💰 Historial Ventas', icon: '📈' },
  ];

  return (
    <div className="w-16 md:w-64 shrink-0 bg-gray-900 text-white h-screen flex flex-col overflow-y-auto">
      <div className="p-2 md:p-6 border-b border-gray-700 flex flex-col items-center justify-center">
        <img 
          src="/logo.png" 
          alt="Logo" 
          className="h-10 md:h-32 w-auto max-w-full object-contain mb-2"
        />
      </div>

      <nav className="flex-1 p-2 md:p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                title={item.name}
                className={`flex items-center justify-center md:justify-start gap-3 p-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium hidden md:inline">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-2 md:p-4 border-t border-gray-700 text-sm text-gray-500 text-center">
        <button
          onClick={onLogout}
          title="Cerrar Sesión"
          className="w-full bg-red-600 text-white py-2 rounded text-xs hover:bg-red-700 mb-2"
        >
          <span className="md:hidden">⏻</span>
          <span className="hidden md:inline">Cerrar Sesión</span>
        </button>
        v1.0.0
      </div>
    </div>
  );
}