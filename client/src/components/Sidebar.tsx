import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { path: '/', name: '🏪 Punto de Venta (POS)', icon: '🛒' },
    { path: '/inventory', name: '📦 Inventario', icon: '📋' },
    { path: '/sales', name: '💰 Historial Ventas', icon: '📈' },
  ];

  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col">
      <div className="p-6 border-b border-gray-700 flex flex-col items-center justify-center">
        <img 
          src="/logo.png" 
          alt="Logo" 
          className="h-32 w-auto object-contain mb-2 " 
        />
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-700 text-sm text-gray-500 text-center">
        v1.0.0
      </div>
    </div>
  );
}