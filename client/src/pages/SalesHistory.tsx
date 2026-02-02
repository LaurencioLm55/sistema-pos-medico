import { useEffect, useState } from 'react';
import api from '../api/axios';

interface SaleDetail {
  id: number;
  quantity: number;
  price: number;
  subtotal: number;
  product: { name: string; code: string; };
}

interface Sale {
  id: number;
  total: number;
  paymentMethod: string; // <--- Nuevo campo
  createdAt: string;
  details: SaleDetail[];
}

export default function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null); // Para el modal

  useEffect(() => {
    api.get('/sales').then(res => setSales(res.data)).catch(() => {});
  }, []);

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">💰 Historial de Ventas</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Fecha</th>
              <th className="p-4">Método Pago</th>
              <th className="p-4 text-right">Total</th>
              <th className="p-4 text-center">Detalles</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} className="border-b hover:bg-gray-50">
                <td className="p-4 text-gray-600">#{sale.id}</td>
                <td className="p-4">{new Date(sale.createdAt).toLocaleString()}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    sale.paymentMethod === 'EFECTIVO' ? 'bg-green-100 text-green-700' :
                    sale.paymentMethod === 'TARJETA' ? 'bg-blue-100 text-blue-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {sale.paymentMethod || 'EFECTIVO'}
                  </span>
                </td>
                <td className="p-4 text-right font-bold text-gray-800">${Number(sale.total).toFixed(2)}</td>
                <td className="p-4 text-center">
                  <button 
                    onClick={() => setSelectedSale(sale)}
                    className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full transition"
                    title="Ver productos"
                  >
                    👁️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODAL DE DETALLES --- */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-fadeIn">
            <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">Detalle de Venta #{selectedSale.id}</h3>
              <button onClick={() => setSelectedSale(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="mb-4 text-sm text-gray-500 flex justify-between">
                <span>{new Date(selectedSale.createdAt).toLocaleString()}</span>
                <span className="font-bold text-gray-700">{selectedSale.paymentMethod}</span>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-2">Producto</th>
                    <th className="text-center py-2">Cant.</th>
                    <th className="text-right py-2">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.details.map((detail) => (
                    <tr key={detail.id} className="border-b border-gray-100">
                      <td className="py-3">
                        <div className="font-medium text-gray-800">{detail.product.name}</div>
                        <div className="text-xs text-gray-400">{detail.product.code}</div>
                      </td>
                      <td className="text-center py-3">x{detail.quantity}</td>
                      <td className="text-right py-3 font-medium">${Number(detail.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
              <span className="font-bold text-gray-600">Total Pagado:</span>
              <span className="font-bold text-2xl text-green-600">${Number(selectedSale.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}